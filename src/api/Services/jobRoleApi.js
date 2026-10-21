import { createMasterApi } from "./createMasterApi";

const jobRoleApi = createMasterApi("JobRole");

jobRoleApi.getByInstituteType = (instituteTypeId) =>
  jobRoleApi.getAllList({ instituteTypeId });

jobRoleApi.getByJobCategory = async (jobCategoryId) => {
  const response = await jobRoleApi.getAllList();
  const root = response?.data ?? response;
  const candidates = [
    root?.data?.data,
    root?.Data?.Data,
    root?.data,
    root?.Data,
    root,
  ];
  const roles = candidates.find(Array.isArray);

  return {
    ...response,
    data: {
      ...(root && !Array.isArray(root) && typeof root === "object" ? root : {}),
      data: (roles || []).filter(
        (role) => Number(role?.jR_job_category_id) === Number(jobCategoryId),
      ),
    },
  };
};

export default jobRoleApi;