
import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    process.env.REACT_APP_API_BASE_URL ||
    "http://hr-ishraq-admin.i-diligence.com/api/",
  headers: {
    "Content-Type": "application/json",
  },
  // Some master-data endpoints return several hundred records (for example,
  // employers used by the Job Requirement form). Keep the client from
  // aborting while those responses are being materialized.
  timeout: 60000,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = error.response?.data;

    return Promise.reject({
      message:
        apiError?.message ||
        error.message ||
        "Something went wrong. Please try again.",
      status: error.response?.status,
      errors: apiError?.errors,
      data: apiError,
    });
  }
);

export default axiosInstance;
