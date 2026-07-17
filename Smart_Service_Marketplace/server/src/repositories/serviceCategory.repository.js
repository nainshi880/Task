import ServiceCategory from "../models/ServiceCategory.js";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";

function toSlug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

class ServiceCategoryRepository {
  async seedDefaults() {
    const count = await ServiceCategory.countDocuments();
    if (count > 0) return;

    const docs = SERVICE_CATEGORIES.map((name, index) => ({
      name,
      slug: toSlug(name),
      sortOrder: index,
      isActive: true,
    }));

    await ServiceCategory.insertMany(docs, { ordered: false }).catch(() => {});
  }

  async list({ includeInactive = false } = {}) {
    await this.seedDefaults();
    const filter = includeInactive ? {} : { isActive: true };
    return await ServiceCategory.find(filter).sort({
      sortOrder: 1,
      name: 1,
    });
  }

  async findById(categoryId) {
    return await ServiceCategory.findById(categoryId);
  }

  async findByName(name) {
    return await ServiceCategory.findOne({ name: name.trim() });
  }

  async getActiveNames() {
    const categories = await this.list({ includeInactive: false });
    return categories.map((c) => c.name);
  }

  async create(data) {
    const slug = data.slug || toSlug(data.name);
    return await ServiceCategory.create({ ...data, slug });
  }

  async update(categoryId, update) {
    if (update.name && !update.slug) {
      update.slug = toSlug(update.name);
    }

    return await ServiceCategory.findByIdAndUpdate(categoryId, update, {
      new: true,
      runValidators: true,
    });
  }

  async remove(categoryId) {
    return await ServiceCategory.findByIdAndUpdate(
      categoryId,
      { isActive: false },
      { new: true }
    );
  }
}

export default new ServiceCategoryRepository();
