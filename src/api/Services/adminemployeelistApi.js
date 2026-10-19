import axiosInstance from "../axiosInstance";
import { createMasterApi } from "./createMasterApi";

/**
 * Base employer API (inherits getAll, getById, create, update, etc.
 * from the generic master API factory).
 */
const baseApi = createMasterApi("Employer");

/**
 * Employer API — extends the base with an explicit `toggleActive` method.
 *
 * Endpoint (verified against the working curl):
 *   PATCH /api/Employer/{id}/active-status?isActive=true
 *
 * `isActive` is sent as a query-string parameter.
 * The request body is intentionally null — the endpoint takes no payload,
 * which matches the curl (it sends no body either).
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
};

export default employerApi;
