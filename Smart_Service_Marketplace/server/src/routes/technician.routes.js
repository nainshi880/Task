import express from "express";

import {
  updateMyAvailability,
  updateMySkills,
  getMyWorkload,
  getAvailableTechnicians,
} from "../controllers/assignment.controller.js";

import {
  createTechnicianProfile,
  getTechnicianProfile,
  updateTechnicianProfile,
  uploadTechnicianPhoto,
  deleteTechnicianPhoto,
  uploadTechnicianIdentityProof,
  uploadTechnicianCertification,
  completeTechnicianProfileSetup,
  updateTechnicianSkills,
  updateServiceCategories,
  updateAvailabilityStatus,
  updateWorkingHours,
  replaceCertifications,
  addCertification,
  removeCertification,
} from "../controllers/technicianProfile.controller.js";

import {
  getAssignedJobById,
  acceptJob,
  rejectJob,
  startWork,
  pauseWork,
  resumeWork,
  uploadCompletionImages,
  completeWork,
  addWorkNotes,
} from "../controllers/bookingWorkflow.controller.js";

import { getTechnicianDashboard } from "../controllers/technicianDashboard.controller.js";

import {
  listTechnicianJobs,
  searchTechnicianJobs,
  filterTechnicianJobs,
  getTechnicianActivity,
  getTechnicianAuditLogs,
  getTechnicianPerformanceReport,
} from "../controllers/technicianJobs.controller.js";

import {
  getAvailabilitySettings,
  setOnlineStatus,
  setVacationMode,
  updateServiceAreas,
  getEarningsSummary,
  getMonthlyEarnings,
  getPayoutHistory,
  requestPayout,
  listAdminPayouts,
  processPayout,
} from "../controllers/technicianAvailabilityEarnings.controller.js";

import {
  updateAvailabilityValidation,
  updateSkillsValidation,
  availableTechniciansValidation,
} from "../validations/assignment.validation.js";

import {
  createTechnicianProfileValidation,
  updateTechnicianProfileValidation,
  skillsValidation,
  serviceCategoriesValidation,
  availabilityStatusValidation,
  workingHoursValidation,
  certificationValidation,
  certificationsArrayValidation,
  certificationIdValidation,
} from "../validations/technicianProfile.validation.js";

import {
  workflowBookingIdValidation,
  rejectJobValidation,
  completeJobValidation,
  pauseJobValidation,
  workNotesValidation,
} from "../validations/bookingWorkflow.validation.js";

import {
  onlineStatusValidation,
  vacationModeValidation,
  serviceAreasValidation,
  monthlyEarningsValidation,
  payoutHistoryValidation,
  requestPayoutValidation,
  processPayoutValidation,
  adminPayoutListValidation,
} from "../validations/technicianAvailabilityEarnings.validation.js";

import {
  technicianJobListValidation,
  technicianJobSearchQueryValidation,
  technicianJobFilterQueryValidation,
  technicianActivityValidation,
  technicianReportValidation,
  technicianJobPaginationValidation,
} from "../validations/technicianJobs.validation.js";

import { bookingSearchLimiter } from "../middlewares/bookingRateLimit.middleware.js";

import { uploadProfilePhoto, uploadIssueImages, uploadIdentityProof, uploadCertificationDocument } from "../middlewares/upload.middleware.js";
import { bookingWriteLimiter } from "../middlewares/bookingRateLimit.middleware.js";
import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/*
=====================================
Admin — Available Technicians
=====================================
*/

router.get(
  "/available",
  authenticate,
  authorize(ROLES.ADMIN),
  availableTechniciansValidation,
  validate,
  getAvailableTechnicians
);

/*
=====================================
Technician — Dashboard
=====================================
*/

router.get(
  "/dashboard",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  getTechnicianDashboard
);

/*
=====================================
Technician — Job Search / Filter / List
=====================================
*/

router.get(
  "/jobs/search",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  bookingSearchLimiter,
  technicianJobSearchQueryValidation,
  validate,
  searchTechnicianJobs
);

router.get(
  "/jobs/filter",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  bookingSearchLimiter,
  technicianJobFilterQueryValidation,
  validate,
  filterTechnicianJobs
);

router.get(
  "/jobs",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  technicianJobListValidation,
  validate,
  listTechnicianJobs
);

/*
=====================================
Technician — Activity / Audit / Reports
=====================================
*/

router.get(
  "/activity",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  technicianActivityValidation,
  validate,
  getTechnicianActivity
);

router.get(
  "/audit-logs",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  technicianJobPaginationValidation,
  validate,
  getTechnicianAuditLogs
);

router.get(
  "/reports/performance",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  technicianReportValidation,
  validate,
  getTechnicianPerformanceReport
);

/*
=====================================
Technician — Job Management
=====================================
*/

router.get(
  "/jobs/:bookingId",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  workflowBookingIdValidation,
  validate,
  getAssignedJobById
);

