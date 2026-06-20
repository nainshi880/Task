import api from "./api"

export const getEmployees = async () => {
  const res = await api.get("/employees");
  return res.data;
}

export const getEmployeeById = async (id) => {
  const res = await api.get(`/employees/${id}`);
  return res.data;
}

export const createEmployee = async (employeeData) => {
  const res = await api.post("/employees", employeeData);
  return res.data;
}
 export const updateEmployee = async (id, employeeData) => {
  const res = await api.put(`/employees/${id}`, employeeData);
  return res.data;
 }

 export const deleteEmployee = async (id) => {
  const res = await api.delete(`/employees/${id}`);
  return res.data;
 };