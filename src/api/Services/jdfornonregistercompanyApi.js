
import axiosInstance from "../axiosInstance";

/* -------------------------------------------------
   CONVERT OBJECT TO MULTIPART FORMDATA
------------------------------------------------- */

const toFormData = (data = {}) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    // Skip null and undefined values
    if (value === null || value === undefined) return;

    // File / Blob attachment
    if (value instanceof Blob) {
      if (value instanceof File && value.name) {
        formData.append(key, value, value.name);
      } else {
        formData.append(key, value);
      }
      return;
    }

    // Date values
    if (value instanceof Date) {
      formData.append(key, value.toISOString());
      return;
    }

    // Boolean values
    if (typeof value === "boolean") {
      formData.append(key, value ? "true" : "false");
      return;
    }

    // Numbers and strings
    formData.append(key, String(value));
  });

  return formData;
};

/* -------------------------------------------------
   MULTIPART REQUEST CONFIG
------------------------------------------------- */

const multipartConfig = {
  headers: {
    Accept: "application/json",
    "Content-Type": "multipart/form-data",
  },
};

/* -------------------------------------------------
   JOB DESCRIPTION API
------------------------------------------------- */

const jdfornonregistercompanyApi = {

  // GET ALL JOB DESCRIPTIONS
  getJobDescription: async ({
    pageNo,
    pageNumber,
    pageSize,
    search,
    isActive,
    JQ_is_CreatedByAdmin = true,
    JQ_employer_id = null,
  } = {}) => {

    const response = await axiosInstance.get(
      "/admin/job-descriptions",
      {
        params: {
          PageNo: pageNo,
          PageNumber: pageNumber,
          PageSize: pageSize,
          Search: search,
          IsActive: isActive,
          JQ_is_CreatedByAdmin,
          JQ_employer_id,
        },
      }
    );

    return response.data;
  },

  // GET JOB DESCRIPTION BY ID
  getJobDescriptionById: async (id) => {

    const response = await axiosInstance.get(
      `/admin/job-descriptions/${id}`
    );

    return response.data;
  },

  // CREATE JOB DESCRIPTION
  // POST /api/admin/job-descriptions
  // Content-Type: multipart/form-data
  createJobDescription: async (payload) => {

    const formData = toFormData(payload);

    const response = await axiosInstance.post(
      "/admin/job-descriptions",
      formData,
      multipartConfig
    );

    return response.data;
  },

  // UPDATE JOB DESCRIPTION
  // PUT /api/admin/job-descriptions/{id}
  updateJobDescription: async (id, payload) => {

    const formData = toFormData(payload);

    const response = await axiosInstance.put(
      `/admin/job-descriptions/${id}`,
      formData,
      multipartConfig
    );

    return response.data;
  },

};

export default jdfornonregistercompanyApi;
