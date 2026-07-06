import * as employeeService from "../services/employee.service.js";
import cloudinary from "../config/cloudinary.js";
import asyncHandler from "express-async-handler";

// create Employee
export const createEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);

  res.status(201).json({
     success: true,
    message: "Employee created successfully.",
    data: employee,
  });
});

// get all Employees

export const getEmployees = asyncHandler(async (req, res) => {
  const employees = await employeeService.getEmployees();

  res.status(200).json({
    success: true,
    message: "Employees retrieved successfully.",
    count: employees.length,
    data: employees,
  });
});

// get Employee by ID

export const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployeeById(req.params.id);

  res.status(200).json({
    success: true,
    message: "Employee retrieved successfully.",
    data: employee,
  });
});

// update Employee

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.updateEmployee(
    req.params.id,
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Employee updated successfully.",
    data: employee,
  });
});


// Delete Employee

export const deleteEmployee = asyncHandler(async (req, res) => {
  await employeeService.deleteEmployee(req.params.id);

  res.status(200).json({
    success: true,
    message: "Employee Deleted Successfully",
  });
});

// Upload Profile Image

export const uploadProfileImage = asyncHandler(async (req, res) => {

   if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please upload an image.",
    });
  }
   
  // console.log(req.file);
  //  const result = await cloudinary.uploader.upload(req.file.path);
  try {
  const result = await cloudinary.uploader.upload(req.file.path, {
    resource_type: "image",
  });

  console.log(result);

  return res.json(result);

} catch (err) {
  console.log("FULL ERROR");
  console.dir(err, { depth: null });

  return res.status(500).json(err);  
}
    
   const employee = await employeeService.updateProfileImage(
    req.params.id,
    result.secure_url
  );

   res.status(200).json({
     success: true,
     message: "Profile image uploaded successfully.",
     data: {
       imageUrl: result.secure_url
     }
   });

});