import axiosInstance from "../axiosInstance";
import { createMasterApi } from "./createMasterApi";

const baseApi = createMasterApi("StateMaster");

const stateMasterApi = {
  ...baseApi,

  // GET /api/StateMaster/all?countryId={countryId}
  getByCountry: (countryId) =>
    axiosInstance.get("/StateMaster/all", {
      params: { countryId },
    }),
};

export default stateMasterApi;