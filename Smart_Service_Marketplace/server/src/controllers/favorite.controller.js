import favoriteService from "../services/favorite.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const addFavorite = asyncHandler(async (req, res) => {
  const favorite = await favoriteService.addFavorite(req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, "Service added to favorites.", {
      favorite,
    })
  );
});

export const listFavorites = asyncHandler(async (req, res) => {
  const result = await favoriteService.listFavorites(req.user._id, req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Favorites fetched successfully.", result)
  );
});

export const removeFavorite = asyncHandler(async (req, res) => {
  const favorite = await favoriteService.removeFavorite(
    req.user._id,
    req.params.id
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Favorite removed successfully.", {
      favorite,
    })
  );
});
