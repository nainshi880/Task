import logger from "../utils/logger.js";
import adminRepository from "../repositories/admin.repository.js";
import ROLES from "../constants/roles.js";

/**
 * Idempotent bootstrap: ensures exactly one Super Admin exists.
 * Credentials come from SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD env vars.
 */
export async function seedSuperAdmin() {
  const email = (
    process.env.SUPER_ADMIN_EMAIL || "superadmin@smartservice.local"
  )
    .toLowerCase()
    .trim();
  const password =
    process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123456";
  const name = (process.env.SUPER_ADMIN_NAME || "Super Admin").trim();

  const existingSuper = await adminRepository.findSuperAdmin();

  if (existingSuper) {
    logger.info(`Super Admin already present (${existingSuper.email}).`);
    return existingSuper;
  }

  const emailTaken = await adminRepository.findByEmailAnyRole(email);

  if (emailTaken) {
    if (emailTaken.role === ROLES.ADMIN) {
      emailTaken.role = ROLES.SUPER_ADMIN;
      emailTaken.isVerified = true;
      emailTaken.profileCompleted = true;
      emailTaken.isActive = true;
      await emailTaken.save();

      let profile = await adminRepository.findProfileByUserId(emailTaken._id);
      if (!profile) {
        await adminRepository.createProfile({
          user: emailTaken._id,
          fullName: emailTaken.name || name,
          phone: emailTaken.phone || "",
          designation: "Super Administrator",
        });
      }

      logger.info(`Promoted existing admin to Super Admin (${email}).`);
      return emailTaken;
    }

    logger.warn(
      `SUPER_ADMIN_EMAIL (${email}) is already used by a non-admin account. Skipping seed.`
    );
    return null;
  }

  const user = await adminRepository.createAdminUser({
    name,
    email,
    password,
    phone: process.env.SUPER_ADMIN_PHONE || "",
    role: ROLES.SUPER_ADMIN,
    isVerified: true,
    profileCompleted: true,
    isActive: true,
  });

  await adminRepository.createProfile({
    user: user._id,
    fullName: name,
    phone: process.env.SUPER_ADMIN_PHONE || "",
    designation: "Super Administrator",
  });

  logger.info(`Seeded Super Admin account (${email}).`);

  if (!process.env.SUPER_ADMIN_PASSWORD) {
    logger.warn(
      "Using default SUPER_ADMIN_PASSWORD. Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env for production."
    );
  }

  return user;
}

export default seedSuperAdmin;
