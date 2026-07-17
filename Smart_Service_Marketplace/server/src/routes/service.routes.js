import express from "express";

import {
  listServices,
  getPopularServices,
  getServiceCategories,
  getServiceById,
} from "../controllers/serviceCatalog.controller.js";

import {
  listServicesValidation,
  serviceIdValidation,
} from "../validations/serviceCatalog.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { publicCacheHeaders } from "../middlewares/cacheHeaders.middleware.js";

const router = express.Router();

router.get(
  "/categories",
  publicCacheHeaders(120),
  getServiceCategories
);

router.get(
  "/popular",
  publicCacheHeaders(60),
  getPopularServices
);

router.get(
  "/",
  publicCacheHeaders(60),
  listServicesValidation,
  validate,
  listServices
);

router.get(
  "/:serviceId",
  publicCacheHeaders(60),
  serviceIdValidation,
  validate,
  getServiceById
);

export default router;
