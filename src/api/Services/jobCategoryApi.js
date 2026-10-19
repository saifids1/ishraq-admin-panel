import { createMasterApi } from "./createMasterApi";
import axiosInstance from "../axiosInstance";

const masterApi = createMasterApi("JobCategory");

const getByJobRole = async (jobRoleId) => {
  const response = await axiosInstance.get("/JobCategory/all", {
    params: { jobRoleId },
  });

  return response;
};

export default {
  ...masterApi,
  getByJobRole,
};
