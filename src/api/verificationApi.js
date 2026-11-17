import axiosInstance from "./axiosInstance";

/** PATCH /api/Auth/VerifyEmail?email=... */
export const markEmailVerifiedApi = async (email) => {
  const response = await axiosInstance.patch("/Auth/VerifyEmail", null, {
    params: { email },
  });
  return response.data;
};

/** PATCH /api/Auth/VerifyNumber?phoneNumber=... */
export const markNumberVerifiedApi = async (phoneNumber) => {
  const response = await axiosInstance.patch("/Auth/VerifyNumber", null, {
    params: { phoneNumber },
  });
  return response.data;
};