import { body } from "express-validator";
import { PASSWORD_POLICY } from "../constants/security.js";

export function strongPasswordRules(field = "password") {
  return body(field)
    .trim()
    .isLength({
      min: PASSWORD_POLICY.MIN_LENGTH,
      max: PASSWORD_POLICY.MAX_LENGTH,
    })
    .withMessage(PASSWORD_POLICY.MESSAGE)
    .matches(PASSWORD_POLICY.PATTERN)
    .withMessage(PASSWORD_POLICY.MESSAGE);
}

export function optionalStrongPasswordRules(field = "password") {
  return body(field)
    .optional()
    .trim()
    .isLength({
      min: PASSWORD_POLICY.MIN_LENGTH,
      max: PASSWORD_POLICY.MAX_LENGTH,
    })
    .withMessage(PASSWORD_POLICY.MESSAGE)
    .matches(PASSWORD_POLICY.PATTERN)
    .withMessage(PASSWORD_POLICY.MESSAGE);
}

export default { strongPasswordRules, optionalStrongPasswordRules };
