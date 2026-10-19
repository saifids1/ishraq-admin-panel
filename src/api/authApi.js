import axiosInstance from "./axiosInstance";

/**
 * Login API
 * POST /api/Auth/login
 */
export const loginApi = async (credentials) => {
  const response = await axiosInstance.post("/Auth/login", {
    email: credentials.email,
    password: credentials.password,
  });

  return response.data;
};

/** POST /api/EmailOtp/send-otp */
export const sendForgotPasswordOtpApi = async (email) => {
  const response = await axiosInstance.post("/EmailOtp/send-otp", { email });
  return response.data;
};

/** POST /api/EmailOtp/verify-otp */
export const verifyForgotPasswordOtpApi = async (email, otp) => {
  const response = await axiosInstance.post("/EmailOtp/verify-otp", { email, otp });
  return response.data;
};

/** POST /api/Auth/reset-password-otp (form body, not query string) */
export const updatePasswordByEmailApi = async (email, pass) => {
  const response = await axiosInstance.patch("/Auth/UpdatePasswordyEmail", null, {
    params: { email, pass },
  });
  return response.data;
};