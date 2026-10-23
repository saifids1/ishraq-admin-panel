import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Settings,
  LogOut,
  UserRound,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCurrentUser, getCurrentUserId } from "../../utils/authUtils.js";
import jobseekerApi from "../../api/Services/adjobseekerApi.js";

const PROFILE_CACHE_KEY = "jobseekerProfileCached";
const PROFILE_CACHE_VERSION = "1";
import { DashboardTitle } from "./DashboardTitle.jsx";

// Shared across component mounts, including React StrictMode effect reruns.
let profileRequestPromise = null;

const PROFILE_FIELDS = [
  "jB_jobseeker_id",
  "jB_institute_type_id",
  "jB_job_role_id",
  "jB_job_category_id",
  "jB_jobseeker_no",
  "fullName",
  "email",
  "userName",
  "mobile",
];

const readCachedProfile = () => {
  try {
    if (localStorage.getItem(PROFILE_CACHE_KEY) !== PROFILE_CACHE_VERSION) {
      return null;
    }

    const profile = {};

    for (const field of PROFILE_FIELDS) {
      const value = localStorage.getItem(field);
      if (value !== null) profile[field] = value;
    }

    const requiredIds = [
      "jB_jobseeker_id",
      "jB_institute_type_id",
      "jB_job_role_id",
      "jB_job_category_id",
    ];

    if (
      requiredIds.some(
        (key) => !profile[key] || !Number.isFinite(Number(profile[key])),
      )
    ) {
      return null;
    }

    return profile;
  } catch {
    return null;
  }
};

const saveProfileToCache = (record) => {
  const fields = {
    jB_jobseeker_id: record.jB_jobseeker_id,
    jB_institute_type_id: record.jB_institute_type_id,
    jB_job_role_id: record.jB_job_role_id,
    jB_job_category_id: record.jB_job_category_id,
    jB_jobseeker_no: record.jB_jobseeker_no,
    fullName: record.fullName,
    email: record.email,
    userName: record.userName,
    mobile: record.mobile,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      localStorage.setItem(key, String(value));
    }
  }

  // Maintain the existing cache keys for compatibility.
  if (record.fullName) {
    localStorage.setItem("jobseekerName", record.fullName);
  }

  if (record.email) {
    localStorage.setItem("jobseekerEmail", record.email);
  }

  if (record.mobile) {
    localStorage.setItem("jobseekerMobile", record.mobile);
  }

  if (record.jB_jobseeker_no) {
    localStorage.setItem("jobseekerNumber", record.jB_jobseeker_no);
  }

  // Mark the cache complete only after all fields have been written.
  localStorage.setItem(PROFILE_CACHE_KEY, PROFILE_CACHE_VERSION);
};

const loadJobseekerProfileOnce = () => {
  const cachedProfile = readCachedProfile();

  if (cachedProfile) {
    return Promise.resolve(cachedProfile);
  }

  // Reuse a request already in progress.
  if (profileRequestPromise) {
    return profileRequestPromise;
  }

  const userId = getCurrentUserId();

  if (userId == null || userId === "") {
    return Promise.reject(new Error("Jobseeker user ID is missing."));
  }

  profileRequestPromise = (async () => {
    try {
      const response = await jobseekerApi.getById(userId);

      const record =
        response?.data?.data ?? response?.data?.Data ?? response?.data;

      if (!record?.jB_jobseeker_id) {
        throw new Error("Jobseeker profile could not be found.");
      }

      saveProfileToCache(record);

      return record;
    } finally {
      profileRequestPromise = null;
    }
  })();

  return profileRequestPromise;
};

