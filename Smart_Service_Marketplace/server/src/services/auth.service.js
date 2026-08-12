import authRepository from "../repositories/auth.repository.js";
import technicianProfileRepository from "../repositories/technicianProfile.repository.js";
import customerRepository from "../repositories/customer.repository.js";
import adminRepository from "../repositories/admin.repository.js";
import Otp from "../models/Otp.js";
import PendingRegistration, {
  PENDING_REGISTRATION_TTL_MS,
} from "../models/PendingRegistration.js";

import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

import generateResetToken from "../utils/generateResetToken.js";
import tokenService from "./token.service.js";
import emailService from "./email.service.js";
import notificationService from "./notification.service.js";
import {
  queuePushNotification,
  queueSocketEmit,
} from "./notificationQueue.service.js";
import crypto from "crypto";
import fs from "fs/promises";
import cloudinary from "../config/cloudinary.js";
import ROLES, { isAdminRole } from "../constants/roles.js";
import NOTIFICATION_TYPES from "../constants/notificationType.js";
import { defaultWorkingHours } from "../models/TechnicianProfile.js";
import User from "../models/User.js";
import CustomerProfile from "../models/CustomerProfile.js";
import TechnicianProfile from "../models/TechnicianProfile.js";
import logger from "../utils/logger.js";

const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_OTP_MAX_ATTEMPTS = 5;

class AuthService {
  sessionMeta(meta = {}) {
    return {
      ipAddress: meta.ipAddress || meta.ip || "",
      userAgent: meta.userAgent || "",
    };
  }

  /**
   * Alert every admin when a technician account is created for the first time.
   * In-app + push + socket (plays notification sound on admin dashboards).
   */
  async notifyAdminsOfNewTechnician(user, { source = "signup" } = {}) {
    if (!user?._id || user.role !== ROLES.TECHNICIAN) return;

    try {
      const admins = await adminRepository.listAdmins();
      const activeAdmins = (admins || []).filter(
        (admin) => admin.isActive !== false
      );
      if (!activeAdmins.length) return;

      const techName = user.name || "A technician";
      const techEmail = user.email || "";
      const technicianId = String(user._id);
      const title = "New technician signup";
      const message = techEmail
        ? `${techName} (${techEmail}) registered and awaits approval.`
        : `${techName} registered and awaits approval.`;
      const actionUrl = `/admin/technicians/${technicianId}`;

      await Promise.all(
        activeAdmins.map(async (admin) => {
          const created = await notificationService.notify({
            userId: admin._id,
            title,
            message,
            type: NOTIFICATION_TYPES.SYSTEM,
            actionUrl,
            priority: "high",
            metadata: {
              event: "TECHNICIAN_SIGNUP",
              technicianId,
              technicianName: techName,
              technicianEmail: techEmail,
              source,
            },
          });

          await queuePushNotification({
            userId: admin._id,
            title,
            body: message,
            data: {
              type: "technician.signup",
              technicianId,
              actionUrl,
              link: actionUrl,
              deeplink: actionUrl,
            },
            dedupeKey: `admin_tech_signup_${technicianId}_${admin._id}`,
          });

          await queueSocketEmit({
            userId: admin._id,
            event: "notification:new",
            payload: {
              type: NOTIFICATION_TYPES.SYSTEM,
              title,
              message,
              actionUrl,
              technicianId,
              notificationId: created?._id ? String(created._id) : null,
            },
          });
        })
      );
    } catch (error) {
      logger.warn(
        `Failed to notify admins of new technician: ${error.message}`
      );
    }
  }

