import { createMasterApi } from "./createMasterApi";
import axiosInstance from "../axiosInstance";

const masterApi = createMasterApi("JobCategory");

const getByInstituteType = async (instituteTypeId) => {
  const response = await axiosInstance.get("/JobCategory/all", {
    params: { instituteTypeId },
  });

  return response;
};

const getByJobRole = async (jobRoleId) => {
  const response = await axiosInstance.get("/JobCategory/all", {
    params: { jobRoleId },
  });

  return response;
};

export default {
  ...masterApi,
  getByInstituteType,
  getByJobRole,
};