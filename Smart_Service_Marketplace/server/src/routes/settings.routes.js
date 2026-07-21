import express from "express";

import {
  getPublicSettings,
  getPublicTerms,
  getPublicPrivacy,
} from "../controllers/adminSettings.controller.js";
import { publicCacheHeaders } from "../middlewares/cacheHeaders.middleware.js";

const router = express.Router();

router.get(
  "/public",
  publicCacheHeaders(120),
  getPublicSettings
);

router.get("/terms", publicCacheHeaders(300), getPublicTerms);

router.get("/privacy", publicCacheHeaders(300), getPublicPrivacy);

export default router;
