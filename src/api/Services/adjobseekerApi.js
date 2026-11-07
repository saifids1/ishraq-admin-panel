import axiosInstance from "../axiosInstance";
import { createMasterApi } from "./createMasterApi";

/**
 * Base jobseeker API (inherits getAll, getById, update, getAllList).
 */
const baseApi = createMasterApi("Jobseeker");


const jobseekerApi = {
  ...baseApi,

  // GET /api/Jobseeker/list (complete job seeker list for admin workflows)
  getList: () => axiosInstance.get("/Jobseeker/list"),

  // GET /api/Jobseeker/{id}
  getById: (id) => axiosInstance.get(`/Jobseeker/${id}`),

  // PUT /api/Jobseeker/{id} (multipart/form-data)
  update: (id, formData) =>
    axiosInstance.put(`/Jobseeker/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

    
  // GET /api/Jobseeker/dashboard — aggregated counts for stat cards
  getDashboard: () => axiosInstance.get("/Jobseeker/dashboard"),

  /**
   * Create jobseeker

   */
  create: (formData) =>
    axiosInstance.post(`/Jobseeker`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  toggleActive: (id, isActive) =>
    axiosInstance.patch(
      `/Jobseeker/${id}/active`,
      null,
      {
        params: isActive != null ? { isActive } : {},
      }
    ),
};

export default jobseekerApi;
