import axiosInstance from "../axiosInstance";

export const ENDPOINTS = {
  complaint: {
    list: "/Complaint",
    detail: "/Complaint",
    activeStatus: "/Complaint",
    file: "/Complaint",
    statusHistory: "/Complaint",
    idField: "cP_complaint_id",
  },
  career: {
    list: "/CareerEnquiry",
    detail: "/CareerEnquiry",
    activeStatus: "/CareerEnquiry",
    statusHistory: "/CareerEnquiry",
    idField: "cE_career_enquiry_id",
  },
  contact: {
    list: "/ContactEnquiry",
    detail: "/ContactEnquiry",
    activeStatus: null,
    statusHistory: "/ContactEnquiry",
    idField: "cN_contact_enquiry_id",
  },
  feedback: {
    list: "/Feedback/GetAllFeedbackPagination",
    detail: "/Feedback",
    activeStatus: null,
    statusHistory: "/Feedback",
    idField: "fB_feedback_id",
  },
};

const getEndpoints = (formType) => {
  const cfg = ENDPOINTS[formType];

  if (!cfg) {
    throw new Error(`Unknown form type: ${formType}`);
  }

  return cfg;
};

// Normalize keys such as cN_contact_enquiry_id -> CN_contact_enquiry_id.
const normalizeKeys = (obj) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }

  return Object.entries(obj).reduce((result, [key, value]) => {
    const normalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
    result[key] = value;
    result[normalizedKey] = value;
    return result;
  }, {});
};

// Supports:
// { data: [...] }
// { Data: [...] }
// { data: { items: [...] } }
// { data: { records: [...] } }
// { data: { data: [...] } }
// { data: { pageNo, pageSize, totalRecords, totalPages, data: [...] } }
const extractList = (body, fallbackPage = 1, fallbackLimit = 10) => {
  const rootHasList =
    Array.isArray(body?.data) ||
    Array.isArray(body?.Data) ||
    Array.isArray(body?.items) ||
    Array.isArray(body?.Items) ||
    Array.isArray(body?.records) ||
    Array.isArray(body?.Records);

  let payload = rootHasList ? body : body?.data ?? body?.Data ?? body;

  // Unwrap nested response objects without losing pagination metadata.
  while (
    payload &&
    !Array.isArray(payload) &&
    typeof payload === "object"
  ) {
    const nestedList =
      payload.data ??
      payload.Data ??
      payload.items ??
      payload.Items ??
      payload.records ??
      payload.Records;

    if (Array.isArray(nestedList)) {
      const pageNo =
        payload.pageNo ??
        payload.PageNo ??
        payload.pageNumber ??
        payload.PageNumber ??
        payload.page ??
        payload.Page ??
        fallbackPage;

      const pageSize =
        payload.pageSize ??
        payload.PageSize ??
        payload.limit ??
        payload.Limit ??
        fallbackLimit;

      const totalRecords =
        payload.totalRecords ??
        payload.TotalRecords ??
        payload.totalCount ??
        payload.TotalCount ??
        payload.totalItems ??
        payload.TotalItems ??
        nestedList.length;

      const totalPages =
        payload.totalPages ??
        payload.TotalPages ??
        Math.ceil(Number(totalRecords) / Math.max(1, Number(pageSize)));

      return {
        data: nestedList.map(normalizeKeys),
        pageNo: Number(pageNo),
        pageSize: Number(pageSize),
        totalRecords: Number(totalRecords),
        totalPages: Number(totalPages),
      };
    }

    break;
  }

  // Legacy APIs that return an array directly.
  if (Array.isArray(payload)) {
    return {
      data: payload.map(normalizeKeys),
      pageNo: fallbackPage,
      pageSize: fallbackLimit,
      totalRecords: payload.length,
      totalPages: Math.ceil(
        payload.length / Math.max(1, fallbackLimit),
      ),
    };
  }

  throw new Error("Unexpected response from the server.");
};

const extractOne = (body) => {
  let payload = body?.data ?? body?.Data ?? body;

  // Unwrap single-record response wrappers.
  while (
    payload &&
    !Array.isArray(payload) &&
    typeof payload === "object" &&
    (payload.data ?? payload.Data)
  ) {
    payload = payload.data ?? payload.Data;
  }

  return payload && !Array.isArray(payload)
    ? normalizeKeys(payload)
    : null;
};

