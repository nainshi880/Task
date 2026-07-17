import buildInvoicePdfBuffer from "../utils/invoicePdf.js";
import emailService from "./email.service.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";
import { INVOICE_STATUS, DEFAULT_GST_RATE } from "../constants/invoice.js";
import env from "../config/env.js";
import withTransaction from "../utils/transaction.js";
import invoiceRepository from "../repositories/invoice.repository.js";
import { getNextInvoiceNumber } from "../models/Counter.js";
import calculateGstBreakdown from "../utils/gst.js";
import platformSettingsService from "./platformSettings.service.js";

class InvoiceService {
  async getSellerInfo() {
    const settings = await platformSettingsService.getSettings();
    return platformSettingsService.getSellerInfo(settings);
  }

  resolveAddress(profile, addressId) {
    if (!profile?.addresses?.length) return null;

    if (addressId) {
      const match = profile.addresses.id(addressId);
      if (match) return match;
    }

    return (
      profile.addresses.find((a) => a.isDefault) || profile.addresses[0]
    );
  }

  formatAddressLine(address) {
    if (!address) return "";
    return [address.street, address.city, address.state, address.postalCode]
      .filter(Boolean)
      .join(", ");
  }

  // ======================================
  // Generate Invoice
  // ======================================

  async generateInvoice(requester, { bookingId, gstRate, notes }) {
    const booking =
      await invoiceRepository.findBookingWithCustomer(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    const customerId = booking.customer._id || booking.customer;
    const isAdmin = requester.role === "admin";
    const isOwner =
      customerId.toString() === requester._id.toString();

    if (!isAdmin && !isOwner) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You cannot generate an invoice for this booking."
      );
    }

