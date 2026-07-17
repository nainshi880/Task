import { body, param, query } from "express-validator";
import PAGINATION from "../constants/pagination.js";

export const addFavoriteValidation = [
  body("serviceCategoryId")
    .isMongoId()
    .withMessage("Valid service category ID is required."),
];

export const listFavoritesValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit")
    .optional()
    .isInt({ min: PAGINATION.MIN_LIMIT, max: PAGINATION.MAX_LIMIT })
    .toInt(),
];

export const removeFavoriteValidation = [
  param("id").isMongoId().withMessage("Invalid favorite ID."),
];
