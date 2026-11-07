import axiosInstance from "../axiosInstance";
import { createMasterApi } from "./createMasterApi";

/**
 * Base employer API (inherits getAll, getById, create, update, etc.
 * from the generic master API factory).
 */
const baseApi = createMasterApi("Employer");

/**
 * Employer 
 
 */
const employerApi = {
  ...baseApi,

  // PUT /api/Employer/{id}
  update: (id, payload) => axiosInstance.put(`/Employer/${id}`, payload),

  toggleActive: (id, isActive) =>
    axiosInstance.patch(
      `/Employer/${id}/active-status`,
      null,
      {
        params: { isActive },
      }
    ),

      // GET /api/Employer/dashboard — aggregated counts for stat cards
  getDashboard: () => axiosInstance.get("/Employer/dashboard"),
};

export default employerApi;
