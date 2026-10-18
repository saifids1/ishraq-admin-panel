
import axiosInstance from "./axiosInstance";

export const submitFeedback = async (payload) => {
  const response = await axiosInstance.post("/Feedback", payload);
  return response.data;
};

export const getFeedbackByUserId = async (
  userId,
  pageNo = 1,
  pageSize = 10
) => {
  const response = await axiosInstance.get(
    "/Feedback/GetAllFeedbackPagination",
    {
      params: {
        Fb_requester_id: userId,
        pageNo,
        pageSize,
      },
    }
  );

  return response.data;
};

// Get feedback by ID
export const getFeedbackById = async (feedbackId) => {
  const response = await axiosInstance.get(
    `/Feedback/${feedbackId}`
  );

  return response.data;
};