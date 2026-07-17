import technicianProfileService from "../services/technicianProfile.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const createTechnicianProfile = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.createProfile(
    req.user._id,
    req.body
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Technician profile created successfully.",
      profile
    )
  );
});

export const getTechnicianProfile = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.getProfile(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Technician profile fetched successfully.",
      profile
    )
  );
});

export const updateTechnicianProfile = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.updateProfile(
    req.user._id,
    req.body
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Technician profile updated successfully.",
      profile
    )
  );
});

export const uploadTechnicianPhoto = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.uploadProfilePhoto(
    req.user._id,
    req.file
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Profile photo uploaded successfully.",
      profile
    )
  );
});

export const deleteTechnicianPhoto = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.deleteProfilePhoto(
    req.user._id
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Profile photo deleted successfully.",
      profile
    )
  );
});

export const uploadTechnicianIdentityProof = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.uploadIdentityProof(
    req.user._id,
    req.file
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Identity proof uploaded successfully.",
      profile
    )
  );
});

export const uploadTechnicianCertification = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.uploadCertificationDocument(
    req.user._id,
    req.file,
    req.body
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Certification uploaded successfully.",
      profile
    )
  );
});

export const completeTechnicianProfileSetup = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.completeProfileSetup(
    req.user._id,
    req.body
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Profile setup completed successfully.",
      profile
    )
  );
});

export const updateTechnicianSkills = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.updateSkills(
    req.user._id,
    req.body.skills
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Skills updated successfully.",
      profile
    )
  );
});

export const updateServiceCategories = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.updateServiceCategories(
    req.user._id,
    req.body.serviceCategories
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Service categories updated successfully.",
      profile
    )
  );
});

export const updateAvailabilityStatus = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.updateAvailability(
    req.user._id,
    req.body.availabilityStatus
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Availability status updated successfully.",
      profile
    )
  );
});

export const updateWorkingHours = asyncHandler(async (req, res) => {
  const workingHours = req.body.workingHours || req.body;

  const profile = await technicianProfileService.updateWorkingHours(
    req.user._id,
    workingHours
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Working hours updated successfully.",
      profile
    )
  );
});

export const replaceCertifications = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.updateCertifications(
    req.user._id,
    req.body.certifications
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Certifications updated successfully.",
      profile
    )
  );
});

export const addCertification = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.addCertification(
    req.user._id,
    req.body
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Certification added successfully.",
      profile
    )
  );
});

export const removeCertification = asyncHandler(async (req, res) => {
  const profile = await technicianProfileService.removeCertification(
    req.user._id,
    req.params.certificationId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Certification removed successfully.",
      profile
    )
  );
});
