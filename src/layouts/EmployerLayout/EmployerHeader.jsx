import React, { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronUp,
  LogOut,
  Menu,
  UserRound,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCurrentUser, getCurrentUserId } from "../../utils/authUtils.js";
import {
  getPayload,
  extractEmployerRecord,
  normalizeEmployer,
  getEmployerRequest,
} from "../../utils/employerProfile";
import { DashboardTitle } from "./DashboardTitle.jsx";

const EmployerHeader = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [employer, setEmployer] = useState(null);

  // Fallback values from local storage, used until the API responds or if it fails.
  const user = getCurrentUser();
  useEffect(() => {
    if (user?.email) {
      localStorage.setItem("employerEmail", user.email);
    }
    if (user?.name) {
      localStorage.setItem("organizationName", user.name);
    }
    if (user?.no) {
      localStorage.setItem("organizationNo", user.no);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadEmployer = async () => {
      try {
        const userId = getCurrentUserId();
        if (!userId) return;

        const response = await getEmployerRequest(userId);
        const record = normalizeEmployer(
          extractEmployerRecord(getPayload(response)),
        );

        if (!cancelled && record?.EM_employer_id !== undefined) {
          setEmployer(record);

          const organizationName = record.EM_organization_name?.trim() || "";
          const organizationNo = record.mobile;
          const email =
            record.Email?.trim() || user?.email || user?.username || "";

          // Save employer details for use in other pages
          if (organizationNo) {
            localStorage.setItem("organizationNo", organizationNo);
          }
          if (organizationName) {
            localStorage.setItem("organizationName", organizationName);
          }
          if (email) {
            localStorage.setItem("employerEmail", email);
          }
        }
      } catch {
        // Keep the local storage fallback if the request fails.
      }
    };

    loadEmployer();
    return () => {
      cancelled = true;
    };
  }, []);

  const orgName = employer?.EM_organization_name?.trim();
  const userName = orgName || user?.name || user?.username || "Employer";
  const userEmail = employer?.Email || user?.email || user?.username || "";
  const userRole = "Employer";

  const initials = userName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const handleLogout = () => {
    setProfileOpen(false);
    localStorage.clear();
    logout();
    navigate("/login");
  };

  return (
    <header
      className="h-[62px] shrink-0 bg-white border-b border-gray-200
      flex items-center justify-between gap-2 px-3 sm:px-6 relative z-40"
    >
      {/* LEFT SIDE: menu button (mobile only) + title */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="md:hidden grid place-items-center w-9 h-9 shrink-0 rounded-lg
            text-[#2f6b8a] hover:bg-gray-100 active:scale-95 transition"
        >
          <Menu size={20} />
        </button>

        <DashboardTitle />
      </div>

      {/* RIGHT SIDE */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        {/* NOTIFICATIONS */}
        {/* <button
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
        </button> */}

        {/* DIVIDER */}
        <div className="h-7 w-px bg-gray-200" />

        {/* PROFILE */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            aria-expanded={profileOpen}
            className="flex items-center gap-2 sm:gap-2.5
              rounded-lg px-2 py-1.5
              hover:bg-gray-50 transition-colors"
          >
            {/* AVATAR */}
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

            {/* USER DETAILS */}
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

          {/* PROFILE DROPDOWN */}
          {profileOpen && (
            <>
              {/* Outside click area */}
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
                {/* PROFILE INFORMATION */}
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
                      {userEmail}
                    </p>
                    <p className="text-[11px] text-[#2f6b8a] mt-1">
                      {userRole}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-100" />

                {/* LOGOUT */}
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

export default EmployerHeader;