    if (booking.paymentStatus !== "Paid") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invoice can only be generated for paid bookings."
      );
    }

    if (!booking.amount || booking.amount <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Booking amount must be greater than 0 to generate an invoice."
      );
    }

    const existing = await invoiceRepository.findByBooking(bookingId);
    if (existing) {
      return {
        alreadyExists: true,
        invoice: existing,
      };
    }

    const profile = await invoiceRepository.findCustomerProfile(customerId);
    const address = this.resolveAddress(profile, booking.address);
    const payment =
      await invoiceRepository.findLatestPaidPayment(bookingId);

    const seller = await this.getSellerInfo();
    const settings = await platformSettingsService.getSettings();
    const customerState = address?.state || booking.customer?.city || "";
    const rate =
      gstRate !== undefined && gstRate !== null
        ? Number(gstRate)
        : platformSettingsService.getDefaultGstRate(settings);

    const gst = calculateGstBreakdown({
      amount: booking.amount,
      gstRate: rate,
      customerState,
      companyState: seller.state,
    });

    const invoice = await withTransaction(async (session) => {
      const invoiceNumber = await getNextInvoiceNumber(session);

      return await invoiceRepository.create(
        {
          invoiceNumber,
          booking: booking._id,
          payment: payment?._id || null,
          customer: customerId,
          status: INVOICE_STATUS.ISSUED,
          issuedAt: new Date(),
          seller,
          billTo: {
            name:
              profile?.fullName ||
              booking.customer?.name ||
              "Customer",
            email: booking.customer?.email || "",
            phone: profile?.phone || booking.customer?.phone || "",
            address: address?.street || "",
            city: address?.city || "",
            state: address?.state || "",
            postalCode: address?.postalCode || "",
          },
          serviceDetails: {
            serviceName: booking.serviceName,
            serviceCategory: booking.serviceCategory,
            description: booking.description || "",
            bookingDate: booking.bookingDate,
            bookingTime: booking.bookingTime,
          },
          taxableAmount: gst.taxableAmount,
          gstRate: gst.gstRate,
          gstType: gst.gstType,
          cgstRate: gst.cgstRate,
          sgstRate: gst.sgstRate,
          igstRate: gst.igstRate,
          cgstAmount: gst.cgstAmount,
          sgstAmount: gst.sgstAmount,
          igstAmount: gst.igstAmount,
          totalTax: gst.totalTax,
          totalAmount: gst.totalAmount,
          currency: "INR",
          taxBreakdown: gst.taxBreakdown,
          paymentMethod: payment?.method || null,
          paymentStatus: booking.paymentStatus,
          notes: notes || "",
        },
        session
      );
    });

    const populated = await invoiceRepository.findById(invoice._id);

    return {
      alreadyExists: false,
      invoice: populated,
      taxBreakdown: gst.taxBreakdown,
    };
  }

  // ======================================
  // Get / List
  // ======================================

  async getInvoice(requester, invoiceId) {
    const invoice = await invoiceRepository.findById(invoiceId);

    if (!invoice) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Invoice not found.");
    }

    this.assertCanAccess(requester, invoice);
    return invoice;
  }

  async getInvoiceByBooking(requester, bookingId) {
    const invoice = await invoiceRepository.findByBooking(bookingId);

    if (!invoice) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Invoice not found for this booking."
      );
    }

    this.assertCanAccess(requester, invoice);
    return invoice;
  }

  async listInvoices(requester, query = {}) {
    const page = Number(query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      Number(query.limit) || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT
    );

    let result;
    if (requester.role === "admin") {
      result = await invoiceRepository.listAll({
        page,
        limit,
        status: query.status,
        customerId: query.customerId,
      });
    } else {
      result = await invoiceRepository.findByCustomer(requester._id, {
        page,
        limit,
        status: query.status,
      });
    }

    return {
      items: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    };
  }

  assertCanAccess(requester, invoice) {
    if (requester.role === "admin") return;

    const customerId = invoice.customer._id || invoice.customer;
    if (customerId.toString() !== requester._id.toString()) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
    }
  }

  // ======================================
  // Download PDF
  // ======================================

  async downloadInvoicePdf(requester, invoiceId) {
    const invoice = await this.getInvoice(requester, invoiceId);
    const pdfBuffer = await buildInvoicePdfBuffer(invoice.toObject());

    return {
      buffer: pdfBuffer,
      filename: `${invoice.invoiceNumber}.pdf`,
      invoice,
    };
  }

  // ======================================
  // Email Invoice
  // ======================================

  async emailInvoice(requester, invoiceId, { to } = {}) {
    const invoice = await this.getInvoice(requester, invoiceId);
    const recipient =
      to ||
      invoice.billTo?.email ||
      invoice.customer?.email;

    if (!recipient) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "No email address available for this invoice."
      );
    }

    if (!env.EMAIL_HOST || !env.EMAIL_USER) {
      throw new ApiError(
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        "Email is not configured. Set EMAIL_HOST and EMAIL_USER."
      );
    }

    const pdfBuffer = await buildInvoicePdfBuffer(invoice.toObject());

    const result = await emailService.sendInvoice({
      user: invoice.customer,
      invoice,
      pdfBuffer,
      to: recipient,
    });

    if (!result.sent) {
      if (result.reason === "not_configured") {
        throw new ApiError(
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          "Email is not configured. Set EMAIL_HOST and EMAIL_USER."
        );
      }
      throw new ApiError(
        HTTP_STATUS.BAD_GATEWAY,
        "Failed to send invoice email. Please try again later."
      );
    }

    const updated = await invoiceRepository.updateById(invoice._id, {
      $set: { emailedAt: new Date() },
      $inc: { emailCount: 1 },
    });

    return {
      emailed: true,
      to: recipient,
      invoice: updated,
    };
  }

  // ======================================
  // Tax preview (optional helper)
  // ======================================

  async previewGst({ amount, gstRate, customerState }) {
    const seller = await this.getSellerInfo();
    const settings = await platformSettingsService.getSettings();

    return calculateGstBreakdown({
      amount,
      gstRate:
        gstRate ?? platformSettingsService.getDefaultGstRate(settings),
      customerState: customerState || "",
      companyState: seller.state,
    });
  }
}

export default new InvoiceService();
