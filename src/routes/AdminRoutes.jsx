import { Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../components/common/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout/AdminLayout";

import AdminDashboard from "../pages/admin/Dashboard/AdminDashboard";
import AdminUsers from "../pages/admin/Users/Users";

import JobSeekers from "../pages/admin/JobSeekers/JobSeekers";
import AddJobSeeker from "../pages/admin/JobSeekers/AddJobSeeker";

import EmployerList from "../pages/admin/Employer/EmployerList";
import EmployerProfile from "../pages/admin/Employer/EmployerDetails";

import ResetPassword from "../pages/admin/ResetPassword/ResetPassword";
import JobRequirementList from "../pages/admin/JobRequirement/JobRequirementList";
import JobRequirementCreate from "../pages/admin/JobRequirement/Jobrequirementcreate";

// master data imports
import ComplaintCategoryList from "../pages/admin/MasterData/ComplaintCategory/ComplaintCategoryList";
import CreateComplaintCategory from "../pages/admin/MasterData/ComplaintCategory/CreateComplaintCategory";
import EmploymentTypeList from "../pages/admin/MasterData/EmploymentType/EmploymentTypeList";
import CreateEmploymentType from "../pages/admin/MasterData/EmploymentType/CreateEmploymentType";
import InstituteTypeList from "../pages/admin/MasterData/InstituteType/InstituteTypeList";
import CreateInstituteType from "../pages/admin/MasterData/InstituteType/CreateInstituteType";
import JobStatusList from "../pages/admin/MasterData/JobStatus/JobStatusList";
import CreateJobStatus from "../pages/admin/MasterData/JobStatus/CreateJobStatus";
import JobRoleList from "../pages/admin/MasterData/JobRole/JobRoleList";
import CreateJobRole from "../pages/admin/MasterData/JobRole/CreateJobRole";
import JobCategoryList from "../pages/admin/MasterData/JobCategory/JobCategoryList";
import CreateJobCategory from "../pages/admin/MasterData/JobCategory/CreateJobCategory";
import UserTypeList from "../pages/admin/MasterData/UserType/UserTypeList";
import CreateUserType from "../pages/admin/MasterData/UserType/CreateUserType";
import CountryList from "../pages/admin/MasterData/Country/CountryList";
import CreateCountry from "../pages/admin/MasterData/Country/CreateCountry";
import StateList from "../pages/admin/MasterData/State/StateList";
import CreateState from "../pages/admin/MasterData/State/CreateState";
import CityList from "../pages/admin/MasterData/City/CityList";
import CreateCity from "../pages/admin/MasterData/City/CreateCity";

// admin enquiry imports
import CareerEnquiryList from "../pages/admin/Enquiries/Career/CareerEnquiryList";
import CareerEnquiryDetails from "../pages/admin/Enquiries/Career/CareerEnquiryDetails";
import ContactEnquiryList from "../pages/admin/Enquiries/Contact/ContactEnquiryList";
import ContactEnquiryDetails from "../pages/admin/Enquiries/Contact/ContactEnquiryDetails";
import ComplaintList from "../pages/admin/Enquiries/Complaints/ComplaintList";
import ComplaintDetails from "../pages/admin/Enquiries/Complaints/ComplaintDetails";
import FeedbackList from "../pages/admin/Enquiries/Feedback/FeedbackList";
import FeedbackDetails from "../pages/admin/Enquiries/Feedback/FeedbackDetails";
import CreateEmployer from "../pages/admin/Employer/CreateEmployer.jsx";

const AdminRoutes = (
  <Route element={<ProtectedRoute allowedRole="admin" />}>
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="users" element={<AdminUsers />} />
      {/* Employer */}
      <Route path="employer" element={<EmployerList />} />
      <Route path="employers/:id" element={<EmployerProfile />} />
      <Route
        path="employers/:id/edit"
        element={<CreateEmployer mode="edit" />}
      />
      {/* Settings */}
      <Route path="userList" element={<Navigate to="/admin/users" replace />} />
      <Route path="reset-password" element={<ResetPassword />} />
      {/* Job Seeker Management */}
      <Route path="jobseekers" element={<JobSeekers />} />
      <Route path="jobseekers/add" element={<AddJobSeeker mode="create" />} />
      <Route path="jobseekers/:id" element={<AddJobSeeker mode="view" />} />
      <Route
        path="jobseekers/:id/edit"
        element={<AddJobSeeker mode="edit" />}
      />
      <Route path="job-requirement-list" element={<JobRequirementList />} />
      {/* <Route path="/admin/job-requirements" element={<JobRequirementList />} /> */}
      <Route
        path="job-requirements/:id"
        element={<JobRequirementCreate mode="view" />}
      />
      <Route
        path="job-requirements/:id/edit"
        element={<JobRequirementCreate mode="edit" />}
      />
      <Route
        path="job-requirements/create"
        element={<JobRequirementCreate mode="create" />}
      />
      {/* master data routes */}
      <Route
        path="settings/master/complaintCategory"
        element={<ComplaintCategoryList />}
      />
      <Route
        path="settings/master/complaintCategory/add"
        element={<CreateComplaintCategory mode="create" />}
      />
      <Route
        path="settings/master/complaintCategory/:id/edit"
        element={<CreateComplaintCategory mode="edit" />}
      />
      <Route
        path="settings/master/complaintCategory/:id/view"
        element={<CreateComplaintCategory mode="view" />}
      />
      <Route
        path="settings/master/employmentType"
        element={<EmploymentTypeList />}
      />
      <Route
        path="settings/master/employmentType/add"
        element={<CreateEmploymentType mode="create" />}
      />
      <Route
        path="settings/master/employmentType/:id/edit"
        element={<CreateEmploymentType mode="edit" />}
      />
      <Route
        path="settings/master/employmentType/:id/view"
        element={<CreateEmploymentType mode="view" />}
      />
      <Route
        path="settings/master/instituteType"
        element={<InstituteTypeList />}
      />
      <Route
        path="settings/master/instituteType/add"
        element={<CreateInstituteType mode="create" />}
      />
      <Route
        path="settings/master/instituteType/:id/edit"
        element={<CreateInstituteType mode="edit" />}
      />
      <Route
        path="settings/master/instituteType/:id/view"
        element={<CreateInstituteType mode="view" />}
      />
      <Route path="settings/master/jobStatus" element={<JobStatusList />} />
      <Route
        path="settings/master/jobStatus/add"
        element={<CreateJobStatus mode="create" />}
      />
      <Route
        path="settings/master/jobStatus/:id/edit"
        element={<CreateJobStatus mode="edit" />}
      />
      <Route
        path="settings/master/jobStatus/:id/view"
        element={<CreateJobStatus mode="view" />}
      />
      <Route path="settings/master/jobRole" element={<JobRoleList />} />
      <Route
        path="settings/master/jobRole/add"
        element={<CreateJobRole mode="create" />}
      />
      <Route
        path="settings/master/jobRole/:id/edit"
        element={<CreateJobRole mode="edit" />}
      />
      <Route
        path="settings/master/jobRole/:id/view"
        element={<CreateJobRole mode="view" />}
      />
      <Route
        path="settings/master/jobCategory"
        element={<JobCategoryList />}
      />
      <Route
        path="settings/master/jobCategory/add"
        element={<CreateJobCategory mode="create" />}
      />
      <Route
        path="settings/master/jobCategory/:id/edit"
        element={<CreateJobCategory mode="edit" />}
      />
      <Route
        path="settings/master/jobCategory/:id/view"
        element={<CreateJobCategory mode="view" />}
      />
      <Route path="settings/master/userType" element={<UserTypeList />} />
      <Route
        path="settings/master/userType/add"
        element={<CreateUserType mode="create" />}
      />
      <Route
        path="settings/master/userType/:id/edit"
        element={<CreateUserType mode="edit" />}
      />
      <Route
        path="settings/master/userType/:id/view"
        element={<CreateUserType mode="view" />}
      />
      <Route path="settings/master/countryMaster" element={<CountryList />} />
      <Route
        path="settings/master/countryMaster/add"
        element={<CreateCountry mode="create" />}
      />
      <Route
        path="settings/master/countryMaster/:id/edit"
        element={<CreateCountry mode="edit" />}
      />
      <Route
        path="settings/master/countryMaster/:id/view"
        element={<CreateCountry mode="view" />}
      />
      <Route path="settings/master/stateMaster" element={<StateList />} />
      <Route
        path="settings/master/stateMaster/add"
        element={<CreateState mode="create" />}
      />
      <Route
        path="settings/master/stateMaster/:id/edit"
        element={<CreateState mode="edit" />}
      />
      <Route
        path="settings/master/stateMaster/:id/view"
        element={<CreateState mode="view" />}
      />
      <Route path="settings/master/cityMaster" element={<CityList />} />
      <Route
        path="settings/master/cityMaster/add"
        element={<CreateCity mode="create" />}
      />
      <Route
        path="settings/master/cityMaster/:id/edit"
        element={<CreateCity mode="edit" />}
      />
      <Route
        path="settings/master/cityMaster/:id/view"
        element={<CreateCity mode="view" />}
      />
      <Route
        path="settings/master/employer/add"
        element={<CreateEmployer mode="create" />}
      />
     
      {/* Admin Enquiry routes  */}

      <Route
        path="complaints"
        element={<ComplaintList />}
      />
      <Route
        path="complaints/:id"
        element={<ComplaintDetails />}
      />
      <Route path="career" element={<CareerEnquiryList />} />
      <Route
        path="contact/:id"
        element={<ContactEnquiryDetails />}
      />
      <Route path="career/:id" element={<CareerEnquiryDetails />} />
      <Route path="contact" element={<ContactEnquiryList />} />
      <Route path="feedback" element={<FeedbackList />} />
      <Route path="feedback/:id" element={<FeedbackDetails />} />
    </Route>
  </Route>
);

export default AdminRoutes;
