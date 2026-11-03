import axiosInstance from "../axiosInstance";
import { createMasterApi } from "./createMasterApi";

const baseApi = createMasterApi("BlogTypeMaster");

const blogTypeMasterApi = {
  ...baseApi,

  // PATCH /api/BlogTypeMaster/{id}/active-status?isActive=false&updatedBy=2
  toggleActive: (id, updatedBy, isActive) =>
    axiosInstance.patch(`/BlogTypeMaster/${id}/active-status`, null, {
      params: {
        isActive: isActive !== undefined ? isActive : true,
        updatedBy,
      },
    }),
};

export default blogTypeMasterApi;
