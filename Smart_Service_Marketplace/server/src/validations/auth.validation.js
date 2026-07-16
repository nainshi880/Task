import { body } from "express-validator";

export const registerValidation = [

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),

  body("email")
    .isEmail()
    .withMessage("Valid email required"),

  body("password")
    .isLength({
      min: 8,
    })
    .withMessage(
      "Password must contain at least 8 characters"
    ),

];

export const loginValidation = [

  body("email")
    .isEmail()
    .withMessage("Valid email required"),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

export const forgotPasswordValidation = [

    body("email")
        .isEmail()
        .withMessage("Valid email required"),

];

export const resetPasswordValidation = [

    body("password")

        .isLength({
            min: 8,
        })

        .withMessage(
            "Password must be at least 8 characters."
        ),

];