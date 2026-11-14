// smsOtpApi.js
import axiosInstance from "../axiosInstance";

/**
 * Sends an OTP to the given phone number.
 * @param {string} phoneNumber - e.g. "9021444741"
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendOtp = async (phoneNumber) => {
  try {
    const { data } = await axiosInstance.post("/SmsOtp/send-otp", {
      phoneNumber,
    });
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
};

/**
 * Verifies the OTP entered by the user.
 * @param {string} phoneNumber - e.g. "9021444741"
 * @param {string} otp - e.g. "888567"
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const verifyOtp = async (phoneNumber, otp) => {
  try {
    const { data } = await axiosInstance.post("/SmsOtp/verify-otp", {
      phoneNumber,
      otp,
    });
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
};

/**
 * Turns an axios error into a consistent { success, message } shape,
 * so callers don't have to dig through error.response.
 */
const normalizeError = (error) => {
  if (error.response?.data) {
    return {
      success: false,
      message: error.response.data.message || "Request failed.",
    };
  }
  return {
    success: false,
    message: error.message || "Network error. Please try again.",
  };
};