import Banner from "../models/Banner.js";

class BannerRepository {
  buildActiveFilter({ position, audience } = {}) {
    const now = new Date();
    const filter = { isActive: true };

    if (position) filter.position = position;
    if (audience && audience !== "all") {
      filter.targetAudience = { $in: [audience, "all"] };
    }

    filter.$or = [
      { startsAt: null, endsAt: null },
      { startsAt: { $lte: now }, endsAt: null },
      { startsAt: null, endsAt: { $gte: now } },
      { startsAt: { $lte: now }, endsAt: { $gte: now } },
    ];

    return filter;
  }

  async list({ includeInactive = false, position, audience } = {}) {
    const filter = includeInactive ? {} : this.buildActiveFilter({ position, audience });

    if (position && includeInactive) filter.position = position;
    if (audience && includeInactive && audience !== "all") {
      filter.targetAudience = audience;
    }

    return await Banner.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate("createdBy", "name email");
  }

  async findById(bannerId) {
    return await Banner.findById(bannerId).populate("createdBy", "name email");
  }

  async create(data) {
    return await Banner.create(data);
  }

  async update(bannerId, update) {
    return await Banner.findByIdAndUpdate(bannerId, update, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email");
  }

  async remove(bannerId) {
    return await Banner.findByIdAndDelete(bannerId);
  }
}

export default new BannerRepository();