  resolveFullName(userData = {}) {
    if (userData.name?.trim()) {
      return userData.name.trim();
    }

    return `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
  }

  async uploadLocalFile(file, folder) {
    if (!file?.path) return null;

    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: "auto",
      });
      return result.secure_url;
    } finally {
      await fs.unlink(file.path).catch(() => {});
    }
  }

  async removeUnfinishedUser(user) {
    if (!user?._id || user.isVerified || isAdminRole(user.role)) {
      return false;
    }

    await Promise.all([
      CustomerProfile.deleteOne({ user: user._id }).catch(() => {}),
      TechnicianProfile.deleteOne({ user: user._id }).catch(() => {}),
      User.deleteOne({ _id: user._id }).catch(() => {}),
    ]);

    return true;
  }

  async assertEmailAvailable(email) {
    const existingUser = await authRepository.findByEmail(email);
    if (!existingUser) return;

    // Allow re-registering if the previous attempt never finished email OTP
    const removed = await this.removeUnfinishedUser(existingUser);
    if (removed) return;

    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      "User already exists with this email. Please log in."
    );
  }

  async assertPhoneAvailable(phone) {
    if (!phone) return;
    const existingPhone = await authRepository.findByPhone(phone);
    if (!existingPhone) return;

    const removed = await this.removeUnfinishedUser(existingPhone);
    if (removed) return;

    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      "User already exists with this phone number."
    );
  }

  async upsertPendingRegistration({
    email,
    password,
    name,
    phone,
    role,
    technician = null,
  }) {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await PendingRegistration.hashPassword(password);
    const expiresAt = new Date(Date.now() + PENDING_REGISTRATION_TTL_MS);

    return PendingRegistration.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          email: normalizedEmail,
          passwordHash,
          name,
          phone: phone || "",
          role,
          technician: technician || undefined,
          expiresAt,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );
  }

  async sendPendingVerificationOtp(pending) {
    const email = pending.email.toLowerCase();
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    const expiry = new Date(Date.now() + EMAIL_OTP_TTL_MS);

    await Otp.updateMany(
      { email, purpose: "verify_email", isUsed: false },
      { isUsed: true }
    );

    await Otp.create({
      email,
      purpose: "verify_email",
      codeHash: otpHash,
      expiresAt: expiry,
    });

    const result = await emailService.sendEmailVerification({
      user: { name: pending.name, email },
      otpCode,
    });

    if (!result.sent) {
      console.error("Email send error:", result.reason);

      throw new ApiError(
        HTTP_STATUS.BAD_GATEWAY,
        `Failed to send verification OTP email.\n${result.reason}`
      );
    }
   

    return {
      message: "Verification OTP sent to your email.",
      email,
      expiresInMinutes: 10,
      pending: true,
    };
  }

  async register(userData) {
    const name = this.resolveFullName(userData);
    const { email, password, phone } = userData;

    if (!name) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "First name and last name are required."
      );
    }

    await this.assertEmailAvailable(email);
    await this.assertPhoneAvailable(phone);

    const pending = await this.upsertPendingRegistration({
      email,
      password,
      name,
      phone,
      role: ROLES.CUSTOMER,
    });

    const emailVerification = await this.sendPendingVerificationOtp(pending);

    return {
      pending: true,
      email: pending.email,
      emailVerification,
    };
  }

  async registerTechnician(userData, files = {}) {
    const name = this.resolveFullName(userData);
    const {
      email,
      password,
      phone,
      profession,
      experience,
      address,
      city,
      state,
      pincode,
    } = userData;

    await this.assertEmailAvailable(email);
    await this.assertPhoneAvailable(phone);

    const profileImage = files.profileImage?.[0] || files.profilePhoto?.[0];
    const identityProof = files.identityProof?.[0];

    if (!profileImage) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Profile image is required."
      );
    }

    if (!identityProof) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Identity proof upload is required."
      );
    }

    const [profilePhotoUrl, identityProofUrl] = await Promise.all([
      this.uploadLocalFile(profileImage, "technicians/profile"),
      this.uploadLocalFile(identityProof, "technicians/identity"),
    ]);

    const pending = await this.upsertPendingRegistration({
      email,
      password,
      name,
      phone,
      role: ROLES.TECHNICIAN,
      technician: {
        profession,
        experience: Number(experience) || 0,
        address,
        city,
        state,
        pincode,
        profilePhotoUrl,
        identityProofUrl,
      },
    });

    const emailVerification = await this.sendPendingVerificationOtp(pending);

    return {
      pending: true,
      email: pending.email,
      emailVerification,
    };
  }

  async completePendingRegistration(pending, meta = {}) {
    const email = pending.email.toLowerCase();
    const existing = await authRepository.findByEmail(email);
    if (existing) {
      await PendingRegistration.deleteOne({ _id: pending._id }).catch(() => {});
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "User already exists with this email. Please log in."
      );
    }

    const user = new User({
      name: pending.name,
      email,
      phone: pending.phone || "",
      role: pending.role,
      password: pending.passwordHash,
      isVerified: true,
      profileCompleted: false,
      ...(pending.role === ROLES.TECHNICIAN
        ? {
            city: pending.technician?.city || "",
            skills: pending.technician?.profession
              ? [pending.technician.profession]
              : [],
            availability: false,
            avatar: pending.technician?.profilePhotoUrl || null,
          }
        : {}),
    });
    user.$locals.passwordAlreadyHashed = true;
    await user.save();

    try {
      if (pending.role === ROLES.CUSTOMER) {
        await customerRepository.createProfile({
          user: user._id,
          fullName: pending.name,
          phone: pending.phone || "",
          profileCompleted: false,
        });
      } else {
        const tech = pending.technician || {};
        await technicianProfileRepository.create({
          user: user._id,
          fullName: pending.name,
          phone: pending.phone,
          profession: tech.profession,
          workingCity: tech.city,
          address: tech.address,
          state: tech.state,
          pincode: tech.pincode,
          skills: tech.profession ? [tech.profession] : [],
          serviceCategories: tech.profession ? [tech.profession] : [],
          experienceYears: Number(tech.experience) || 0,
          profilePhoto: tech.profilePhotoUrl,
          identityProofUrl: tech.identityProofUrl,
          availabilityStatus: false,
          workingHours: defaultWorkingHours(),
          profileCompleted: false,
          applicationStatus: "pending",
        });
      }
    } catch (error) {
      await User.findByIdAndDelete(user._id).catch(() => {});
      throw error;
    }

    await PendingRegistration.deleteOne({ _id: pending._id }).catch(() => {});

    emailService.sendWelcome({ user }).catch(() => {});

    if (pending.role === ROLES.TECHNICIAN) {
      this.notifyAdminsOfNewTechnician(user, { source: "email" }).catch(
        () => {}
      );
    }

    const tokens = await tokenService.issueTokenPair(
      user,
      this.sessionMeta(meta)
    );

    return {
      message: "Email verified successfully. Your account is ready.",
      user,
      ...tokens,
    };
  }

  async login(email, password, meta = {}) {
    const user = await authRepository.findByEmail(email);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid email or password."
      );
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
      if (user.authProvider === "google" && !user.password) {
        throw new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          "This account uses Google sign-in. Please continue with Google."
        );
      }
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid email or password."
      );
    }

    if (!user.isActive) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Your account has been deactivated."
      );
    }

    if (isAdminRole(user.role)) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Admin accounts must sign in through the admin portal."
      );
    }

    user.lastLogin = new Date();
    await user.save();

    const tokens = await tokenService.issueTokenPair(
      user,
      this.sessionMeta(meta)
    );

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Google Sign-In via Firebase ID token (customer or technician).
   * - Existing users: log in as their stored role (admins blocked).
   * - New users: create account for `role` (`customer` | `technician`).
   * Technicians created via Google finish documents in profile setup.
   */
  async loginWithGoogle(idToken, meta = {}, options = {}) {
    const requestedRoleRaw = String(options.role || "customer")
      .trim()
      .toLowerCase();
    const requestedRole =
      requestedRoleRaw === ROLES.TECHNICIAN
        ? ROLES.TECHNICIAN
        : ROLES.CUSTOMER;

    let decoded;
    try {
      const { verifyFirebaseIdToken } = await import("../config/firebase.js");
      decoded = await verifyFirebaseIdToken(idToken);
    } catch (error) {
      if (error.code === "FIREBASE_NOT_CONFIGURED") {
        throw new ApiError(
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          "Google sign-in is not configured on the server."
        );
      }
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid or expired Google sign-in token."
      );
    }

    const firebaseUid = decoded.uid;
    const email = String(decoded.email || "")
      .trim()
      .toLowerCase();
    const emailVerified = Boolean(decoded.email_verified);
    const name =
      String(decoded.name || "").trim() ||
      (email ? email.split("@")[0] : "User");
    const picture = decoded.picture || null;
    const googleId =
      decoded.firebase?.identities?.["google.com"]?.[0] ||
      decoded.sub ||
      firebaseUid;

    if (!email) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Google account must have an email address."
      );
    }

    if (!emailVerified) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Please verify your Google email before signing in."
      );
    }

    let user =
      (await authRepository.findByFirebaseUid(firebaseUid)) ||
      (await authRepository.findByGoogleId(googleId));

    if (!user) {
      user = await authRepository.findByEmail(email);
    }

    let isNewUser = false;

    if (user) {
      if (!user.isActive) {
        throw new ApiError(
          HTTP_STATUS.FORBIDDEN,
          "Your account has been deactivated."
        );
      }

      if (isAdminRole(user.role)) {
        throw new ApiError(
          HTTP_STATUS.FORBIDDEN,
          "Admin accounts must sign in through the admin portal."
        );
      }

      // Register intent with a conflicting role
      if (
        options.requireRoleMatch &&
        user.role !== requestedRole
      ) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          user.role === ROLES.TECHNICIAN
            ? "This Google email is already registered as a technician. Sign in instead."
            : "This Google email is already registered as a customer. Sign in instead."
        );
      }

      user.firebaseUid = user.firebaseUid || firebaseUid;
      user.googleId = user.googleId || googleId;
      if (!user.authProvider) {
        user.authProvider = user.password ? "local" : "google";
      }
      user.isVerified = true;
      if (picture && !user.avatar) {
        user.avatar = picture;
      }
      user.lastLogin = new Date();
      await user.save();
    } else {
      isNewUser = true;
      user = await authRepository.createUser({
        name,
        email,
        role: requestedRole,
        authProvider: "google",
        firebaseUid,
        googleId,
        avatar: picture,
        isVerified: true,
        profileCompleted: false,
        availability: requestedRole === ROLES.TECHNICIAN ? false : undefined,
        lastLogin: new Date(),
      });

      try {
        if (requestedRole === ROLES.CUSTOMER) {
          await customerRepository.createProfile({
            user: user._id,
            fullName: name,
            avatar: picture,
            profileCompleted: false,
          });
        } else {
          await technicianProfileRepository.create({
            user: user._id,
            fullName: name,
            profilePhoto: picture,
            workingCity: "Pending",
            skills: [],
            serviceCategories: [],
            experienceYears: 0,
            availabilityStatus: false,
            workingHours: defaultWorkingHours(),
            profileCompleted: false,
            applicationStatus: "pending",
          });
        }
      } catch (error) {
        await User.findByIdAndDelete(user._id).catch(() => {});
        throw error;
      }

      emailService.sendWelcome({ user }).catch(() => {});

      if (requestedRole === ROLES.TECHNICIAN) {
        this.notifyAdminsOfNewTechnician(user, { source: "google" }).catch(
          () => {}
        );
      }
    }

    // Backfill missing role profile for older accounts
    if (user.role === ROLES.CUSTOMER) {
      const profile = await CustomerProfile.findOne({ user: user._id });
      if (!profile) {
        await customerRepository.createProfile({
          user: user._id,
          fullName: user.name || name,
          avatar: user.avatar || picture,
          profileCompleted: false,
        });
      }
    } else if (user.role === ROLES.TECHNICIAN) {
      const techProfile = await TechnicianProfile.findOne({ user: user._id });
      if (!techProfile) {
        await technicianProfileRepository.create({
          user: user._id,
          fullName: user.name || name,
          profilePhoto: user.avatar || picture,
          workingCity: "Pending",
          skills: [],
          serviceCategories: [],
          experienceYears: 0,
          availabilityStatus: false,
          workingHours: defaultWorkingHours(),
          profileCompleted: false,
          applicationStatus: "pending",
        });
      }
    }

    const tokens = await tokenService.issueTokenPair(
      user,
      this.sessionMeta(meta)
    );

    return {
      user,
      ...tokens,
      isNewUser,
    };
  }

  async refresh(refreshTokenPlain, meta = {}) {
    return await tokenService.rotateRefreshToken(
      refreshTokenPlain,
      this.sessionMeta(meta)
    );
  }

  async forgotPassword(email) {
    const user = await authRepository.findByEmail(email);

    if (!user) {
      // Avoid account enumeration
      return {
        message: "If an account exists, a password reset email has been sent.",
      };
    }

    const { resetToken, hashedToken } = generateResetToken();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await authRepository.saveResetToken(user._id, hashedToken, expiry);

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");

    await Otp.updateMany(
      {
        email: user.email.toLowerCase(),
        purpose: "password_reset",
        isUsed: false,
      },
      { isUsed: true }
    );

    await Otp.create({
      email: user.email.toLowerCase(),
      user: user._id,
      purpose: "password_reset",
      codeHash: otpHash,
      expiresAt: expiry,
    });

    const resetURL = isAdminRole(user.role)
      ? `${process.env.CLIENT_URL}/reset-password/${resetToken}?from=admin`
      : `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const result = await emailService.sendPasswordReset({
      user,
      resetURL,
      otpCode,
    });

    if (!result.sent) {
      if (result.reason === "not_configured") {
        throw new ApiError(
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          "Email is not configured. Set EMAIL_USER, EMAIL_PASS (Gmail App Password), and EMAIL_FROM."
        );
      }
      throw new ApiError(
        HTTP_STATUS.BAD_GATEWAY,
        "Failed to send password reset email."
      );
    }

    return {
      message: "If an account exists, a password reset email has been sent.",
      delivery: "email",
      expiresInMinutes: 15,
    };
  }

