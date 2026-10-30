import axiosInstance from "./axiosInstance";

const API = "/JobRequirement";

/* ======================== GET ALL / PAGINATION + FILTERS ======================== */

export const getJobRequirements = async (filters = {}) => {
  const response = await axiosInstance.get(API, {
    params: filters,
  });

  return response.data;
};

/* ======================== GET EMPLOYER JOB REQUIREMENTS WITH PAGINATION ======================== */

/* ======================== EMPLOYER JOB REQUIREMENTS WITH PAGINATION ======================== */

export const getEmployerJobRequirementsPaginated = async (
  employerId,
  { pageNo = 1, pageSize = 10 } = {},
) => {
  if (!employerId) {
    throw new Error("Employer ID is required.");
  }

  const response = await axiosInstance.get(API, {
    params: {
      employerid: employerId,
      pageNo,
      pageSize,
    },
  });

  return response.data;
};

/* ======================== GET ALL LIST ======================== */

export const getAllJobRequirementsList = async () => {
  const response = await axiosInstance.get(`${API}/list`);

  return response.data;
};

/* ======================== GET BY ID ======================== */

export const getJobRequirementById = async (id) => {
  const response = await axiosInstance.get(`${API}/${id}`);

  return response.data;
};

/* ======================== GET BY EMPLOYER ID (UNPAGINATED) ======================== */

export const getJobRequirementsByEmployer = async (employerId) => {
  if (!employerId) {
    throw new Error("Employer ID is required.");
  }

  const response = await axiosInstance.get(`${API}/employer/${employerId}`);

  return response.data;
};

/* ======================== CREATE ======================== */

export const createJobRequirement = async (formData) => {
  const response = await axiosInstance.post(API, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

/* ======================== UPDATE ======================== */

export const updateJobRequirement = async (id, formData) => {
  const response = await axiosInstance.put(`${API}/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

/* ======================== ACTIVATE / DEACTIVATE ======================== */

export const toggleJobRequirementActive = async (id, isActive) => {
  const response = await axiosInstance.patch(`${API}/${id}/active`, null, {
    params: { isActive },
  });

  return response.data;
};

/* ======================== UPDATE STATUS AND DEADLINE ======================== */

export const updateJobRequirementStatusAndDeadline = async (id, payload) => {
  const response = await axiosInstance.put(
    `${API}/${id}/status-deadline`,
    payload,
  );

  return response.data;
};


/* ======================== GET APPLICANTS BY JOB REQUIREMENT ======================== */

export const getApplications = async (
  jobdescId,
  { pageNo = 1, pageSize = 10 } = {},
) => {
  const response = await axiosInstance.get("/Application", {
    params: {
      jobdesc_Id: jobdescId,
      pageNo,
      pageSize,
    },
  });
  return response.data;
};

export const getJobsForJobseeker = async ({
  instituteTypeId,
  jobRoleId,
  jobCategoryId,
  jobseekerId,
  pageNo = 1,
  pageSize = 10,
  JQ_is_CreatedByAdmin,
}) => {
  if (!instituteTypeId || !jobRoleId || !jobCategoryId) {
    throw new Error(
      "Jobseeker institute type, job role, and category are required.",
    );
  }

  const response = await axiosInstance.get(API, {
    params: {
      JQ_institute_type_id: instituteTypeId,
      JQ_job_role_id: jobRoleId,
      JQ_job_category_id: jobCategoryId,
      jobseekerId,
      pageNo,
      pageSize,
      IsActive: true,
      JQ_is_CreatedByAdmin
    },
  });

  return response.data;
};
