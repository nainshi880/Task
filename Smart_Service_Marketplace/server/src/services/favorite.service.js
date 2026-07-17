import favoriteRepository from "../repositories/favorite.repository.js";
import serviceCategoryRepository from "../repositories/serviceCategory.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import {
  parsePagination,
  formatPaginatedResponse,
} from "../utils/pagination.js";

class FavoriteService {
  async addFavorite(userId, { serviceCategoryId }) {
    const category = await serviceCategoryRepository.findById(serviceCategoryId);

    if (!category || !category.isActive) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Service category not found.");
    }

    const existing = await favoriteRepository.findByUserAndCategory(
      userId,
      serviceCategoryId
    );

    if (existing) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "This service is already in your favorites."
      );
    }

    const favorite = await favoriteRepository.create({
      user: userId,
      serviceCategory: serviceCategoryId,
    });

    return await favoriteRepository.findById(favorite._id);
  }

  async listFavorites(userId, query = {}) {
    const { page, limit } = parsePagination(query);
    const { items, total } = await favoriteRepository.listByUser(userId, {
      page,
      limit,
    });

    return formatPaginatedResponse(items, page, limit, total);
  }

  async removeFavorite(userId, favoriteId) {
    const favorite = await favoriteRepository.findById(favoriteId);

    if (!favorite) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Favorite not found.");
    }

    if (favorite.user.toString() !== userId.toString()) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
    }

    await favoriteRepository.deleteById(favoriteId);

    return favorite;
  }
}

export default new FavoriteService();
