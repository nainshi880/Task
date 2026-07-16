import Invoice from "../models/Invoice.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import CustomerProfile from "../models/CustomerProfile.js";
import User from "../models/User.js";
import PAYMENT_STATUS from "../constants/paymentStatus.js";

class InvoiceRepository {
  async create(data, session = null) {
    const docs = await Invoice.create(
      [data],
      session ? { session } : undefined
    );
    return docs[0];
  }

  async findById(invoiceId) {
    return await Invoice.findById(invoiceId)
      .populate("customer", "name email phone")
      .populate(
        "booking",
        "serviceName serviceCategory amount paymentStatus status bookingDate bookingTime"
      )
      .populate("payment", "method status razorpayPaymentId amount paidAt");
  }

  async findByInvoiceNumber(invoiceNumber) {
    return await Invoice.findOne({ invoiceNumber })
      .populate("customer", "name email phone")
      .populate(
        "booking",
        "serviceName serviceCategory amount paymentStatus status bookingDate bookingTime"
      );
  }

  async findByBooking(bookingId) {
    return await Invoice.findOne({ booking: bookingId })
      .populate("customer", "name email phone")
      .populate(
        "booking",
        "serviceName serviceCategory amount paymentStatus status bookingDate bookingTime"
      )
      .populate("payment", "method status razorpayPaymentId amount paidAt");
  }

  async findByCustomer(customerId, { page = 1, limit = 10, status } = {}) {
    const filter = { customer: customerId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Invoice.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "booking",
          "serviceName serviceCategory amount paymentStatus status"
        ),
      Invoice.countDocuments(filter),
    ]);

    return { items, total };
  }

  async listAll({ page = 1, limit = 10, status, customerId } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (customerId) filter.customer = customerId;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Invoice.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customer", "name email phone")
        .populate(
          "booking",
          "serviceName serviceCategory amount paymentStatus status"
        ),
      Invoice.countDocuments(filter),
    ]);

    return { items, total };
  }

  async updateById(invoiceId, update) {
    return await Invoice.findByIdAndUpdate(invoiceId, update, {
      new: true,
      runValidators: true,
    })
      .populate("customer", "name email phone")
      .populate(
        "booking",
        "serviceName serviceCategory amount paymentStatus status bookingDate bookingTime"
      );
  }

  async findBookingWithCustomer(bookingId) {
    return await Booking.findById(bookingId)
      .populate("customer", "name email phone city")
      .populate("technician", "name email phone");
  }

  async findCustomerProfile(userId) {
    return await CustomerProfile.findOne({ user: userId });
  }

  async findLatestPaidPayment(bookingId) {
    return await Payment.findOne({
      booking: bookingId,
      purpose: "booking",
      status: PAYMENT_STATUS.PAID,
    }).sort({ paidAt: -1, createdAt: -1 });
  }

  async findUserById(userId) {
    return await User.findById(userId).select("name email phone city role");
  }
}

export default new InvoiceRepository();
