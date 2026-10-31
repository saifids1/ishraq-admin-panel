
import axiosInstance from "../axiosInstance";

// =====================================
// GET ALL JD BY ADMIN
// GET: api/JDByAdmin
// =====================================
export const getAllJDByAdmin = async () => {
  const response = await axiosInstance.get("/JDByAdmin");
  return response.data;
};

// =====================================
// GET JD BY ID
// GET: api/JDByAdmin/{id}
// =====================================
export const getJDByAdminById = async (id) => {
  const response = await axiosInstance.get(`/JDByAdmin/${id}`);
  return response.data;
};

// =====================================
// CREATE JD BY ADMIN
// POST: api/JDByAdmin
// =====================================
export const createJDByAdmin = async (payload) => {
  const response = await axiosInstance.post("/JDByAdmin", payload);
  return response.data;
};

// =====================================
// UPDATE JD BY ADMIN
// PUT: api/JDByAdmin/{id}
// =====================================
export const updateJDByAdmin = async (id, payload) => {
  const response = await axiosInstance.put(
    `/JDByAdmin/${id}`,
    payload
  );

  return response.data;
};

// =====================================
// ACTIVE / INACTIVE STATUS
// PATCH: api/JDByAdmin/{id}/active-status
// =====================================
export const updateJDByAdminActiveStatus = async (
  id,
  isActive,
  updatedById = null
) => {
  const response = await axiosInstance.patch(
    `/JDByAdmin/${id}/active-status`,
    null,
    {
      params: {
        isActive,
        ...(updatedById !== null && { updatedById }),
      },
    }
  );

  return response.data;
};

// =====================================
// DELETE JD BY ADMIN
// DELETE: api/JDByAdmin/{id}
// =====================================
export const deleteJDByAdmin = async (id) => {
  const response = await axiosInstance.delete(
    `/JDByAdmin/${id}`
  );

  return response.data;
};
