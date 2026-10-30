import axiosInstance from "../axiosInstance";
import { createMasterApi } from "./createMasterApi";

const baseApi = createMasterApi("CityMaster");

const cityMasterApi = {
  ...baseApi,

  // GET /api/CityMaster/all?stateId={stateId}
  getByState: (stateId) =>
    axiosInstance.get("/CityMaster/all", {
      params: { stateId },
    }),
};

export default cityMasterApi;