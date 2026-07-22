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

  async findByCustomer(
    customerId,
    {
      status,
      serviceCategory,
      paymentStatus,
      search,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = {}
  ) {
    const filter = { customer: customerId };

    if (status) filter.status = status;
    if (serviceCategory) filter.serviceCategory = serviceCategory;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    if (fromDate || toDate) {
      filter.bookingDate = {};
      if (fromDate) filter.bookingDate.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.bookingDate.$lte = end;
      }
    }

    if (search?.trim()) {
      const term = search.trim();
      filter.$or = [
        { serviceName: { $regex: term, $options: "i" } },
        { serviceCategory: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
      ];
    }

    const allowedSort = [
      "createdAt",
      "updatedAt",
      "bookingDate",
      "amount",
      "status",
      "serviceCategory",
      "completedAt",
    ];
    const sortField = allowedSort.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .select(
          "serviceCategory serviceName description status bookingDate bookingTime amount paymentStatus address issueImages createdAt updatedAt technician"
        )
        .populate(
          "technician",
          "name email phone city availability rating skills maxWorkload"
        )
        .lean(),
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

  /**
   * First-wins claim: only succeeds while booking is Confirmed (or legacy Pending) and unassigned.
   */
  async claimPendingBooking(bookingId, technicianId, session = null) {
    return await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        status: { $in: ["Confirmed", "Pending"] },
        $or: [{ technician: null }, { technician: { $exists: false } }],
      },
      {
        $set: {
          technician: technicianId,
          status: "Assigned",
        },
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

  /**
   * Open marketplace jobs: Confirmed (paid) + unassigned.
   */
  async findOpenJobsForTechnician(
    {
      skills = [],
      city = "",
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = {}
  ) {
    const filter = {
      status: { $in: ["Confirmed", "Pending"] },
      paymentStatus: { $ne: "Refunded" },
      $or: [{ technician: null }, { technician: { $exists: false } }],
    };

    const skillList = (Array.isArray(skills) ? skills : [])
      .map((s) => String(s || "").trim())
      .filter(Boolean);

    if (skillList.length) {
      filter.serviceCategory = {
        $in: skillList.map((s) => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")),
      };
    }

    const allowedSort = ["createdAt", "bookingDate", "amount", "serviceCategory"];
    const sortField = allowedSort.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .populate("customer", "name email phone city")
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return { bookings, total, cityFilter: city || null };
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

  async findByTechnician(
    technicianId,
    {
      status,
      serviceCategory,
      fromDate,
      toDate,
      paymentStatus,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = {}
  ) {
    const filter = { technician: technicianId };

    if (status) {
      filter.status = status;
    }

    if (serviceCategory) {
      filter.serviceCategory = serviceCategory;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (fromDate || toDate) {
      filter.bookingDate = {};
      if (fromDate) filter.bookingDate.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.bookingDate.$lte = end;
      }
    }

    const allowedSort = [
      "createdAt",
      "updatedAt",
      "bookingDate",
      "amount",
      "status",
      "serviceCategory",
      "completedAt",
    ];
    const sortField = allowedSort.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .select(
          "serviceCategory serviceName description status bookingDate bookingTime amount paymentStatus issueImages completionImages workNotes startedAt completedAt pausedAt createdAt updatedAt customer"
        )
        .populate("customer", "name email phone city")
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return { bookings, total };
  }

  async searchTechnicianJobs({
    technicianId,
    search,
    status,
    serviceCategory,
    fromDate,
    toDate,
    paymentStatus,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = {}) {
    const match = {
      technician: new mongoose.Types.ObjectId(technicianId),
    };

    if (status) match.status = status;
    if (serviceCategory) match.serviceCategory = serviceCategory;
    if (paymentStatus) match.paymentStatus = paymentStatus;

    if (fromDate || toDate) {
      match.bookingDate = {};
      if (fromDate) match.bookingDate.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        match.bookingDate.$lte = end;
      }
    }

    const allowedSort = [
      "createdAt",
      "updatedAt",
      "bookingDate",
      "amount",
      "status",
      "serviceCategory",
      "completedAt",
    ];
    const sortField = allowedSort.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
    ];

    if (search?.trim()) {
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
            { "customer.phone": { $regex: term, $options: "i" } },
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
              status: 1,
              bookingDate: 1,
              bookingTime: 1,
              amount: 1,
              paymentStatus: 1,
              issueImages: 1,
              completionImages: 1,
              workNotes: 1,
              startedAt: 1,
              completedAt: 1,
              pausedAt: 1,
              createdAt: 1,
              updatedAt: 1,
              customer: {
                _id: "$customer._id",
                name: "$customer.name",
                email: "$customer.email",
                phone: "$customer.phone",
                city: "$customer.city",
              },
            },
          },
        ],
        meta: [{ $count: "total" }],
      },
    });

    const [result] = await Booking.aggregate(pipeline);
    return {
      bookings: result?.data || [],
      total: result?.meta?.[0]?.total || 0,
    };
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

  async addWorkNote(bookingId, note) {
    return await Booking.findByIdAndUpdate(
      bookingId,
      {
        $push: {
          workNotesLog: {
            note,
            createdAt: new Date(),
          },
        },
        $set: {
          workNotes: note,
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

  async getReportSummary({ fromDate, toDate, status, serviceCategory } = {}) {
    const match = {};

    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        match.createdAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }

    if (status) match.status = status;
    if (serviceCategory) match.serviceCategory = serviceCategory;

    const [summaryAgg, byStatus, byCategory, byPaymentStatus] =
      await Promise.all([
        Booking.aggregate([
          { $match: match },
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
              cancelledCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0],
                },
              },
              averageAmount: { $avg: "$amount" },
            },
          },
        ]),
        Booking.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              revenue: { $sum: "$amount" },
            },
          },
          { $sort: { count: -1 } },
        ]),
        Booking.aggregate([
          { $match: match },
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
          { $match: match },
          {
            $group: {
              _id: "$paymentStatus",
              count: { $sum: 1 },
              revenue: { $sum: "$amount" },
            },
          },
        ]),
      ]);

    const summary = summaryAgg[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      paidRevenue: 0,
      cancelledCount: 0,
      averageAmount: 0,
    };

    return {
      period: {
        fromDate: fromDate || null,
        toDate: toDate || null,
      },
      filters: {
        status: status || null,
        serviceCategory: serviceCategory || null,
      },
      summary: {
        ...summary,
        averageAmount: Number((summary.averageAmount || 0).toFixed(2)),
      },
      byStatus: byStatus.map((row) => ({
        status: row._id,
        count: row.count,
        revenue: row.revenue,
      })),
      byCategory: byCategory.map((row) => ({
        category: row._id,
        count: row.count,
        revenue: row.revenue,
      })),
      byPaymentStatus: byPaymentStatus.map((row) => ({
        paymentStatus: row._id,
        count: row.count,
        revenue: row.revenue,
      })),
    };
  }

  async listForReportExport({
    fromDate,
    toDate,
    status,
    serviceCategory,
    limit = 5000,
  } = {}) {
    const filter = {};

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (status) filter.status = status;
    if (serviceCategory) filter.serviceCategory = serviceCategory;

    return await Booking.find(filter)
      .select(
        "serviceName serviceCategory status amount paymentStatus bookingDate createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

export default new BookingRepository();
