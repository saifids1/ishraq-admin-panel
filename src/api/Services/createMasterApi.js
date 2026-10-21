import axiosInstance from "../axiosInstance";

export const createMasterApi = (
  controller,
  { supportsAll = true } = {}
) => {
  const baseUrl = `/${controller}`;

  return {
    // Get paginated list with search and optional filters
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

    // Get full list for dropdowns
    ...(supportsAll && {
      getAllList: (params = {}) =>
        axiosInstance.get(`${baseUrl}/all`, { params }),
    }),

    // Get a single record by ID
    getById: (id) =>
      axiosInstance.get(`${baseUrl}/${id}`),

    // Create a record
    create: (payload) =>
      axiosInstance.post(baseUrl, payload),

    // Update a record
    update: (payload) =>
      axiosInstance.put(baseUrl, payload),

    // Toggle active/inactive status
    toggleActive: (id, updatedBy) =>
      axiosInstance.patch(
        `${baseUrl}/${id}/toggle-active`,
        null,
        {
          params:
            updatedBy != null
              ? { updatedBy }
              : {},
        }
      ),
  };
};
