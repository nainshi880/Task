import express from "express";

import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employee.controller.js";

import { validateEmployee } from "../middleware/validation.middleware.js";

const router = express.Router();

router.post("/",  validateEmployee,createEmployee);

router.get("/", getEmployees);

router.get("/:id", getEmployeeById);

router.put("/:id", validateEmployee, updateEmployee);

router.delete("/:id", deleteEmployee);

router.post(
  "/upload",
  upload.single("image"),
  uploadProfileImage
);

export default router;