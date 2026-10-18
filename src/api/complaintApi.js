


import axiosInstance from "./axiosInstance";

export const getComplaintCategories = async () => {
  const response = await axiosInstance.get("/ComplaintCategory/all");
  return response.data;
};

export const submitComplaint = async (formData) => {
  const response = await axiosInstance.post("/Complaint", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};


// Get paginated complaints submitted by a specific user
export const getComplaintsByUserId = async (
  userId,
  pageNo = 1,
  pageSize = 10
) => {
  const response = await axiosInstance.get("/Complaint", {
    params: {
      complainer: userId,
      pageNo,
      pageSize,
    },
  });

  return response.data;
};


// Get complaint by ID
export const getComplaintById = async (complaintId) => {
  const response = await axiosInstance.get(
    `/Complaint/${complaintId}`
  );

  return response.data;
};