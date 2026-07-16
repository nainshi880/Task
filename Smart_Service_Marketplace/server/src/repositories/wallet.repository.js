import mongoose from "mongoose";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import {
  WALLET_TX_TYPE,
  WALLET_TX_CATEGORY,
  WALLET_TX_STATUS,
} from "../constants/walletTransaction.js";

class WalletRepository {
  async findByCustomer(customerId, session = null) {
    const query = Wallet.findOne({ customer: customerId });
    if (session) query.session(session);
    return await query;
  }

  async findById(walletId, session = null) {
    const query = Wallet.findById(walletId);
    if (session) query.session(session);
    return await query;
  }

  async create(customerId, session = null) {
    const docs = await Wallet.create(
      [{ customer: customerId, balance: 0 }],
      session ? { session } : undefined
    );
    return docs[0];
  }

  async getOrCreate(customerId, session = null) {
    let wallet = await this.findByCustomer(customerId, session);
    if (!wallet) {
      try {
        wallet = await this.create(customerId, session);
      } catch (error) {
        if (error?.code === 11000) {
          wallet = await this.findByCustomer(customerId, session);
        } else {
          throw error;
        }
      }
    }
    return wallet;
  }

  async updateBalance(walletId, update, session = null) {
    const opts = { new: true, runValidators: true };
    if (session) opts.session = session;
    return await Wallet.findByIdAndUpdate(walletId, update, opts);
  }

  async atomicCredit(walletId, amount, session = null) {
    const opts = { new: true, runValidators: true };
    if (session) opts.session = session;

    return await Wallet.findOneAndUpdate(
      { _id: walletId, isActive: true },
      {
        $inc: { balance: amount, totalCredited: amount },
        $set: { lastTransactionAt: new Date() },
      },
      opts
    );
  }

  async atomicDebit(walletId, amount, session = null) {
    const opts = { new: true, runValidators: true };
    if (session) opts.session = session;

    return await Wallet.findOneAndUpdate(
      {
        _id: walletId,
        isActive: true,
        balance: { $gte: amount },
      },
      {
        $inc: { balance: -amount, totalDebited: amount },
        $set: { lastTransactionAt: new Date() },
      },
      opts
    );
  }

  async createTransaction(data, session = null) {
    const docs = await WalletTransaction.create(
      [data],
      session ? { session } : undefined
    );
    return docs[0];
  }

  async findTransactionByReference(referenceId) {
    return await WalletTransaction.findOne({ referenceId });
  }

  async findTransactionByPayment(paymentId) {
    return await WalletTransaction.findOne({
      payment: paymentId,
      category: WALLET_TX_CATEGORY.RECHARGE,
      status: WALLET_TX_STATUS.COMPLETED,
    });
  }

  async listTransactions(
    customerId,
    {
      page = 1,
      limit = 10,
      type,
      category,
      status,
      from,
      to,
    } = {}
  ) {
    const filter = { customer: customerId };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      WalletTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("booking", "serviceName serviceCategory amount status paymentStatus")
        .populate("payment", "razorpayOrderId razorpayPaymentId status amount purpose"),
      WalletTransaction.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getHistorySummary(customerId) {
    const customerObjectId =
      typeof customerId === "string"
        ? new mongoose.Types.ObjectId(customerId)
        : customerId;

    return await WalletTransaction.aggregate([
      {
        $match: {
          customer: customerObjectId,
          status: WALLET_TX_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
  }

  async findBookingForWalletPay(bookingId, customerId) {
    return await Booking.findOne({
      _id: bookingId,
      customer: customerId,
    });
  }

  async updateBookingPaymentStatus(bookingId, paymentStatus, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return await Booking.findByIdAndUpdate(
      bookingId,
      { paymentStatus },
      opts
    );
  }

  async createPaymentRecord(data, session = null) {
    const docs = await Payment.create(
      [data],
      session ? { session } : undefined
    );
    return docs[0];
  }

  async findPaymentByOrderId(razorpayOrderId) {
    return await Payment.findOne({ razorpayOrderId });
  }

  async findBookingById(bookingId) {
    return await Booking.findById(bookingId).populate(
      "customer",
      "name email"
    );
  }
}

export default new WalletRepository();
export {
  WALLET_TX_TYPE,
  WALLET_TX_CATEGORY,
  WALLET_TX_STATUS,
};
