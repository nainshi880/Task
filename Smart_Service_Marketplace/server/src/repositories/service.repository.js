import Service from "../models/Service.js";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";

function toSlug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DEFAULT_FAQS = [
  {
    question: "How do I book this service?",
    answer:
      "Choose a date and time, select your address, and confirm the booking. A verified technician will be assigned shortly.",
  },
  {
    question: "What is included in the price?",
    answer:
      "The listed price covers the base service visit. Extra parts or materials, if needed, are confirmed before work begins.",
  },
  {
    question: "Can I reschedule or cancel?",
    answer:
      "Yes. You can manage upcoming bookings from My Bookings before the technician starts the job.",
  },
  {
    question: "Are technicians verified?",
    answer:
      "All technicians on the platform complete identity checks and skill verification before taking jobs.",
  },
];

const DEFAULT_SERVICES = [
  {
    name: "Pipe Leak Repair",
    category: "Plumbing",
    shortDescription: "Fix leaking pipes and joints quickly.",
    description:
      "Professional leak detection and repair for kitchen, bathroom, and outdoor plumbing. Includes sealant and joint replacement as needed.",
    basePrice: 399,
    durationMinutes: 60,
    isPopular: true,
    features: ["Leak detection", "Joint sealing", "Same-day slots"],
    faqs: DEFAULT_FAQS,
  },
  {
    name: "Bathroom Fitting",
    category: "Plumbing",
    shortDescription: "Install taps, showers, and sanitary fittings.",
    description:
      "Installation and replacement of taps, shower heads, flush tanks, and bathroom accessories by verified plumbers.",
    basePrice: 499,
    durationMinutes: 90,
    features: ["Tap installation", "Shower setup", "Flush repair"],
    faqs: DEFAULT_FAQS,
  },
  {
    name: "Switchboard Repair",
    category: "Electrical",
    shortDescription: "Repair and upgrade electrical switchboards.",
    description:
      "Diagnose and fix faulty switches, sockets, and MCB issues with safe wiring practices.",
    basePrice: 349,
    durationMinutes: 60,
    isPopular: true,
    features: ["MCB check", "Socket repair", "Safety inspection"],
    faqs: DEFAULT_FAQS,
  },
  {
    name: "Fan Installation",
    category: "Electrical",
    shortDescription: "Ceiling and wall fan installation.",
    description:
      "Install new ceiling or wall fans including mounting, wiring, and balance check.",
    basePrice: 299,
    durationMinutes: 45,
    features: ["Mounting", "Wiring", "Balance check"],
    faqs: DEFAULT_FAQS,
  },
  {
    name: "Deep Home Cleaning",
    category: "Cleaning",
    shortDescription: "Full home deep cleaning service.",
    description:
      "Thorough cleaning of floors, kitchen, bathrooms, and living areas with eco-friendly supplies.",
    basePrice: 1499,
    durationMinutes: 180,
    isPopular: true,
    features: ["Kitchen deep clean", "Bathroom sanitize", "Floor mopping"],
    faqs: DEFAULT_FAQS,
  },
  {
    name: "Sofa Cleaning",
    category: "Cleaning",
    shortDescription: "Professional sofa and upholstery cleaning.",
    description:
      "Shampoo and steam cleaning for sofas and soft furnishings to remove stains and odors.",
    basePrice: 799,
    durationMinutes: 90,
    features: ["Stain removal", "Odor control", "Fabric safe"],
    faqs: DEFAULT_FAQS,
  },
  {
    name: "Interior Wall Painting",
    category: "Painting",
    shortDescription: "Fresh interior painting for rooms.",
    description:
      "Surface prep and painting for interior walls with quality emulsion paints.",
    basePrice: 2499,
    durationMinutes: 240,
    isPopular: true,
    features: ["Surface prep", "2 coats", "Cleanup included"],
    faqs: DEFAULT_FAQS,
  },
  {
    name: "Furniture Assembly",
    category: "Carpentry",
    shortDescription: "Assemble flat-pack and custom furniture.",
    description:
      "Expert assembly of beds, wardrobes, desks, and modular furniture.",
    basePrice: 1,
    durationMinutes: 90,
    features: ["Tool kit included", "Hardware check", "Leveling"],
    faqs: DEFAULT_FAQS,
  },
  {
    name: "Washing Machine Repair",
    category: "Appliance Repair",
    shortDescription: "Diagnose and repair washing machines.",
    description:
      "Fix drainage, spin, and power issues for top-load and front-load washers.",
    basePrice: 399,
    durationMinutes: 75,
    isPopular: true,
    features: ["Diagnosis", "Spare parts quote", "Test run"],
    faqs: DEFAULT_FAQS,
  },
  {
    name: "AC Gas Refill",
    category: "AC Repair",
    shortDescription: "AC gas charging and performance check.",
    description:
      "Check refrigerant levels, refill gas, and verify cooling performance.",
    basePrice: 1999,
    durationMinutes: 90,
    isPopular: true,
    features: ["Leak check", "Gas refill", "Cooling test"],
    faqs: DEFAULT_FAQS,
  },
  {
    name: "AC General Service",
    category: "AC Repair",
    shortDescription: "Routine AC cleaning and servicing.",
    description:
      "Filter cleaning, coil wash, and basic maintenance for split and window ACs.",
    basePrice: 599,
    durationMinutes: 60,
    features: ["Filter clean", "Coil wash", "Drain check"],
    faqs: DEFAULT_FAQS,
  },
  {
    name: "Cockroach Control",
    category: "Pest Control",
    shortDescription: "Targeted cockroach treatment for homes.",
    description:
      "Gel and spray treatment for kitchens and bathrooms with follow-up guidance.",
    basePrice: 899,
    durationMinutes: 60,
    features: ["Gel treatment", "Safe chemicals", "Kitchen focus"],
    faqs: DEFAULT_FAQS,
  },
  {
    name: "Local Home Shifting",
    category: "Home Shifting",
    shortDescription: "Packing and local relocation support.",
    description:
      "Packing, loading, and local transport assistance for apartment moves.",
    basePrice: 3499,
    durationMinutes: 300,
    features: ["Packing help", "Loading", "Local transport"],
    faqs: DEFAULT_FAQS,
  },
  {
    name: "General Handyman",
    category: "Other",
    shortDescription: "Small home repairs and odd jobs.",
    description:
      "Flexible handyman support for minor fixes that do not fit other categories.",
    basePrice: 299,
    durationMinutes: 60,
    features: ["Minor repairs", "Flexible scope", "Verified pros"],
    faqs: DEFAULT_FAQS,
  },
];

