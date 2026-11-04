import axiosInstance from "../axiosInstance";
import { createMasterApi } from "./createMasterApi";

const baseApi = createMasterApi("Blog");

const blogApi = {
  ...baseApi,

  // POST /api/Blog — Create blog with multipart/form-data
  create: (formData) =>
    axiosInstance.post("/Blog", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // PUT /api/Blog/{id} — Update blog with multipart/form-data
  update: (id, formData) =>
    axiosInstance.put(`/Blog/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // PATCH /api/Blog/{id}/active-status?isActive=true&updatedBy={updatedBy}
  toggleActiveStatus: (id, updatedBy, isActive) =>
    axiosInstance.patch(`/Blog/${id}/active-status`, null, {
      params: {
        isActive: isActive !== undefined ? isActive : true,
        updatedBy,
      },
    }),
};

export default blogApi;
