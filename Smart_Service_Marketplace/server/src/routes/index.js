import express from "express";

import healthRoutes from "./health.routes.js";
import customerRoutes from "./customer.routes.js";
import authRoutes from "./auth.routes.js";
import bookingRoutes from "./booking.routes.js";
import assignmentRoutes from "./assignment.routes.js";
import technicianRoutes from "./technician.routes.js";
import bookingWorkflowRoutes from "./bookingWorkflow.routes.js";
import bookingAnalyticsRoutes from "./bookingAnalytics.routes.js";
import bookingTimelineRoutes from "./bookingTimeline.routes.js";
import paymentRoutes from "./payment.routes.js";
import walletRoutes from "./wallet.routes.js";
import invoiceRoutes from "./invoice.routes.js";
import couponRoutes from "./coupon.routes.js";
import notificationRoutes from "./notification.routes.js";
import chatRoutes from "./chat.routes.js";
import pushRoutes from "./push.routes.js";
import messagingRoutes from "./messaging.routes.js";

const router = express.Router();

/*
Health
*/

router.use(
  "/health",
  healthRoutes
);

/*
Authentication
*/

router.use(
  "/auth",
  authRoutes
);

router.use("/customer", customerRoutes);

router.use("/bookings", bookingAnalyticsRoutes);
router.use("/bookings", bookingWorkflowRoutes);
router.use("/bookings", assignmentRoutes);
router.use("/bookings", bookingTimelineRoutes);
router.use("/bookings", bookingRoutes);

router.use("/technicians", technicianRoutes);

router.use("/payments", paymentRoutes);

router.use("/wallet", walletRoutes);

router.use("/invoices", invoiceRoutes);

router.use("/coupons", couponRoutes);

router.use("/notifications", notificationRoutes);

router.use("/chat", chatRoutes);

router.use("/push", pushRoutes);

router.use("/messaging", messagingRoutes);

export default router;
