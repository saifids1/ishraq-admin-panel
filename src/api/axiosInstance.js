
import axios from "axios";

const axiosInstance = axios.create({
   // baseURL:
  //   process.env.REACT_APP_API_BASE_URL ||
  //   "/api",
  // headers: {
  //   "Content-Type": "application/json",
  // },
   baseURL:
    // process.env.REACT_APP_API_BASE_URL ||
    "/api",
  headers: {
    "Content-Type": "application/json",
  },
  
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
