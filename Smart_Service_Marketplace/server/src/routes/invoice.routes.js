import express from "express";

import {
  generateInvoice,
  getInvoice,
  getInvoiceByBooking,
  listInvoices,
  downloadInvoicePdf,
  emailInvoice,
  previewGst,
} from "../controllers/invoice.controller.js";

import {
  generateInvoiceValidation,
  invoiceIdValidation,
  bookingIdParamValidation,
  emailInvoiceValidation,
  listInvoicesValidation,
  previewGstValidation,
} from "../validations/invoice.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/*
=====================================
GST Preview
=====================================
*/

router.post(
  "/gst/preview",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  previewGstValidation,
  validate,
  previewGst
);

/*
=====================================
Generate / List
=====================================
*/

router.post(
  "/generate",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  generateInvoiceValidation,
  validate,
  generateInvoice
);

router.get(
  "/",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  listInvoicesValidation,
  validate,
  listInvoices
);

router.get(
  "/booking/:bookingId",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  bookingIdParamValidation,
  validate,
  getInvoiceByBooking
);

router.get(
  "/:invoiceId/download",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  invoiceIdValidation,
  validate,
  downloadInvoicePdf
);

router.post(
  "/:invoiceId/email",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  emailInvoiceValidation,
  validate,
  emailInvoice
);

router.get(
  "/:invoiceId",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  invoiceIdValidation,
  validate,
  getInvoice
);

export default router;
