import fs from "fs/promises";
import cloudinary from "../config/cloudinary.js";
import bookingRepository from "../repositories/booking.repository.js";
import bookingEventService from "./bookingEvent.service.js";
import assignmentService from "./assignment.service.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import BOOKING_STATUS, {
  EDITABLE_BOOKING_STATUSES,
  CANCELLABLE_BOOKING_STATUSES,
} from "../constants/bookingStatus.js";
import PAGINATION from "../constants/pagination.js";
import BOOKING_TIMELINE_EVENT from "../constants/bookingTimelineEvent.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import withTransaction from "../utils/transaction.js";
import withRetry, { isTransientError } from "../utils/retry.js";
import cacheService, {
  CACHE_KEYS,
  CACHE_TTL,
} from "../utils/cache.js";
import logger from "../utils/logger.js";
import {
  parsePagination,
  formatPaginatedResponse,
  stableQueryKey,
  shouldLazyLoad,
} from "../utils/pagination.js";

class BookingService {
  async resolveAddressDetails(userId, addressId) {
    const address = await bookingRepository.findCustomerAddress(
      userId,
      addressId
    );

    if (!address) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Address not found in your profile. Add an address first."
      );
    }

    return address;
  }

  attachAddressDetails(booking, address) {
    if (!booking) return booking;

    const plain =
      typeof booking.toObject === "function"
        ? booking.toObject()
        : { ...booking };

    plain.addressDetails = address || null;
    return plain;
  }

  async enrichBooking(booking, userId) {
    if (!booking) return null;

    const address = await bookingRepository.findCustomerAddress(
      userId || booking.customer?._id || booking.customer,
      booking.address
    );

    return this.attachAddressDetails(booking, address);
  }

  async uploadFilesToCloudinary(files = []) {
    if (!files.length) return [];

    const urls = [];

    for (const file of files) {
      try {
        const result = await withRetry(
          async () =>
            cloudinary.uploader.upload(file.path, {
              folder: "booking-issue-images",
            }),
          {
            retries: 3,
            delayMs: 400,
            shouldRetry: isTransientError,
          }
        );
        urls.push(result.secure_url);
      } finally {
        try {
          await fs.unlink(file.path);
        } catch {
          // ignore temp cleanup errors
        }
      }
    }

    return urls;
  }

  parsePagination(query = {}) {
    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);

    if (Number.isNaN(page) || page < 1) {
      page = PAGINATION.DEFAULT_PAGE;
    }

    if (Number.isNaN(limit) || limit < PAGINATION.MIN_LIMIT) {
      limit = PAGINATION.DEFAULT_LIMIT;
    }

    if (limit > PAGINATION.MAX_LIMIT) {
      limit = PAGINATION.MAX_LIMIT;
    }

    return { page, limit };
  }

  formatPaginatedResponse(items, page, limit, total) {
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  assertEditable(booking) {
    if (!EDITABLE_BOOKING_STATUSES.includes(booking.status)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Booking can only be updated before technician acceptance."
      );
    }
  }

  assertCancellable(booking) {
    if (!CANCELLABLE_BOOKING_STATUSES.includes(booking.status)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Booking can only be cancelled before technician acceptance."
      );
    }
  }

  // ======================================
  // Create Booking
  // ======================================

  async createBooking(customerId, data, files = [], actorMeta = {}) {
    await this.resolveAddressDetails(customerId, data.address);

    const bookingDate = new Date(data.bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Booking date cannot be in the past."
      );
    }

    const issueImages = await this.uploadFilesToCloudinary(files);
    const status = BOOKING_STATUS.PENDING_PAYMENT;

    const booking = await withTransaction(async (session) => {
      return await bookingRepository.create(
        {
          customer: customerId,
          technician: null,
          preferredTechnician: null,
          serviceCategory: data.serviceCategory,
          serviceName: data.serviceName,
          description: data.description,
          address: data.address,
          bookingDate,
          bookingTime: data.bookingTime,
          notes: data.notes,
          amount: data.amount || 0,
          issueImages,
          status,
          paymentStatus: "Pending",
        },
        session
      );
    });

    await bookingEventService.record({
      bookingId: booking._id,
      event: BOOKING_TIMELINE_EVENT.CREATED,
      actorId: customerId,
      actorRole: "customer",
      action: AUDIT_ACTION.CREATE,
      fromStatus: null,
      toStatus: status,
      note: "Booking created — awaiting payment",
      metadata: {
        serviceCategory: data.serviceCategory,
        serviceName: data.serviceName,
      },
      ipAddress: actorMeta.ipAddress,
      userAgent: actorMeta.userAgent,
    });

    // Do not notify technicians until payment succeeds.
    return this.enrichBooking(booking, customerId);
  }

  // ======================================
  // Get Booking by ID
  // ======================================

  async getBookingById(customerId, bookingId) {
    const cacheKey = `${CACHE_KEYS.BOOKING_DETAIL_PREFIX}${bookingId}:${customerId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const booking = await bookingRepository.findByIdAndCustomer(
      bookingId,
      customerId
    );

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    const enriched = await this.enrichBooking(booking, customerId);
    await cacheService.set(cacheKey, enriched, CACHE_TTL.DETAIL);
    return enriched;
  }

  // ======================================
  // Get Customer Bookings
  // ======================================

  async getCustomerBookings(customerId, query = {}) {
    const { page, limit } = parsePagination(query);
    const cacheKey = `${CACHE_KEYS.BOOKING_LIST_PREFIX}${customerId}:${stableQueryKey(query)}`;

    const { value, cached: fromCache } = await cacheService.getOrSet(
      cacheKey,
      CACHE_TTL.LIST,
      async () => {
        const { bookings, total } = await bookingRepository.findByCustomer(
          customerId,
          {
            status: query.status,
            serviceCategory: query.serviceCategory || query.category,
            paymentStatus: query.paymentStatus,
            search: query.q || query.search,
            fromDate: query.fromDate || query.from,
            toDate: query.toDate || query.to,
            page,
            limit,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
          }
        );

        const lazy = shouldLazyLoad(query);
        const items = lazy
          ? bookings
          : await Promise.all(
              bookings.map((booking) =>
                this.enrichBooking(booking, customerId)
              )
            );

        return formatPaginatedResponse(items, page, limit, total, {
          lazy,
        });
      }
    );

    return { ...value, cached: fromCache };
  }

  // ======================================
  // Update Booking (before acceptance)
  // ======================================

  async updateBooking(customerId, bookingId, data) {
    const booking = await bookingRepository.findByIdAndCustomer(
      bookingId,
      customerId
    );

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    this.assertEditable(booking);

    if (data.address) {
      await this.resolveAddressDetails(customerId, data.address);
    }

    if (data.bookingDate) {
      const bookingDate = new Date(data.bookingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (bookingDate < today) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Booking date cannot be in the past."
        );
      }

      data.bookingDate = bookingDate;
    }

    const allowedFields = [
      "serviceCategory",
      "serviceName",
      "description",
      "address",
      "bookingDate",
      "bookingTime",
      "notes",
      "amount",
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "No valid fields provided for update."
      );
    }

    const updated = await bookingRepository.updateById(bookingId, updateData);

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.UPDATED,
      actorId: customerId,
      actorRole: "customer",
      action: AUDIT_ACTION.UPDATE,
      fromStatus: booking.status,
      toStatus: booking.status,
      note: "Booking updated",
      metadata: { fields: Object.keys(updateData) },
    });

    return this.enrichBooking(updated, customerId);
  }

  // ======================================
  // Cancel Booking
  // ======================================

  async cancelBooking(customerId, bookingId, cancellationReason) {
    const booking = await bookingRepository.findByIdAndCustomer(
      bookingId,
      customerId
    );

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    this.assertCancellable(booking);

    const cancelled = await bookingRepository.cancelBooking(bookingId, {
      status: BOOKING_STATUS.CANCELLED,
      cancelledBy: "Customer",
      cancellationReason: cancellationReason || "Cancelled by customer",
    });

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.CANCELLED,
      actorId: customerId,
      actorRole: "customer",
      action: AUDIT_ACTION.CANCEL,
      fromStatus: booking.status,
      toStatus: BOOKING_STATUS.CANCELLED,
      note: cancellationReason || "Cancelled by customer",
    });

    return this.enrichBooking(cancelled, customerId);
  }

  // ======================================
  // Upload Issue Images
  // ======================================

  async uploadIssueImages(customerId, bookingId, files = []) {
    if (!files.length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Please upload at least one image."
      );
    }

    const booking = await bookingRepository.findByIdAndCustomer(
      bookingId,
      customerId
    );

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    this.assertEditable(booking);

    const maxImages = 5;
    const remaining = maxImages - (booking.issueImages?.length || 0);

    if (remaining <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Maximum of ${maxImages} issue images allowed per booking.`
      );
    }

    if (files.length > remaining) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `You can upload only ${remaining} more image(s).`
      );
    }

    const imageUrls = await this.uploadFilesToCloudinary(files);
    const updated = await bookingRepository.addIssueImages(
      bookingId,
      imageUrls
    );

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.ISSUE_IMAGES_UPLOADED,
      actorId: customerId,
      actorRole: "customer",
      action: AUDIT_ACTION.UPDATE,
      fromStatus: booking.status,
      toStatus: booking.status,
      note: `${imageUrls.length} issue image(s) uploaded`,
      metadata: { count: imageUrls.length },
    });

    return this.enrichBooking(updated, customerId);
  }
}

export default new BookingService();
