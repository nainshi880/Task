import adminSettingsService from "../services/adminSettings.service.js";
import platformSettingsService from "../services/platformSettings.service.js";
import serviceCategoryRepository from "../repositories/serviceCategory.repository.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

function actorContext(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

export const getAdminSettings = asyncHandler(async (req, res) => {
  const result = await adminSettingsService.getAllSettings();

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Platform settings fetched.", result)
  );
});

export const updateAdminSettings = asyncHandler(async (req, res) => {
  const settings = await adminSettingsService.updateSettings(
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Platform settings updated.", { settings })
  );
});

export const updateAdminMaintenance = asyncHandler(async (req, res) => {
  const result = await adminSettingsService.updateMaintenance(
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, result)
  );
});

export const updateAdminTerms = asyncHandler(async (req, res) => {
  const termsOfService = await adminSettingsService.updateTerms(
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Terms of service updated.", {
      termsOfService,
    })
  );
});

export const updateAdminPrivacy = asyncHandler(async (req, res) => {
  const privacyPolicy = await adminSettingsService.updatePrivacy(
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Privacy policy updated.", {
      privacyPolicy,
    })
  );
});

export const listAdminCategories = asyncHandler(async (req, res) => {
  const result = await adminSettingsService.listCategories(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Service categories fetched.", {
      categories: result.items || result,
      pagination: result.pagination,
    })
  );
});

export const createAdminCategory = asyncHandler(async (req, res) => {
  const category = await adminSettingsService.createCategory(
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, "Service category created.", {
      category,
    })
  );
});

export const updateAdminCategory = asyncHandler(async (req, res) => {
  const category = await adminSettingsService.updateCategory(
    req.params.categoryId,
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Service category updated.", { category })
  );
});

export const deleteAdminCategory = asyncHandler(async (req, res) => {
  const category = await adminSettingsService.deleteCategory(
    req.params.categoryId,
    req.user._id,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Service category deactivated.", {
      category,
    })
  );
});

export const getPublicSettings = asyncHandler(async (req, res) => {
  const [publicSettings, categoryResult] = await Promise.all([
    platformSettingsService.getPublicSettings(),
    serviceCategoryRepository.list({ includeInactive: false }),
  ]);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Public settings fetched.", {
      ...publicSettings,
      categories: categoryResult.items,
    })
  );
});

export const getPublicTerms = asyncHandler(async (req, res) => {
  const settings = await platformSettingsService.getSettings();

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Terms of service fetched.", {
      termsOfService: settings.legal?.termsOfService || {},
    })
  );
});

export const getPublicPrivacy = asyncHandler(async (req, res) => {
  const settings = await platformSettingsService.getSettings();

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Privacy policy fetched.", {
      privacyPolicy: settings.legal?.privacyPolicy || {},
    })
  );
});
