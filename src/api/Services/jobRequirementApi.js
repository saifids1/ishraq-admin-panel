import axiosInstance from "../axiosInstance";

const jobRequirementApi = {
  getAll: (params = {}) =>
    axiosInstance.get("/JobRequirement", {
      params,
    }),

  getAllList: () => axiosInstance.get("/JobRequirement/list"),

  getById: (id) => axiosInstance.get(`/JobRequirement/${id}`),

  getByEmployerId: (employerId) =>
    axiosInstance.get(`/JobRequirement/employer/${employerId}`),

  create: (formData) =>
    axiosInstance.post("/JobRequirement", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  update: (id, formData) =>
    axiosInstance.put(`/JobRequirement/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  toggleActive: (id, isActive) =>
    axiosInstance.patch(`/JobRequirement/${id}/active`, null, {
      params: { isActive },
    }),

  updateStatusAndDeadline: (id, payload) =>
    axiosInstance.put(`/JobRequirement/${id}/status-deadline`, payload),

    // GET /api/JobRequirement/dashboard — aggregated counts for stat cards
  getDashboard: () => axiosInstance.get("/JobRequirement/dashboard"),

};

export default jobRequirementApi;
