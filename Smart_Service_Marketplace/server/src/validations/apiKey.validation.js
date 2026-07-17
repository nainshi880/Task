import { body, param } from "express-validator";

export const createApiKeyValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("API key name is required.")
    .isLength({ max: 100 }),
  body("scopes")
    .optional()
    .isArray()
    .withMessage("Scopes must be an array."),
  body("scopes.*")
    .optional()
    .isIn(["read", "write", "admin"])
    .withMessage("Invalid scope."),
  body("expiresAt").optional().isISO8601(),
];

export const apiKeyIdValidation = [
  param("keyId").isMongoId().withMessage("Invalid API key ID."),
];
