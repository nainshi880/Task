import Booking from "../models/Booking.js";
import CustomerProfile from "../models/CustomerProfile.js";
import mongoose from "mongoose";

class BookingRepository {
  async create(bookingData, session = null) {
    if (session) {
      const [booking] = await Booking.create([bookingData], { session });
      return booking;
    }
    return await Booking.create(bookingData);
  }

  async findById(bookingId) {
    return await Booking.findById(bookingId)
      .populate("customer", "name email phone city")
      .populate(
        "technician",
        "name email phone city availability rating skills maxWorkload"
      );
  }

  async findByIdAndCustomer(bookingId, customerId) {
    return await Booking.findOne({
      _id: bookingId,
      customer: customerId,
    })
      .populate("customer", "name email phone city")
      .populate(
        "technician",
        "name email phone city availability rating skills maxWorkload"
      );
  }

  async findByCustomer(customerId, { status, page = 1, limit = 10 } = {}) {
    const filter = { customer: customerId };

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "technician",
          "name email phone city availability rating skills maxWorkload"
        ),
      Booking.countDocuments(filter),
    ]);

    return { bookings, total };
  }

  async updateById(bookingId, updateData, session = null) {
    return await Booking.findByIdAndUpdate(bookingId, updateData, {
      new: true,
      runValidators: true,
      session: session || undefined,
    })
      .populate("customer", "name email phone city")
      .populate(
        "technician",
        "name email phone city availability rating skills maxWorkload"
      );
  }

  async assignTechnician(bookingId, technicianId, status, session = null) {
    return await Booking.findByIdAndUpdate(
      bookingId,
      {
        technician: technicianId,
        status,
      },
      {
        new: true,
        runValidators: true,
        session: session || undefined,
      }
    )
      .populate("customer", "name email phone city")
      .populate(
        "technician",
        "name email phone city availability rating skills maxWorkload"
      );
  }

  async findByIdAndTechnician(bookingId, technicianId) {
    return await Booking.findOne({
      _id: bookingId,
      technician: technicianId,
    })
      .populate("customer", "name email phone city")
      .populate(
        "technician",
        "name email phone city availability rating skills maxWorkload"
      );
  }

  async findByTechnician(technicianId, { status, page = 1, limit = 10 } = {}) {
    const filter = { technician: technicianId };

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customer", "name email phone city"),
      Booking.countDocuments(filter),
    ]);

    return { bookings, total };
  }

  async addCompletionImages(bookingId, imageUrls) {
    return await Booking.findByIdAndUpdate(
      bookingId,
      {
        $push: {
          completionImages: {
            $each: imageUrls,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("customer", "name email phone city")
      .populate(
        "technician",
        "name email phone city availability rating skills maxWorkload"
      );
  }

  async unassignTechnician(bookingId, updateData, session = null) {
    return await Booking.findByIdAndUpdate(
      bookingId,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
        session: session || undefined,
      }
    )
      .populate("customer", "name email phone city")
      .populate(
        "technician",
        "name email phone city availability rating skills maxWorkload"
      );
  }

  async cancelBooking(bookingId, cancelData) {
    return await Booking.findByIdAndUpdate(
      bookingId,
      {
        status: cancelData.status,
        cancelledBy: cancelData.cancelledBy,
        cancellationReason: cancelData.cancellationReason,
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("customer", "name email phone city")
      .populate("technician", "name email phone city");
  }

  async addIssueImages(bookingId, imageUrls) {
    return await Booking.findByIdAndUpdate(
      bookingId,
      {
        $push: {
          issueImages: {
            $each: imageUrls,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("customer", "name email phone city")
      .populate("technician", "name email phone city");
  }

  async findCustomerAddress(userId, addressId) {
    const profile = await CustomerProfile.findOne(
      {
        user: userId,
        isDeleted: false,
        "addresses._id": addressId,
      },
      {
        "addresses.$": 1,
      }
    );

    return profile?.addresses?.[0] || null;
  }

  async findCustomerProfile(userId) {
    return await CustomerProfile.findOne({
      user: userId,
      isDeleted: false,
    });
  }

  // =====================================================
  // Search / Filter / Pagination / Sorting
  // =====================================================

  buildBookingMatch({
    status,
    serviceCategory,
    fromDate,
    toDate,
    paymentStatus,
    customerId,
    technicianId,
  } = {}) {
    const match = {};

    if (status) {
      match.status = status;
    }

    if (serviceCategory) {
      match.serviceCategory = serviceCategory;
    }

    if (paymentStatus) {
      match.paymentStatus = paymentStatus;
    }

    if (customerId) {
      match.customer = new mongoose.Types.ObjectId(customerId);
    }

    if (technicianId) {
      match.technician = new mongoose.Types.ObjectId(technicianId);
    }

    if (fromDate || toDate) {
      match.bookingDate = {};
      if (fromDate) {
        match.bookingDate.$gte = new Date(fromDate);
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        match.bookingDate.$lte = end;
      }
    }

    return match;
  }

  async searchBookings({
    search,
    status,
    serviceCategory,
    fromDate,
    toDate,
    paymentStatus,
    customerId,
    technicianId,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = {}) {
    const match = this.buildBookingMatch({
      status,
      serviceCategory,
      fromDate,
      toDate,
      paymentStatus,
      customerId,
      technicianId,
    });

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "bookingDate",
      "amount",
      "status",
      "serviceCategory",
      "serviceName",
    ];

    const sortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const pipeline = [{ $match: match }];

    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
      {
        $lookup: {
          from: "users",
          localField: "technician",
          foreignField: "_id",
          as: "technician",
        },
      },
      {
        $unwind: {
          path: "$technician",
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    if (search && search.trim()) {
      const term = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      pipeline.push({
        $match: {
          $or: [
            { serviceName: { $regex: term, $options: "i" } },
            { description: { $regex: term, $options: "i" } },
            { serviceCategory: { $regex: term, $options: "i" } },
            { "customer.name": { $regex: term, $options: "i" } },
            { "customer.email": { $regex: term, $options: "i" } },
            { "technician.name": { $regex: term, $options: "i" } },
            { "technician.email": { $regex: term, $options: "i" } },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { [sortField]: sortDirection } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              serviceCategory: 1,
              serviceName: 1,
              description: 1,
              bookingDate: 1,
              bookingTime: 1,
              status: 1,
              amount: 1,
              paymentStatus: 1,
              issueImages: 1,
              completionImages: 1,
              customerConfirmed: 1,
              startedAt: 1,
              completedAt: 1,
              closedAt: 1,
              createdAt: 1,
              updatedAt: 1,
              notes: 1,
              workNotes: 1,
              customer: {
                _id: "$customer._id",
                name: "$customer.name",
                email: "$customer.email",
                phone: "$customer.phone",
                city: "$customer.city",
              },
              technician: {
                $cond: [
                  { $ifNull: ["$technician._id", false] },
                  {
                    _id: "$technician._id",
                    name: "$technician.name",
                    email: "$technician.email",
                    phone: "$technician.phone",
                    city: "$technician.city",
                    rating: "$technician.rating",
                  },
                  null,
                ],
              },
            },
          },
        ],
        meta: [{ $count: "total" }],
      },
    });

    const [result] = await Booking.aggregate(pipeline);
    const bookings = result?.data || [];
    const total = result?.meta?.[0]?.total || 0;

    return { bookings, total };
  }

  async getDashboardAnalytics() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      statusBreakdown,
      categoryBreakdown,
      revenueStats,
      todayCount,
      monthCount,
      pendingJobs,
      activeTechnicians,
      recentBookings,
    ] = await Promise.all([
      Booking.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]),
      Booking.aggregate([
        {
          $group: {
            _id: "$serviceCategory",
            count: { $sum: 1 },
            revenue: { $sum: "$amount" },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Booking.aggregate([
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            totalRevenue: { $sum: "$amount" },
            paidRevenue: {
              $sum: {
                $cond: [
                  { $eq: ["$paymentStatus", "Paid"] },
                  "$amount",
                  0,
                ],
              },
            },
            averageAmount: { $avg: "$amount" },
          },
        },
      ]),
      Booking.countDocuments({
        createdAt: { $gte: startOfToday },
      }),
      Booking.countDocuments({
        createdAt: { $gte: startOfMonth },
      }),
      Booking.countDocuments({
        status: "Pending",
      }),
      Booking.distinct("technician", {
        technician: { $ne: null },
        status: {
          $in: ["Assigned", "Accepted", "In Progress"],
        },
      }),
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("customer", "name email")
        .populate("technician", "name email")
        .select(
          "serviceCategory serviceName status bookingDate amount paymentStatus createdAt"
        ),
    ]);

    const byStatus = statusBreakdown.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        totalAmount: item.totalAmount,
      };
      return acc;
    }, {});

    const revenue = revenueStats[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      paidRevenue: 0,
      averageAmount: 0,
    };

    return {
      overview: {
        totalBookings: revenue.totalBookings,
        totalRevenue: revenue.totalRevenue,
        paidRevenue: revenue.paidRevenue,
        averageAmount: Number((revenue.averageAmount || 0).toFixed(2)),
        pendingJobs,
        activeTechnicians: activeTechnicians.length,
        bookingsToday: todayCount,
        bookingsThisMonth: monthCount,
      },
      byStatus,
      byCategory: categoryBreakdown.map((item) => ({
        category: item._id,
        count: item.count,
        revenue: item.revenue,
      })),
      recentBookings,
    };
  }
}

export default new BookingRepository();
