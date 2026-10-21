import { Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../components/common/ProtectedRoute";
import JobSeekerLayout from "../layouts/JobseekerLayout/JobSeekerLayout";

import JobSeekerDashboard from "../pages/jobseeker/Dashboard/JobSeekerDashboard";
import JobseekerOverview from "../pages/jobseeker/Profile/Profile";
import JobseekerEdit from "../pages/jobseeker/Profile/EditProfile";
import JobseekerAppliedJobs from "../pages/jobseeker/AppliedJobs/JobseekerAppliedJobs";
import ViewJobApplication from "../pages/jobseeker/AppliedJobs/ViewAppliedJob";

import FeedbackList from "../pages/jobseeker/Feedback/FeedbackList";
import FeedbackDetails from "../pages/jobseeker/Feedback/FeedbackDetails";
import ComplaintList from "../pages/jobseeker/Complaints/ComplaintList";
import ComplaintDetails from "../pages/jobseeker/Complaints/ComplaintDetails";
import CreateComplaint from "../pages/jobseeker/Complaints/CreateComplaint";
import CreateFeedback from "../pages/jobseeker/Feedback/CreateFeedback";
import JobsForYou from "../pages/jobseeker/JobsForYou/JobsForYou";
import JobRequiremnetDetails from "../pages/jobseeker/JobsForYou/JobDetails";
const JobSeekerRoutes = (
  <Route element={<ProtectedRoute allowedRole="jobseeker" />}>
    <Route path="/jobseeker" element={<JobSeekerLayout />}>
      <Route index element={<Navigate to="/jobseeker/dashboard" replace />} />

      <Route path="dashboard" element={<JobSeekerDashboard />} />
      <Route path="profile" element={<JobseekerOverview />} />
      <Route path="profile/:id/edit" element={<JobseekerEdit />} />
      <Route path="applied-jobs" element={<JobseekerAppliedJobs />} />
      <Route
        path="applications/:applicationId"
        element={<ViewJobApplication />}
      />

      <Route path="feedback-list" element={<FeedbackList />} />
      <Route path="feedback/:id" element={<FeedbackDetails />} />
      <Route path="feedback-add" element={<CreateFeedback />} />
      <Route path="complaint-list" element={<ComplaintList />} />
      <Route path="complaints/:id" element={<ComplaintDetails />} />
      <Route path="complaint-add" element={<CreateComplaint />} />

      {/* jobs */}
      <Route path="job-list" element={<JobsForYou />} />
      <Route path="jobs/:id" element={<JobRequiremnetDetails />} />
    </Route>
  </Route>
);

export default JobSeekerRoutes;
