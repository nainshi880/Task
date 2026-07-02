import * as employeeService from "../services/employee.service.js";

export const createEmployee = async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);

  res.status(201).json(employee);
};

export const getEmployees = async (req, res) => {
  const employees = await employeeService.getEmployees();

  res.status(200).json(employees);
};

export const getEmployeeById = async (req, res) => {
  const employee = await employeeService.getEmployeeById(req.params.id);

  res.status(200).json(employee);
};

export const updateEmployee = async (req, res) => {
  const employee = await employeeService.updateEmployee(
    req.params.id,
    req.body
  );

  res.status(200).json(employee);
};

export const deleteEmployee = async (req, res) => {
  await employeeService.deleteEmployee(req.params.id);

  res.status(200).json({
    message: "Employee Deleted Successfully",
  });
};