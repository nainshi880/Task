import express from "express";

import {
  getPublicSettings,
  getPublicTerms,
  getPublicPrivacy,
} from "../controllers/adminSettings.controller.js";
import { publicSettingsValidation } from "../validations/adminSettings.validation.js";
import validate from "../middlewares/validation.middleware.js";

const router = express.Router();

router.get("/public", publicSettingsValidation, validate, getPublicSettings);

router.get("/terms", getPublicTerms);

router.get("/privacy", getPublicPrivacy);

export default router;
