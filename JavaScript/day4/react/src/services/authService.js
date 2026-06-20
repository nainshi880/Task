import api from "./api"

export const loginUser = async (loginData) => {
  const res = await api.post("/auth/login", loginData);
  return res.data;
};

export const registerUser = async (userData) => {
  const res = await api.post("/auth/register", userData);
  return res.data;
};

export const logoutUser = () => {
  localStorage.removeItem("token");
};