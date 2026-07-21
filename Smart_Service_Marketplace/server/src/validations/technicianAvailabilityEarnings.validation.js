import { body } from "express-validator";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const weekDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const onlineStatusValidation = [
  body("onlineStatus")
    .notEmpty()
    .withMessage("onlineStatus is required.")
    .isBoolean()
    .withMessage("onlineStatus must be a boolean.")
    .toBoolean(),
];

export const vacationModeValidation = [
  body("vacationMode")
    .notEmpty()
    .withMessage("vacationMode is required.")
    .isBoolean()
    .withMessage("vacationMode must be a boolean.")
    .toBoolean(),

  body("vacationStart")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("vacationStart must be a valid date."),

  body("vacationEnd")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("vacationEnd must be a valid date."),

  body("vacationReason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("vacationReason cannot exceed 500 characters."),
];

export const serviceAreasValidation = [
  body("serviceAreas")
    .isArray({ min: 1 })
    .withMessage("serviceAreas must be a non-empty array."),

  body("serviceAreas.*")
    .trim()
    .notEmpty()
    .withMessage("Service area cannot be empty.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Each service area must be 2-100 characters."),
];

export const workingHoursBodyValidation = weekDays.flatMap((day) => [
  body(`workingHours.${day}.isOff`)
    .optional()
    .isBoolean()
    .toBoolean(),
  body(`workingHours.${day}.start`)
    .optional()
    .matches(timeRegex),
  body(`workingHours.${day}.end`)
    .optional()
    .matches(timeRegex),
  body(`workingHours.${day}.breakStart`)
    .optional({ values: "falsy" })
    .matches(timeRegex),
  body(`workingHours.${day}.breakEnd`)
    .optional({ values: "falsy" })
    .matches(timeRegex),
  body(`${day}.isOff`).optional().isBoolean().toBoolean(),
  body(`${day}.start`).optional().matches(timeRegex),
  body(`${day}.end`).optional().matches(timeRegex),
  body(`${day}.breakStart`).optional({ values: "falsy" }).matches(timeRegex),
  body(`${day}.breakEnd`).optional({ values: "falsy" }).matches(timeRegex),
]);