export { DEFAULT_FAQS };

class ServiceRepository {
  async seedDefaults() {
    const count = await Service.countDocuments();
    if (count > 0) {
      // Backfill FAQs for older seeded services
      await Service.updateMany(
        { $or: [{ faqs: { $exists: false } }, { faqs: { $size: 0 } }] },
        { $set: { faqs: DEFAULT_FAQS } }
      );
      return;
    }

    const docs = DEFAULT_SERVICES.map((service, index) => ({
      ...service,
      faqs: service.faqs || DEFAULT_FAQS,
      slug: toSlug(service.name),
      sortOrder: index,
      isActive: true,
    }));

    await Service.insertMany(docs, { ordered: false }).catch(() => {});
  }

  async list({
    search,
    category,
    popular,
    sortBy = "sortOrder",
    sortOrder = "asc",
    page = 1,
    limit = 12,
  } = {}) {
    await this.seedDefaults();

    const filter = { isActive: true };

    if (category && SERVICE_CATEGORIES.includes(category)) {
      filter.category = category;
    }

    if (popular === true || popular === "true") {
      filter.isPopular = true;
    }

    if (search?.trim()) {
      const term = search.trim();
      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { shortDescription: { $regex: term, $options: "i" } },
        { category: { $regex: term, $options: "i" } },
      ];
    }

    const allowedSort = [
      "sortOrder",
      "name",
      "basePrice",
      "rating",
      "bookingCount",
      "createdAt",
    ];
    const field = allowedSort.includes(sortBy) ? sortBy : "sortOrder";
    const direction = sortOrder === "desc" ? -1 : 1;
    const sort = { [field]: direction, name: 1 };

    const skip = (Math.max(page, 1) - 1) * limit;

    const [items, total] = await Promise.all([
      Service.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Service.countDocuments(filter),
    ]);

    return { items, total, page: Number(page), limit: Number(limit) };
  }

  async findById(serviceId) {
    await this.seedDefaults();
    return await Service.findOne({ _id: serviceId, isActive: true }).lean();
  }

  async findBySlug(slug) {
    await this.seedDefaults();
    return await Service.findOne({ slug, isActive: true }).lean();
  }

  async listPopular(limit = 8) {
    await this.seedDefaults();
    return await Service.find({ isActive: true, isPopular: true })
      .sort({ bookingCount: -1, sortOrder: 1 })
      .limit(limit)
      .lean();
  }

  async listCategoriesWithCounts() {
    await this.seedDefaults();

    const counts = await Service.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const countMap = Object.fromEntries(
      counts.map((row) => [row._id, row.count])
    );

    return SERVICE_CATEGORIES.map((name, index) => ({
      name,
      slug: toSlug(name),
      serviceCount: countMap[name] || 0,
      sortOrder: index,
    }));
  }

  /** Admin: list catalog services (includes inactive). */
  async listAdmin({
    search,
    category,
    includeInactive = true,
    page = 1,
    limit = 50,
  } = {}) {
    await this.seedDefaults();

    const filter = {};
    if (!includeInactive) filter.isActive = true;

    if (category && SERVICE_CATEGORIES.includes(category)) {
      filter.category = category;
    }

    if (search?.trim()) {
      const term = search.trim();
      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { shortDescription: { $regex: term, $options: "i" } },
        { category: { $regex: term, $options: "i" } },
      ];
    }

    const skip = (Math.max(page, 1) - 1) * limit;
    const [items, total] = await Promise.all([
      Service.find(filter)
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Service.countDocuments(filter),
    ]);

    return { items, total, page: Number(page), limit: Number(limit) };
  }

  async findByIdAdmin(serviceId) {
    return await Service.findById(serviceId).lean();
  }

  async updateById(serviceId, data) {
    const allowed = [
      "name",
      "shortDescription",
      "description",
      "basePrice",
      "durationMinutes",
      "imageUrl",
      "features",
      "isPopular",
      "isActive",
      "sortOrder",
      "rating",
    ];

    const update = {};
    for (const key of allowed) {
      if (data[key] !== undefined) update[key] = data[key];
    }

    if (update.name) {
      update.slug = toSlug(update.name);
    }

    return await Service.findByIdAndUpdate(
      serviceId,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
  }
}

export default new ServiceRepository();
