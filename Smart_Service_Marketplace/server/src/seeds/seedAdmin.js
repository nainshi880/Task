import logger from "../utils/logger.js";
import adminRepository from "../repositories/admin.repository.js";
import ROLES from "../constants/roles.js";
import bcrypt from "bcrypt";
import User from "../models/User.js";

/**
 * Idempotent bootstrap: ensures a regular Admin exists for ADMIN_EMAIL.
 * Skipped when ADMIN_SEED=false. Does not promote Super Admin accounts.
 */
export async function seedAdmin() {
  if (String(process.env.ADMIN_SEED || "true").toLowerCase() === "false") {
    return null;
  }

  const email = (process.env.ADMIN_EMAIL || "admin@smartservice.local")
    .toLowerCase()
    .trim();
  const password = String(process.env.ADMIN_PASSWORD || "Admin@123456").trim();
  const name = (process.env.ADMIN_NAME || "Platform Admin").trim();
  const phone = process.env.ADMIN_PHONE || "";

  // Never overwrite the Super Admin email with a regular admin seed
  const superEmail = (
    process.env.SUPER_ADMIN_EMAIL || "superadmin@smartservice.local"
  )
    .toLowerCase()
    .trim();
  if (email === superEmail) {
    logger.warn(
      "ADMIN_EMAIL matches SUPER_ADMIN_EMAIL — skipping regular admin seed."
    );
    return null;
  }

  const emailTaken = await adminRepository.findByEmailAnyRole(email);

  if (emailTaken && emailTaken.role === ROLES.SUPER_ADMIN) {
    logger.warn(
      `ADMIN_EMAIL (${email}) belongs to Super Admin. Skipping regular admin seed.`
    );
    return null;
  }

  if (emailTaken && emailTaken.role === ROLES.ADMIN) {
    const user = await User.findById(emailTaken._id).select("+password");
    if (user) {
      const matches = await user.comparePassword(password);
      const hashed = matches ? null : await bcrypt.hash(password, 10);

      await User.findByIdAndUpdate(user._id, {
        role: ROLES.ADMIN,
        isVerified: true,
        profileCompleted: true,
        isActive: true,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        ...(hashed
          ? {
              password: hashed,
              lastPasswordChangedAt: new Date(),
              $inc: { tokenVersion: 1 },
            }
          : {}),
      });

      if (hashed) {
        logger.info(`Synced Admin password from .env (${email}).`);
      }

      let profile = await adminRepository.findProfileByUserId(user._id);
      if (!profile) {
        await adminRepository.createProfile({
          user: user._id,
          fullName: user.name || name,
          phone: user.phone || phone,
          designation: "Administrator",
        });
      }

      logger.info(`Admin ready (${email}).`);
      return await User.findById(user._id);
    }
  }

  if (emailTaken) {
    logger.warn(
      `ADMIN_EMAIL (${email}) is already used by role=${emailTaken.role}. Skipping seed.`
    );
    return null;
  }

  const user = await adminRepository.createAdminUser({
    name,
    email,
    password,
    phone,
    role: ROLES.ADMIN,
    isVerified: true,
    profileCompleted: true,
    isActive: true,
  });

  await adminRepository.createProfile({
    user: user._id,
    fullName: name,
    phone,
    designation: "Administrator",
  });

  logger.info(`Seeded Admin account (${email}).`);

  if (!process.env.ADMIN_PASSWORD) {
    logger.warn(
      "Using default ADMIN_PASSWORD. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env for production."
    );
  }

  return user;
}

export default seedAdmin;
