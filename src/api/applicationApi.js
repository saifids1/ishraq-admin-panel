import axiosInstance from "./axiosInstance";

const applicationApi = {
  // Apply for a job
  applyForJob: (payload) =>
    axiosInstance.post("/Application", payload),

  // Get application details by application ID
  getById: (id) =>
    axiosInstance.get(`/Application/${id}`),

  // Get paginated applications for a jobseeker
  getAppliedJobs: (jobseekerId, pageNo = 1, pageSize = 10) =>
    axiosInstance.get("/Application", {
      params: {
        jonseekerId: jobseekerId,
        pageNo,
        pageSize,
      },
    }),

  // Get all applications (not paginated)
  getAll: () =>
    axiosInstance.get("/Application/all"),

  // Update application remarks/status fields supported by the DTO
  update: (payload) =>
    axiosInstance.put("/Application", payload),

  // Toggle application active status
  toggleActive: (id, updatedBy) =>
    axiosInstance.patch(`/Application/${id}/toggle-active`, null, {
      params: updatedBy != null ? { updatedBy } : {},
    }),
};

export default applicationApi;