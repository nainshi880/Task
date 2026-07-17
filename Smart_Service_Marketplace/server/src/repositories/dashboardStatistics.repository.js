import Booking from "../models/Booking.js";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import PAYMENT_STATUS from "../constants/paymentStatus.js";

const UPCOMING_EXCLUDED_STATUSES = [
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CLOSED,
  BOOKING_STATUS.CANCELLED,
];

const COMPLETED_STATUSES = [
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CLOSED,
];

class DashboardStatisticsRepository {
  async getCustomerStatistics(userId) {
    const [totalBookings, upcomingServices, completedServices, spendingAgg] =
      await Promise.all([
        Booking.countDocuments({ customer: userId }),
        Booking.countDocuments({
          customer: userId,
          bookingDate: { $gte: new Date() },
          status: { $nin: UPCOMING_EXCLUDED_STATUSES },
        }),
        Booking.countDocuments({
          customer: userId,
          status: { $in: COMPLETED_STATUSES },
        }),
        Booking.aggregate([
          {
            $match: {
              customer: userId,
              paymentStatus: PAYMENT_STATUS.PAID,
            },
          },
          {
            $group: {
              _id: null,
              totalSpending: { $sum: "$amount" },
            },
          },
        ]),
      ]);

    return {
      totalBookings,
      upcomingServices,
      completedServices,
      totalSpending: spendingAgg[0]?.totalSpending || 0,
    };
  }
}

export default new DashboardStatisticsRepository();
