import Employee from "../models/employee.model.js";

export const createEmployee = async (employeeData) => {
  return await Employee.create(employeeData);
}

export const getEmployees = async () => {
  return await Employee.find();
};

export const getEmployeeById = async (id) => {
  return await Employee.findById(id);
};

export const updateEmployee = async (id, employeeData) => {
  return await Employee.findByIdAndUpdate(id, employeeData, {
    new: true,
  });
};

export const deleteEmployee = async (id) => {
  return await Employee.findByIdAndDelete(id);
};