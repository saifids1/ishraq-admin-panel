import axiosInstance from "../axiosInstance";

export const createMasterApi = (
  controller,
  { supportsAll = true } = {}
) => {
  const baseUrl = `/${controller}`;

  return {
    getAll: (params = {}) =>
      axiosInstance.get(baseUrl, {
        params: {
          PageNo: params.PageNo ?? params.pageNo ?? 1,
          PageSize: params.PageSize ?? params.pageSize ?? 10,
          Search: params.Search ?? params.search ?? "",
          ...(params.IsActive !== undefined && {
            IsActive: params.IsActive,
          }),
          ...params,
        },
      }),

    ...(supportsAll && {
      getAllList: (params = {}) =>
        axiosInstance.get(`${baseUrl}/all`, { params }),
    }),

    getById: (id) => axiosInstance.get(`${baseUrl}/${id}`),

    create: (payload) => axiosInstance.post(baseUrl, payload),

    update: (payload) => axiosInstance.put(baseUrl, payload),

    toggleActive: (id, updatedBy) =>
      axiosInstance.patch(`${baseUrl}/${id}/toggle-active`, null, {
        params: updatedBy != null ? { updatedBy } : {},
      }),
  };
};