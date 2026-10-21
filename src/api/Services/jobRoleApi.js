import { createMasterApi } from "./createMasterApi";

const jobRoleApi = createMasterApi("JobRole");

jobRoleApi.getByInstituteType = (instituteTypeId) =>
  jobRoleApi.getAllList({ instituteTypeId });

jobRoleApi.getByJobCategory = (jobCategoryId) =>
  jobRoleApi.getAllList({ jobCategoryId });

export default jobRoleApi;