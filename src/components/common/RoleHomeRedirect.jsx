import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUserRoles } from "../../utils/authUtils";

/* Ordered: the first matching role decides the landing page. */
const HOME_BY_ROLE = [
  { role: "Admin", path: "/admin/dashboard" },
  { role: "UserManagementAdmin", path: "/admin/users" },
  { role: "ManageBlogAdmin", path: "/admin/blogs" },
  { role: "JobseekerAdmin", path: "/admin/jobseekers" },
  { role: "EmployerAdmin", path: "/admin/employer" },
  { role: "JobRequirementAdmin", path: "/admin/job-requirement-list" },
  { role: "JDByAdmin", path: "/admin/jdbyadmin" },
  { role: "CareerEnquiriesAdmin", path: "/admin/career" },
  { role: "ComplaintsGrievanceAdmin", path: "/admin/complaints" },
  { role: "ContactUsEnquiryAdmin", path: "/admin/contact" },
  { role: "FeedbackAdmin", path: "/admin/feedback" },
  { role: "MasterDataAdmin", path: "/admin/settings/master/complaintCategory" },
];

const FALLBACK_PATH = "/admin/dashboard";

const toRoleArray = (raw) => (Array.isArray(raw) ? raw : raw ? [raw] : []);

const RoleHomeRedirect = () => {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => getCurrentUserRoles())
      .then((raw) => {
        const roles = toRoleArray(raw);
        const match = HOME_BY_ROLE.find((item) => roles.includes(item.role));
        if (!cancelled) setTarget(match?.path ?? FALLBACK_PATH);
      })
      .catch(() => {
        if (!cancelled) setTarget(FALLBACK_PATH);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!target) {
    return (
      <div className="flex items-center justify-center p-10 text-sm text-slate-500">
        Loading...
      </div>
    );
  }

  return <Navigate to={target} replace />;
};

export default RoleHomeRedirect;