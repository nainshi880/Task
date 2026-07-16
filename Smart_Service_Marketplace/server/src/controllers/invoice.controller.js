import invoiceService from "../services/invoice.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const generateInvoice = asyncHandler(async (req, res) => {
  const result = await invoiceService.generateInvoice(req.user, req.body);

  res.status(result.alreadyExists ? HTTP_STATUS.OK : HTTP_STATUS.CREATED).json(
    new ApiResponse(
      result.alreadyExists ? HTTP_STATUS.OK : HTTP_STATUS.CREATED,
      result.alreadyExists
        ? "Invoice already exists for this booking."
        : "Invoice generated successfully.",
      result
    )
  );
});

export const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoice(
    req.user,
    req.params.invoiceId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Invoice fetched successfully.", invoice)
  );
});

export const getInvoiceByBooking = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceByBooking(
    req.user,
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Invoice fetched successfully.",
      invoice
    )
  );
});

export const listInvoices = asyncHandler(async (req, res) => {
  const result = await invoiceService.listInvoices(req.user, req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Invoices fetched successfully.",
      result
    )
  );
});

export const downloadInvoicePdf = asyncHandler(async (req, res) => {
  const { buffer, filename } = await invoiceService.downloadInvoicePdf(
    req.user,
    req.params.invoiceId
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  res.setHeader("Content-Length", buffer.length);
  res.status(HTTP_STATUS.OK).send(buffer);
});

export const emailInvoice = asyncHandler(async (req, res) => {
  const result = await invoiceService.emailInvoice(
    req.user,
    req.params.invoiceId,
    req.body
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Invoice emailed successfully.",
      result
    )
  );
});

export const previewGst = asyncHandler(async (req, res) => {
  const breakdown = invoiceService.previewGst(req.body);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "GST breakdown calculated successfully.",
      breakdown
    )
  );
});