export const adminEnquiryService = {
  list: async (formType, page = 1, limit = 10, search) => {
    const { list } = getEndpoints(formType);
    const params = {
      pageNo: page,
      pageSize: limit,
    };
    if (search?.trim()) params.Search = search.trim();

    const res = await axiosInstance.get(list, {
      params,
    });

    return extractList(res.data, page, limit);
  },

  getById: async (formType, id) => {
    const { detail, idField } = getEndpoints(formType);

    if (detail) {
      const res = await axiosInstance.get(`${detail}/${id}`);
      return extractOne(res.data);
    }

    const result = await adminEnquiryService.list(formType);
    const normalizedIdField =
      idField.charAt(0).toUpperCase() + idField.slice(1);

    return (
      result.data.find(
        (row) => String(row[normalizedIdField]) === String(id),
      ) ?? null
    );
  },

  setActive: async (formType, id, isActive) => {
    const { activeStatus } = getEndpoints(formType);

    if (!activeStatus) {
      throw new Error("Status change is not available for this form.");
    }

    const res = await axiosInstance.patch(
      `${activeStatus}/${id}/active-status`,
      null,
      { params: { isActive } },
    );

    return res.data;
  },

  updateCareerStatus: async (enquiryId, payload) => {
    const res = await axiosInstance.put(
      `/CareerEnquiry/${enquiryId}/status`,
      payload,
    );

    return res.data;
  },

  updateCareerResponse: async (enquiryId, responseRetun, userId) => {
    const res = await axiosInstance.patch(
      `/CareerEnquiry/${enquiryId}/UpdateResponseAsync`,
      null,
      {
        params: {
          responseRetun,
          FB_ResponseBy: userId,
        },
      },
    );

    return res.data;
  },

  updateEnquiryStatus: async (formType, enquiryId, payload) => {
    const { detail } = getEndpoints(formType);
    const res = await axiosInstance.put(`${detail}/${enquiryId}/status`, payload);
    return res.data;
  },

  updateEnquiryResponse: async (formType, enquiryId, responseRetun, userId) => {
    const { detail } = getEndpoints(formType);
    const res = await axiosInstance.patch(
      `${detail}/${enquiryId}/UpdateResponseAsync`,
      null,
      {
        params: {
          responseRetun,
          FB_ResponseBy: userId,
        },
      },
    );
    return res.data;
  },

  getStatusLogs: async (formType, enquiryId) => {
    const { statusHistory } = getEndpoints(formType);
    if (!statusHistory) {
      throw new Error(`Status history is not available for ${formType}.`);
    }
    if (enquiryId === null || enquiryId === undefined || enquiryId === "") {
      throw new Error("An enquiry ID is required to load status history.");
    }

    const res = await axiosInstance.get(
      `${statusHistory}/${encodeURIComponent(enquiryId)}/status-history`,
    );
    const body = res.data;

    if (body?.success === false || body?.Success === false) {
      throw new Error(
        body?.message ?? body?.Message ?? "Unable to load status history.",
      );
    }

    const logs = body?.data ?? body?.Data ?? body;
    if (!Array.isArray(logs)) {
      throw new Error("Unexpected status history response from the server.");
    }

    return logs.map(normalizeKeys);
  },

  getRequestStatuses: async () => {
    const res = await axiosInstance.get("/RequestStatus");
    const payload = res.data?.data ?? res.data?.Data ?? res.data;
    if (!Array.isArray(payload)) return [];

    return payload
      .map((item) => ({
        value: item.requestStatusId ?? item.RequestStatusId,
        label: item.name ?? item.Name,
      }))
      .filter((item) => item.value !== undefined && item.label);
  },

  openFile: async (formType, id) => {
    const { file } = getEndpoints(formType);

    if (!file) {
      throw new Error("This form has no attachments.");
    }

    const res = await axiosInstance.get(`${file}/${id}/file`, {
      responseType: "blob",
    });

    const url = URL.createObjectURL(res.data);
    window.open(url, "_blank", "noopener");

    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
