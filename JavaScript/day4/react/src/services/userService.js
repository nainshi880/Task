import api from "./api";

export const getUsers = async () => {
  const res = await api.get("/users");
  return res.data;
}

export const getUsersById = async (id) => {
  const res = await api.get(`/users/${id}`);
  return res.data;
};

export const createUsers = async (userData) => {
  const res = await api.post("/users", userData);
  return res.data;
}

export const updateUser = async (id, userData) => {
  const res = await api.put("/users", userData);
  return res.data;
};

export const deleteUser = async (id) => {
  const res = await api.delete(`/users/${id}`);
  return res.data;
};




