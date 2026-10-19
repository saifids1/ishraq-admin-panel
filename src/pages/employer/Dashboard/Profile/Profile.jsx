import { Navigate } from "react-router-dom";

const EmployerProfile = () => {
  // The organization profile is the actual employer profile screen and
  // contains the edit action and update form.
  return <Navigate to="/employer/organization-profile" replace />;
};

export default EmployerProfile;
