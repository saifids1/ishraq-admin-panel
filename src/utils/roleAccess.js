import { getCurrentUserRoles } from "./authUtils";

// Normalizes "JobseekerAdmin", "JD by Admin", "Complaints / Grievance Admin" etc.
export const normalizeRoleKey = (role) =>
  String(role ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const ALL_ADMIN_ROLES = [
  "usermanagementadmin",
  "jobseekeradmin",
  "employeradmin",
  "jobrequirementadmin",
  "jdbyadmin",
  "careerenquiriesadmin",
  "complaintsgrievanceadmin",
  "contactusenquiryadmin",
  "feedbackadmin",
  "masterdataadmin",
  "manageblogadmin",
];

// Set of normalized role keys for the current user.
export const getUserRoleKeys = () =>
  new Set((getCurrentUserRoles() ?? []).map(normalizeRoleKey));

// "admin" (full Admin) sees everything. Otherwise any matching role is enough.
export const canAccess = (roleKeys, allowedRoles = []) =>
  roleKeys.has("admin") || allowedRoles.some((role) => roleKeys.has(role));