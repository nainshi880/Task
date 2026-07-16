import express from "express";

import healthRoutes from "./health.routes.js";
import customerRoutes from "./customer.routes.js";
import authRoutes from "./auth.routes.js";

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

export default router;