  async verifyForgotPasswordOtp(email, code) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const otpCode = String(code || "").trim();

    if (!normalizedEmail || !otpCode) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Email and OTP code are required."
      );
    }

    const user = await authRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid or expired OTP.");
    }

    const otpDoc = await Otp.findOne({
      email: normalizedEmail,
      purpose: "password_reset",
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "OTP not found or already used.");
    }

    if (otpDoc.expiresAt.getTime() < Date.now()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "OTP has expired.");
    }

    if (otpDoc.attempts >= 5) {
      otpDoc.isUsed = true;
      await otpDoc.save();
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Too many invalid attempts. Request a new OTP."
      );
    }

    const codeHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    if (otpDoc.codeHash !== codeHash) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid OTP code.");
    }

    otpDoc.isUsed = true;
    otpDoc.verifiedAt = new Date();
    await otpDoc.save();

    const { resetToken, hashedToken } = generateResetToken();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    await authRepository.saveResetToken(user._id, hashedToken, expiry);

    return {
      resetToken,
      email: normalizedEmail,
      expiresInMinutes: 15,
      message: "OTP verified. You can now reset your password.",
    };
  }

  async getCurrentUser(userId) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    return user;
  }

  async logout(refreshTokenPlain) {
    await tokenService.revokeRefreshToken(refreshTokenPlain);

    return {
      message: "Logout successful.",
    };
  }

  async logoutAll(userId) {
    await tokenService.revokeAllRefreshTokens(userId);
    await authRepository.incrementTokenVersion(userId);

    return {
      message: "Logged out from all devices successfully.",
    };
  }

  async resetPassword(token, newPassword) {
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await authRepository.findByResetToken(hashedToken);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid or expired reset token."
      );
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();
    await tokenService.revokeAllRefreshTokens(user._id);

    const tokens = await tokenService.issueTokenPair(user);

    return {
      user,
      ...tokens,
    };
  }

  async sendVerificationEmail(userId) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    if (user.isVerified) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Email already verified."
      );
    }

    // Legacy unverified users (pre-pending flow) — keep resend working
    return this.sendPendingVerificationOtp({
      email: user.email,
      name: user.name,
    });
  }

  async resendVerificationByEmail(email) {
    const normalized = String(email || "").trim().toLowerCase();
    const user = await authRepository.findByEmail(normalized);

    if (user?.isVerified) {
      return {
        message: "Email is already verified. You can sign in.",
        alreadyVerified: true,
      };
    }

    if (user && !user.isVerified) {
      return this.sendVerificationEmail(user._id);
    }

    const pending = await PendingRegistration.findOne({ email: normalized });
    if (!pending) {
      return {
        message:
          "If a signup is in progress for this email, a verification OTP has been sent.",
      };
    }

    return this.sendPendingVerificationOtp(pending);
  }

  async consumeEmailOtp(normalizedEmail, normalizedCode) {
    const otpDoc = await Otp.findOne({
      email: normalizedEmail,
      purpose: "verify_email",
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "OTP not found or already used. Request a new code."
      );
    }

    if (otpDoc.expiresAt.getTime() < Date.now()) {
      otpDoc.isUsed = true;
      await otpDoc.save();
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "OTP has expired. Request a new code."
      );
    }

    if (otpDoc.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
      otpDoc.isUsed = true;
      await otpDoc.save();
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Too many invalid attempts. Request a new OTP."
      );
    }

    const codeHash = crypto
      .createHash("sha256")
      .update(normalizedCode)
      .digest("hex");

    if (otpDoc.codeHash !== codeHash) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid OTP code.");
    }

    otpDoc.isUsed = true;
    otpDoc.verifiedAt = new Date();
    await otpDoc.save();
    return otpDoc;
  }

  async verifyEmailOtp(email, code, meta = {}) {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const normalizedCode = String(code || "").trim();

    if (!normalizedEmail || !normalizedCode) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Email and OTP code are required."
      );
    }

    const user = await authRepository.findByEmail(normalizedEmail);

    if (user?.isVerified) {
      return {
        message: "Email is already verified.",
        alreadyVerified: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: true,
          profileCompleted: user.profileCompleted,
        },
      };
    }

    await this.consumeEmailOtp(normalizedEmail, normalizedCode);

    const pending = await PendingRegistration.findOne({
      email: normalizedEmail,
    }).select("+passwordHash");

    if (pending) {
      return this.completePendingRegistration(pending, meta);
    }

    // Legacy path: user exists but was never verified
    if (user) {
      user.isVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      const tokens = await tokenService.issueTokenPair(
        user,
        this.sessionMeta(meta)
      );

      return {
        message: "Email verified successfully.",
        user,
        ...tokens,
      };
    }

    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "No pending registration found for this email. Please register again."
    );
  }

  /**
   * Persist FCM/device token for push notifications (e.g. assignment alerts).
   */
  async updateDeviceToken(userId, deviceToken) {
    const token = String(deviceToken || "").trim();
    if (!token) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "deviceToken is required.");
    }

    const user = await authRepository.findById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const tokens = Array.isArray(user.deviceTokens)
      ? user.deviceTokens.filter(Boolean)
      : [];
    if (!tokens.includes(token)) {
      tokens.push(token);
    }

    await authRepository.updateUser(userId, {
      deviceToken: token,
      deviceTokens: tokens.slice(-10),
    });

    return { deviceToken: token, registered: true };
  }
}


export default new AuthService();
