import platformSettingsService from "../services/platformSettings.service.js";
import HTTP_STATUS from "../constants/httpStatus.js";

const BYPASS_PREFIXES = [
  "/api/v1/health",
  "/api/v1/auth",
  "/api/v1/admin",
  "/api/v1/settings",
  "/api/docs",
];

function shouldBypass(path) {
  return BYPASS_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export default async function maintenanceMiddleware(req, res, next) {
  try {
    if (shouldBypass(req.path)) {
      return next();
    }

    const role = req.user?.role || null;
    const blocking = await platformSettingsService.isMaintenanceBlocking(role);

    if (!blocking) {
      return next();
    }

    const settings = await platformSettingsService.getSettings();

    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      message:
        settings.maintenance?.message ||
        "The platform is under maintenance. Please try again later.",
      maintenance: true,
    });
  } catch {
    return next();
  }
}
