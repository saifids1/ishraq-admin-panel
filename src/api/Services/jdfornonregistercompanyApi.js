 import axiosInstance from "../axiosInstance";

const jdfornonregistercompanyApi = {
  getJobDescription: async ({
    pageNo,
    pageNumber,
    pageSize,
    search,
    isActive,
  } = {}) => {
    const response = await axiosInstance.get("/admin/job-descriptions", {
      params: {
        PageNo: pageNo,
        PageNumber: pageNumber,
        PageSize: pageSize,
        Search: search,
        IsActive: isActive,
      },
    });
    return response.data;
  },

};

export default jdfornonregistercompanyApi;