const JobSeekerHeader = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [jobseeker, setJobseeker] = useState(() => readCachedProfile());

  const user = getCurrentUser();

  useEffect(() => {
    let cancelled = false;

    loadJobseekerProfileOnce()
      .then((record) => {
        if (!cancelled) {
          setJobseeker(record);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(
            "Failed to load jobseeker profile:",
            error.response?.data || error.message,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const userName =
    jobseeker?.fullName?.trim() ||
    localStorage.getItem("jobseekerName") ||
    user?.name ||
    user?.fullName ||
    user?.username ||
    "Job Seeker";

  const userEmail =
    jobseeker?.email ||
    jobseeker?.userName ||
    localStorage.getItem("jobseekerEmail") ||
    user?.email ||
    user?.username ||
    "";

  const userMobile =
    jobseeker?.mobile || localStorage.getItem("jobseekerMobile") || "";

  const jobseekerNumber =
    jobseeker?.jB_jobseeker_no || localStorage.getItem("jobseekerNumber") || "";

  const userRole = "Job Seeker";

  const initials = userName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const handleLogout = () => {
    setProfileOpen(false);

    // Remove profile-specific cached data on logout.
    [
      PROFILE_CACHE_KEY,
      "jB_jobseeker_id",
      "jB_institute_type_id",
      "jB_job_role_id",
      "jB_job_category_id",
      "jB_jobseeker_no",
      "fullName",
      "email",
      "userName",
      "mobile",
      "jobseekerName",
      "jobseekerEmail",
      "jobseekerMobile",
      "jobseekerNumber",
    ].forEach((key) => localStorage.removeItem(key));
    localStorage.clear();
    logout();
    navigate("/login");
  };

  return (
    <header
      className="h-[62px] shrink-0 bg-white border-b border-gray-200
      flex items-center justify-between px-4 sm:px-6 relative z-40"
    >
      <div />
      <DashboardTitle />

      <div className="flex items-center gap-3 sm:gap-5 ml-3">
        <button
          type="button"
          title="Notifications"
          aria-label="Notifications"
          className="relative flex items-center justify-center
            w-8 h-8 rounded-lg text-[#526581]
            hover:bg-gray-100 hover:text-[#2f6b8a]
            transition-colors"
        >
          <Bell size={17} strokeWidth={1.8} />
          <span
            className="absolute top-1 right-1 w-1.5 h-1.5
            rounded-full bg-[#2f6b8a] ring-2 ring-white"
          />
        </button>

        <div className="h-7 w-px bg-gray-200" />

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            aria-expanded={profileOpen}
            aria-label="Open profile menu"
            className="flex items-center gap-2 sm:gap-2.5
              rounded-lg px-2 py-1.5
              hover:bg-gray-50 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full bg-[#e8f0f5]
              flex items-center justify-center shrink-0
              border border-gray-100"
            >
              {initials ? (
                <span className="text-xs font-semibold text-[#2f6b8a]">
                  {initials}
                </span>
              ) : (
                <UserRound size={17} className="text-[#2f6b8a]" />
              )}
            </div>

            <div className="hidden sm:block text-left leading-tight max-w-[180px]">
              <p className="text-xs font-semibold text-gray-800 truncate">
                {userName}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                {userRole}
              </p>
            </div>

            {profileOpen ? (
              <ChevronUp size={14} className="text-gray-500" />
            ) : (
              <ChevronDown size={14} className="text-gray-500" />
            )}
          </button>

          {profileOpen && (
            <>
              <button
                type="button"
                aria-label="Close profile menu"
                onClick={() => setProfileOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
              />

              <div
                className="absolute right-0 top-[48px] w-[280px]
                max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl
                border border-gray-100 z-50 overflow-hidden
                animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full shrink-0
                    bg-[#e8f0f5] flex items-center justify-center"
                  >
                    {initials ? (
                      <span className="text-sm font-semibold text-[#2f6b8a]">
                        {initials}
                      </span>
                    ) : (
                      <UserRound size={20} className="text-[#2f6b8a]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">
                      {userName}
                    </h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {userEmail || "Email not available"}
                    </p>
                    <p className="text-[11px] text-[#2f6b8a] mt-1">
                      {userRole}
                    </p>
                  </div>
                </div>

                {(jobseekerNumber || userMobile) && (
                  <div className="px-4 pb-3 space-y-1">
                    {jobseekerNumber && (
                      <p className="text-[11px] text-gray-500">
                        {/* ID: {jobseekerNumber} */}
                      </p>
                    )}
                    {userMobile && (
                      <p className="text-[11px] text-gray-500">
                        Mobile: {userMobile}
                      </p>
                    )}
                  </div>
                )}

                <div className="border-t border-gray-100" />

                

                <div className="border-t border-gray-100" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3
                    px-4 py-3 text-sm text-red-500
                    hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default JobSeekerHeader;
