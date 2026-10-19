import axiosInstance from "../axiosInstance";
import { createMasterApi } from "./createMasterApi";

/**
 * Base jobseeker API (inherits getAll, getById, update, getAllList).
 */
const baseApi = createMasterApi("Jobseeker");


const jobseekerApi = {
  ...baseApi,

  // GET /api/Jobseeker/{id}
  getById: (id) => axiosInstance.get(`/Jobseeker/${id}`),

  // PUT /api/Jobseeker/{id} (multipart/form-data)
  update: (id, formData) =>
    axiosInstance.put(`/Jobseeker/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  /**
   * Create jobseeker
   * POST /api/Jobseeker (multipart/form-data — includes the CV file)
   *
   * IMPORTANT: the shared axiosInstance defaults Content-Type to
   * application/json, and axios converts FormData into a JSON string when
   * that header is present (see axios defaults.transformRequest /
   * formDataToJSON). That would drop the CVFile and send JSON instead of
   * multipart. Overriding the header per-request lets the browser send the
   * FormData body with the proper multipart boundary, exactly like the
   * Swagger curl does.
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
