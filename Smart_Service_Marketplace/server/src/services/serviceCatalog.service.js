import serviceRepository, {
  DEFAULT_FAQS,
} from "../repositories/service.repository.js";
import serviceCategoryRepository from "../repositories/serviceCategory.repository.js";
import reviewRepository from "../repositories/review.repository.js";
import technicianRepository from "../repositories/technician.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";

class ServiceCatalogService {
  parsePagination(query = {}) {
    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);

    if (Number.isNaN(page) || page < 1) page = PAGINATION.DEFAULT_PAGE || 1;
    if (Number.isNaN(limit) || limit < 1) limit = 12;
    if (limit > 50) limit = 50;

    return { page, limit };
  }

  async listServices(query = {}) {
    const { page, limit } = this.parsePagination(query);

    const result = await serviceRepository.list({
      search: query.q || query.search,
      category: query.category || query.serviceCategory,
      popular: query.popular,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page,
      limit,
    });

    return {
      services: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit) || 1,
      },
    };
  }

  async getServiceById(serviceId) {
    const service =
      (await serviceRepository.findById(serviceId)) ||
      (await serviceRepository.findBySlug(serviceId));

    if (!service) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Service not found.");
    }

    if (!service.faqs?.length) {
      service.faqs = DEFAULT_FAQS;
    }

    const [related, reviews, techniciansResult] = await Promise.all([
      serviceRepository.list({
        category: service.category,
        page: 1,
        limit: 4,
      }),
      reviewRepository.listByServiceName(service.name, {
        category: service.category,
        page: 1,
        limit: 5,
      }),
      technicianRepository
        .findAvailableTechnicians({
          skill: service.category,
          page: 1,
          limit: 4,
        })
        .catch(() => ({ technicians: [], total: 0 })),
    ]);

    const topTechnicians = (techniciansResult.technicians || []).map((tech) => ({
      _id: tech._id,
      name: tech.name,
      avatar: tech.avatar,
      rating: tech.rating ?? 5,
      city: tech.city,
      skills: tech.skills || [],
    }));

    return {
      service: {
        ...service,
        reviewAverage: reviews.averageRating || service.rating || 0,
        reviewCount: reviews.totalReviews || 0,
      },
      relatedServices: related.items.filter(
        (item) => String(item._id) !== String(service._id)
      ),
      reviews: reviews.items,
      reviewStats: {
        average: reviews.averageRating || service.rating || 0,
        total: reviews.totalReviews || 0,
      },
      topTechnicians,
    };
  }

  async getPopularServices(limit = 8) {
    const services = await serviceRepository.listPopular(Number(limit) || 8);
    return { services };
  }

  async getCategories() {
    const [catalogCategories, dbCategories] = await Promise.all([
      serviceRepository.listCategoriesWithCounts(),
      serviceCategoryRepository.list({ includeInactive: false }),
    ]);

    const metaByName = Object.fromEntries(
      (dbCategories.items || []).map((item) => [item.name, item])
    );

    const categories = catalogCategories.map((item) => {
      const meta = metaByName[item.name];
      return {
        ...item,
        description: meta?.description || "",
        iconUrl: meta?.iconUrl || "",
        _id: meta?._id || null,
      };
    });

    return { categories };
  }
}

export default new ServiceCatalogService();
