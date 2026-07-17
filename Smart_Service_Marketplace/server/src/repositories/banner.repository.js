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

  async list({
    includeInactive = false,
    position,
    audience,
    page,
    limit,
    search,
  } = {}) {
    const filter = includeInactive ? {} : this.buildActiveFilter({ position, audience });

    if (position && includeInactive) filter.position = position;
    if (audience && includeInactive && audience !== "all") {
      filter.targetAudience = audience;
    }

    if (search?.trim()) {
      const term = search.trim();
      filter.$or = [
        { title: { $regex: term, $options: "i" } },
        { subtitle: { $regex: term, $options: "i" } },
      ];
    }

    const sort = { sortOrder: 1, createdAt: -1 };

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        Banner.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select(
            "title subtitle imageUrl linkUrl position targetAudience isActive sortOrder startsAt endsAt createdAt"
          )
          .populate("createdBy", "name email")
          .lean(),
        Banner.countDocuments(filter),
      ]);
      return { items, total };
    }

    const items = await Banner.find(filter)
      .sort(sort)
      .populate("createdBy", "name email")
      .lean();

    return { items, total: items.length };
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
