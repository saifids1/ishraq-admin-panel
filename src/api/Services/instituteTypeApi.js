import { createMasterApi } from "./createMasterApi";
import axiosInstance from "../axiosInstance";

const api = createMasterApi("InstituteType");

const instituteTypeApi = {
  ...api,

  getAll: (params = {}) => {
    const status = params.status ?? params.IsActive;

    return axiosInstance.get("/InstituteType", {
      params: {
        PageNo: params.PageNo ?? params.pageNo ?? 1,
        PageSize: params.PageSize ?? params.pageSize ?? 10,
        Search: params.Search ?? params.search ?? "",
        ...(status === "Active"
          ? { IsActive: true }
          : status === "Inactive"
            ? { IsActive: false }
            : status !== undefined && status !== "All"
              ? { IsActive: status }
              : {}),
      },
    });
  },
};

export default instituteTypeApi;
