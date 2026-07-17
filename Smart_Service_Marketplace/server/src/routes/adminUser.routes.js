import express from "express";

import {
  listAdminUsers,
  searchAdminUsers,
  filterAdminUsers,
  getAdminUserDetails,
  blockAdminUser,
  unblockAdminUser,
  deleteAdminUser,
  getAdminUserActivity,
} from "../controllers/adminUser.controller.js";

import {
  userIdParamValidation,
  adminUserPaginationValidation,
  adminUserSearchValidation,
  adminUserFilterValidation,
  adminUserActivityValidation,
} from "../validations/adminUser.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get("/", adminUserPaginationValidation, validate, listAdminUsers);
router.get("/search", adminUserSearchValidation, validate, searchAdminUsers);
router.get("/filter", adminUserFilterValidation, validate, filterAdminUsers);

router.get(
  "/:userId/activity",
  adminUserActivityValidation,
  validate,
  getAdminUserActivity
);

router.get("/:userId", userIdParamValidation, validate, getAdminUserDetails);

router.patch("/:userId/block", userIdParamValidation, validate, blockAdminUser);
router.patch(
  "/:userId/unblock",
  userIdParamValidation,
  validate,
  unblockAdminUser
);

router.delete("/:userId", userIdParamValidation, validate, deleteAdminUser);

export default router;
