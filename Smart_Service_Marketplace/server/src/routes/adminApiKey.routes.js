import express from "express";

import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "../controllers/adminApiKey.controller.js";

import {
  createApiKeyValidation,
  apiKeyIdValidation,
} from "../validations/apiKey.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get("/", listApiKeys);
router.post("/", createApiKeyValidation, validate, createApiKey);
router.delete("/:keyId", apiKeyIdValidation, validate, revokeApiKey);

export default router;
