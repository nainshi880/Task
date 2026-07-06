import express from "express";

import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employee.controller.js";

import { validateEmployee } from "../middlewares/validation.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { uploadProfileImage } from "../controllers/employee.controller.js";


const router = express.Router();

// create Employee
router.post("/",  validateEmployee,createEmployee);

// get all Employees
router.get("/", getEmployees);

// get Employee by ID
router.get("/:id", getEmployeeById);

// update Employee
router.put("/:id", validateEmployee, updateEmployee);

// delete Employee
router.delete("/:id", deleteEmployee);


// Upload Profile Image

router.patch(
  "/:id/profile-image",
  upload.single("image"),
  uploadProfileImage
);

export default router;