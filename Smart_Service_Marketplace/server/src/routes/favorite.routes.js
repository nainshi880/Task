import express from "express";

import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from "../controllers/favorite.controller.js";

import {
  addFavoriteValidation,
  listFavoritesValidation,
  removeFavoriteValidation,
} from "../validations/favorite.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.CUSTOMER));

router.post("/", addFavoriteValidation, validate, addFavorite);

router.get("/", listFavoritesValidation, validate, listFavorites);

router.delete("/:id", removeFavoriteValidation, validate, removeFavorite);

export default router;
