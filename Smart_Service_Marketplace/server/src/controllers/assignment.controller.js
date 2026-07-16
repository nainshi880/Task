import assignmentService from "../services/assignment.service.js";
import technicianRepository from "../repositories/technician.repository.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

// ======================================
// Auto Assignment
// ======================================

export const autoAssignTechnician = asyncHandler(async (req, res) => {
  const result = await assignmentService.autoAssign(
    req.params.bookingId,
    req.user._id
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Technician auto-assigned successfully.",
      result
    )
  );
});

// ======================================
// Manual Assignment (Admin)
// ======================================

export const manualAssignTechnician = asyncHandler(async (req, res) => {
  const result = await assignmentService.manualAssign(
    req.params.bookingId,
    req.body.technicianId,
    req.user._id,
    req.body.reason
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Technician assigned successfully.",
      result
    )
  );
});

// ======================================
// Preview Auto Assignment Ranking
// ======================================

export const previewAutoAssignment = asyncHandler(async (req, res) => {
  const result = await assignmentService.previewAutoAssignment(
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Assignment candidates ranked successfully.",
      result
    )
  );
});

// ======================================
// Assignment History
// ======================================

export const getAssignmentHistory = asyncHandler(async (req, res) => {
  const result = await assignmentService.getAssignmentHistory(
    req.params.bookingId,
    {
      userId: req.user._id,
      role: req.user.role,
    }
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Assignment history fetched successfully.",
      result
    )
  );
});

// ======================================
// Available Technicians
// ======================================

export const getAvailableTechnicians = asyncHandler(async (req, res) => {
  const technicians = await assignmentService.getAvailableTechnicians(
    req.query
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Available technicians fetched successfully.",
      technicians
    )
  );
});

// ======================================
// Technician: Update Availability
// ======================================

export const updateMyAvailability = asyncHandler(async (req, res) => {
  const technician = await technicianRepository.updateAvailability(
    req.user._id,
    req.body.availability
  );

  if (!technician) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Technician profile not found.");
  }

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Availability updated successfully.",
      technician
    )
  );
});

// ======================================
// Technician: Update Skills
// ======================================

export const updateMySkills = asyncHandler(async (req, res) => {
  const technician = await technicianRepository.updateSkills(
    req.user._id,
    req.body.skills
  );

  if (!technician) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Technician profile not found.");
  }

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Skills updated successfully.",
      technician
    )
  );
});

// ======================================
// Technician: My Workload
// ======================================

export const getMyWorkload = asyncHandler(async (req, res) => {
  const technician = await technicianRepository.findById(req.user._id);

  if (!technician) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Technician profile not found.");
  }

  const currentWorkload = await technicianRepository.getWorkload(
    req.user._id
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Workload fetched successfully.", {
      technician: {
        _id: technician._id,
        name: technician.name,
        city: technician.city,
        availability: technician.availability,
        rating: technician.rating,
        skills: technician.skills,
        maxWorkload: technician.maxWorkload,
      },
      currentWorkload,
      remainingCapacity: Math.max(
        (technician.maxWorkload || 5) - currentWorkload,
        0
      ),
    })
  );
});
