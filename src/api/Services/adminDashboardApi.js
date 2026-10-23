import axiosInstance from "../axiosInstance";

const getData = async (path, config) => {
  const response = await axiosInstance.get(path, config);
  return response.data?.data ?? response.data?.Data ?? response.data;
};

export const adminDashboardApi = {
  getSummary: () => getData("/AdminDashboard/summary"),
  getRegistrations: () => getData("/AdminDashboard/registrations"),
  getJobs: () => getData("/AdminDashboard/jobs"),
  getEnquiries: () => getData("/AdminDashboard/enquiries"),
  getFeedback: () => getData("/AdminDashboard/feedback"),
  getRecentActivity: (count = 10) =>
    getData("/AdminDashboard/recent-activity", { params: { count } }),
};
