import * as employeeRepository from "../repositories/employee.repository.js";

export const createEmployee = async (employeeData) => {
  return await employeeRepository.createEmployee(employeeData);
};

export const getEmployees = async () => {
  return await employeeRepository.getEmployees();
};

export const getEmployeeById = async (id) => {
  return await employeeRepository.getEmployeeById(id);
};

export const updateEmployee = async (id, employeeData) => {
  return await employeeRepository.updateEmployee(id, employeeData);
};

export const deleteEmployee = async (id) => {
  return await employeeRepository.deleteEmployee(id);
};