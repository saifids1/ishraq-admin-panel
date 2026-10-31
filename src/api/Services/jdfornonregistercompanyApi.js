import axiosInstance from "../axiosInstance";

// GET ALL JD BY ADMIN
export const getAllJDByAdmin = async () => {
  const response = await axiosInstance.get("/JDByAdmin");
  return response.data;
};

// GET JD BY ID
export const getJDByAdminById = async (id) => {
  const response = await axiosInstance.get(`/JDByAdmin/${id}`);
  return response.data;
};

// CREATE JD BY ADMIN
export const createJDByAdmin = async (payload) => {
  const response = await axiosInstance.post("/JDByAdmin", payload);
  return response.data;
};

// UPDATE JD BY ADMIN
export const updateJDByAdmin = async (id, payload) => {
  const response = await axiosInstance.put(`/JDByAdmin/${id}`, payload);
  return response.data;
};

// DELETE JD BY ADMIN
export const deleteJDByAdmin = async (id) => {
  const response = await axiosInstance.delete(`/JDByAdmin/${id}`);
  return response.data;
};