router.patch(
  "/jobs/:bookingId/accept",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  bookingWriteLimiter,
  workflowBookingIdValidation,
  validate,
  acceptJob
);

router.patch(
  "/jobs/:bookingId/reject",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  bookingWriteLimiter,
  rejectJobValidation,
  validate,
  rejectJob
);

router.patch(
  "/jobs/:bookingId/start",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  bookingWriteLimiter,
  workflowBookingIdValidation,
  validate,
  startWork
);

router.patch(
  "/jobs/:bookingId/pause",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  bookingWriteLimiter,
  pauseJobValidation,
  validate,
  pauseWork
);

router.patch(
  "/jobs/:bookingId/resume",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  bookingWriteLimiter,
  workflowBookingIdValidation,
  validate,
  resumeWork
);

router.post(
  "/jobs/:bookingId/work-notes",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  bookingWriteLimiter,
  workNotesValidation,
  validate,
  addWorkNotes
);

router.post(
  "/jobs/:bookingId/completion-images",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  workflowBookingIdValidation,
  validate,
  uploadIssueImages,
  uploadCompletionImages
);

router.patch(
  "/jobs/:bookingId/complete",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  bookingWriteLimiter,
  completeJobValidation,
  validate,
  completeWork
);

/*
=====================================
Technician Profile CRUD
=====================================
*/

router.post(
  "/profile",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  createTechnicianProfileValidation,
  validate,
  createTechnicianProfile
);

router.get(
  "/profile",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  getTechnicianProfile
);

router.put(
  "/profile",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  updateTechnicianProfileValidation,
  validate,
  updateTechnicianProfile
);

/*
=====================================
Profile Photo
=====================================
*/

router.patch(
  "/profile/photo",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  uploadProfilePhoto,
  uploadTechnicianPhoto
);

router.delete(
  "/profile/photo",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  deleteTechnicianPhoto
);

router.patch(
  "/profile/identity-proof",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  uploadIdentityProof,
  uploadTechnicianIdentityProof
);

router.post(
  "/profile/certifications/upload",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  uploadCertificationDocument,
  uploadTechnicianCertification
);

router.post(
  "/profile/complete-setup",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  completeTechnicianProfileSetup
);

/*
=====================================
Skills & Service Categories
=====================================
*/

router.put(
  "/profile/skills",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  skillsValidation,
  validate,
  updateTechnicianSkills
);

router.put(
  "/profile/service-categories",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  serviceCategoriesValidation,
  validate,
  updateServiceCategories
);

/*
=====================================
Availability & Working Hours
=====================================
*/

router.patch(
  "/profile/availability",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  availabilityStatusValidation,
  validate,
  updateAvailabilityStatus
);

router.put(
  "/profile/working-hours",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  workingHoursValidation,
  validate,
  updateWorkingHours
);

/*
=====================================
Availability — Online / Vacation / Service Area
=====================================
*/

router.get(
  "/availability",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  getAvailabilitySettings
);

router.patch(
  "/availability/online",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  onlineStatusValidation,
  validate,
  setOnlineStatus
);

router.patch(
  "/availability/vacation",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  vacationModeValidation,
  validate,
  setVacationMode
);

router.put(
  "/availability/service-areas",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  serviceAreasValidation,
  validate,
  updateServiceAreas
);

/*
=====================================
Earnings & Payouts
=====================================
*/

router.get(
  "/earnings/summary",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  getEarningsSummary
);

router.get(
  "/earnings/monthly",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  monthlyEarningsValidation,
  validate,
  getMonthlyEarnings
);

router.get(
  "/earnings/payouts",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  payoutHistoryValidation,
  validate,
  getPayoutHistory
);

router.post(
  "/earnings/payouts",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  requestPayoutValidation,
  validate,
  requestPayout
);

/*
=====================================
Admin — Technician Payouts
=====================================
*/

router.get(
  "/admin/payouts",
  authenticate,
  authorize(ROLES.ADMIN),
  adminPayoutListValidation,
  validate,
  listAdminPayouts
);

router.patch(
  "/admin/payouts/:payoutId",
  authenticate,
  authorize(ROLES.ADMIN),
  processPayoutValidation,
  validate,
  processPayout
);

/*
=====================================
Certifications
=====================================
*/

router.put(
  "/profile/certifications",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  certificationsArrayValidation,
  validate,
  replaceCertifications
);

router.post(
  "/profile/certifications",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  certificationValidation,
  validate,
  addCertification
);

router.delete(
  "/profile/certifications/:certificationId",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  certificationIdValidation,
  validate,
  removeCertification
);

/*
=====================================
Legacy convenience (User-level sync helpers)
=====================================
*/

router.get(
  "/me/workload",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  getMyWorkload
);

router.patch(
  "/me/availability",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  updateAvailabilityValidation,
  validate,
  updateMyAvailability
);

router.put(
  "/me/skills",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  updateSkillsValidation,
  validate,
  updateMySkills
);

export default router;
