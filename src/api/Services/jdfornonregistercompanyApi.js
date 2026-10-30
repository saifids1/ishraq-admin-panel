import axiosInstance from "../axiosInstance";

// Converts a plain object into FormData for multipart requests.
// - null/undefined values are skipped so optional fields aren't sent
// - Date values are sent as ISO strings
// - File/Blob values (e.g. Attachment) are appended as-is
const toFormData = (data = {}) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (value instanceof Date) {
      formData.append(key, value.toISOString());
    } else {
      formData.append(key, value);
    }
  });

  return formData;
};

const jdfornonregistercompanyApi = {
  getJobDescription: async ({
    pageNo,
    pageNumber,
    pageSize,
    search,
    isActive,
    JQ_is_CreatedByAdmin = true,
    JQ_employer_id = null,
  } = {}) => {
    const response = await axiosInstance.get("/admin/job-descriptions", {
      params: {
        PageNo: pageNo,
        PageNumber: pageNumber,
        PageSize: pageSize,
        Search: search,
        IsActive: isActive,
        JQ_is_CreatedByAdmin,
        JQ_employer_id,
      },
    });
    return response.data;
  },

  getJobDescriptionById: async (id) => {
    const response = await axiosInstance.get(`/admin/job-descriptions/${id}`);
    return response.data;
  },

  createJobDescription: async (payload) => {
    const response = await axiosInstance.post(
      "/admin/job-descriptions",
      toFormData(payload),
    );
    return response.data;
  },

  updateJobDescription: async (id, payload) => {
    const response = await axiosInstance.put(
      `/admin/job-descriptions/${id}`,
      toFormData(payload),
    );
    return response.data;
  },
};

export default jdfornonregistercompanyApi;
