import ExtraCharge from "../models/ExtraCharge.js";
import EXTRA_CHARGE_STATUS, {
  EXTRA_CHARGE_BLOCKING_STATUSES,
} from "../constants/extraChargeStatus.js";

class ExtraChargeRepository {
  async create(data, session = null) {
    if (session) {
      const [doc] = await ExtraCharge.create([data], { session });
      return doc;
    }
    return ExtraCharge.create(data);
  }

  async findById(id) {
    return ExtraCharge.findById(id)
      .populate("technician", "name email phone")
      .populate("customer", "name email phone")
      .populate("booking", "serviceName status amount paymentStatus");
  }

  async findByBooking(bookingId) {
    return ExtraCharge.find({ booking: bookingId })
      .sort({ createdAt: -1 })
      .populate("technician", "name email phone")
      .lean();
  }

  async findBlockingByBooking(bookingId) {
    return ExtraCharge.findOne({
      booking: bookingId,
      status: { $in: EXTRA_CHARGE_BLOCKING_STATUSES },
    });
  }

  async findPendingByBooking(bookingId) {
    return ExtraCharge.findOne({
      booking: bookingId,
      status: EXTRA_CHARGE_STATUS.PENDING,
    });
  }

  async updateById(id, update, session = null) {
    const opts = { returnDocument: "after", runValidators: true };
    if (session) opts.session = session;
    return ExtraCharge.findByIdAndUpdate(id, update, opts);
  }

  async markApproved(id, session = null) {
    return this.updateById(
      id,
      {
        status: EXTRA_CHARGE_STATUS.APPROVED,
        respondedAt: new Date(),
      },
      session
    );
  }

  async markPaid(id, { paymentId }, session = null) {
    return this.updateById(
      id,
      {
        status: EXTRA_CHARGE_STATUS.PAID,
        payment: paymentId,
        paidAt: new Date(),
        respondedAt: new Date(),
      },
      session
    );
  }

  async markRejected(id, rejectionReason = "", session = null) {
    return this.updateById(
      id,
      {
        status: EXTRA_CHARGE_STATUS.REJECTED,
        rejectionReason: rejectionReason || "",
        respondedAt: new Date(),
      },
      session
    );
  }
}

export default new ExtraChargeRepository();
