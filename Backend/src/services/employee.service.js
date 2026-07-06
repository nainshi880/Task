import * as employeeRepository from "../repositories/employee.repository.js";
import ApiError from "../errors/ApiError.js";  

// create Employee

export const createEmployee = async (employeeData) => {
  return await employeeRepository.createEmployee(employeeData);

   if (existingEmployee) {
    throw new ApiError(
      409,
      "Employee with this email already exists."
    );
  }

  return await employeeRepository.createEmployee(
    employeeData
  );

};

// get all Employees

export const getEmployees = async () => {
  return await employeeRepository.getEmployees();
};

// get Employee by ID

export const getEmployeeById = async (id) => {
  return await employeeRepository.getEmployeeById(id);

    if (!employee) {
    throw new ApiError(
      404,
      "Employee not found."
    );
  }

  return employee;
};

// update Employee

export const updateEmployee = async (id, employeeData) => {
  return await employeeRepository.updateEmployee(id, employeeData);

   if (!employee) {
    throw new ApiError(
      404,
      "Employee not found."
    );
  }

  return await employeeRepository.updateEmployee(
    id,
    employeeData
  );
};

export const deleteEmployee = async (id) => {
  return await employeeRepository.deleteEmployee(id);
  if (!employee) {
    throw new ApiError(
      404,
      "Employee not found."
    );
  }
};

 