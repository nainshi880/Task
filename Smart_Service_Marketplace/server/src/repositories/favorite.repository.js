import Favorite from "../models/Favorite.js";

class FavoriteRepository {
  async create(data) {
    return await Favorite.create(data);
  }

  async findById(favoriteId) {
    return await Favorite.findById(favoriteId)
      .populate("serviceCategory", "name slug description iconUrl isActive sortOrder")
      .lean();
  }

  async findByUserAndCategory(userId, serviceCategoryId) {
    return await Favorite.findOne({
      user: userId,
      serviceCategory: serviceCategoryId,
    });
  }

  async listByUser(userId, { page = 1, limit = 10 } = {}) {
    const filter = { user: userId };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Favorite.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("serviceCategory", "name slug description iconUrl isActive sortOrder")
        .lean(),
      Favorite.countDocuments(filter),
    ]);

    return { items, total };
  }

  async deleteById(favoriteId) {
    return await Favorite.findByIdAndDelete(favoriteId);
  }
}

export default new FavoriteRepository();
