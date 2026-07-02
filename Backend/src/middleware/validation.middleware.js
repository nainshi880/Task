import {body, validationResult} from 'express-validator';

export const validateEmployee = [
   body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),

  body("email")
    .isEmail()
    .withMessage("Invalid email address"),

  body("department")
    .trim()
    .notEmpty()
    .withMessage("Department is required"),

  body("salary")
    .isNumeric()
    .withMessage("Salary must be a number")
    .custom((value) => {
      if (value <= 0) {
        throw new Error("Salary must be greater than 0");
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    next();
  },
]