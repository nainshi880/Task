import adminTechnicianService from "../services/adminTechnician.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

function actorContext(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

export const listAdminTechnicians = asyncHandler(async (req, res) => {
  const result = await adminTechnicianService.listTechnicians(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Technicians fetched successfully.", result)
  );
});

export const listPendingApplications = asyncHandler(async (req, res) => {
  const result = await adminTechnicianService.listPendingApplications(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Pending technician applications fetched.",
      result
    )
  );
});

export const getAdminTechnicianDetails = asyncHandler(async (req, res) => {
  const result = await adminTechnicianService.getTechnicianDetails(
    req.params.technicianId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Technician details fetched.", result)
  );
});

export const verifyTechnician = asyncHandler(async (req, res) => {
  const result = await adminTechnicianService.verifyTechnician(
    req.params.technicianId,
    req.user._id,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, {
      user: result.user,
      profile: result.profile,
    })
  );
});

export const approveTechnicianApplication = asyncHandler(async (req, res) => {
  const result = await adminTechnicianService.approveApplication(
    req.params.technicianId,
    req.user._id,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, {
      user: result.user,
      profile: result.profile,
    })
  );
});

export const rejectTechnicianApplication = asyncHandler(async (req, res) => {
  const result = await adminTechnicianService.rejectApplication(
    req.params.technicianId,
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, {
      user: result.user,
      profile: result.profile,
    })
  );
});

export const suspendTechnician = asyncHandler(async (req, res) => {
  const result = await adminTechnicianService.suspendTechnician(
    req.params.technicianId,
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, {
      user: result.user,
      profile: result.profile,
    })
  );
});

export const unsuspendTechnician = asyncHandler(async (req, res) => {
  const result = await adminTechnicianService.unsuspendTechnician(
    req.params.technicianId,
    req.user._id,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, {
      user: result.user,
      profile: result.profile,
    })
  );
});

export const updateTechnicianAvailability = asyncHandler(async (req, res) => {
  const result = await adminTechnicianService.updateAvailability(
    req.params.technicianId,
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, {
      profile: result.profile,
    })
  );
});

export const getTechnicianRatings = asyncHandler(async (req, res) => {
  const result = await adminTechnicianService.getRatings(
    req.params.technicianId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Technician ratings fetched.", result)
  );
});

export const assignTechnicianCategories = asyncHandler(async (req, res) => {
  const result = await adminTechnicianService.assignCategories(
    req.params.technicianId,
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, {
      profile: result.profile,
    })
  );
});
