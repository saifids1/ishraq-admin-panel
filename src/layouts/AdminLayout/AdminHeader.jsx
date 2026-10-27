import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  LogOut,
  UserRound,
  Menu,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/* ---- live clock helper (12-hour with AM/PM) ---- */
const formatNow = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  let hours = d.getHours();
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const hh = String(hours).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  return `${dd}-${mm}-${yyyy}, ${hh}:${min}:${ss} ${meridiem}`;
};

const AdminHeader = ({ onOpenMenu }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [now, setNow] = useState(formatNow());

  /* tick every second */
  useEffect(() => {
    const id = setInterval(() => setNow(formatNow()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      className="h-[64px] shrink-0 bg-white border-b border-gray-200
      grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-6
      relative z-40"
    >
      {/* ---------- LEFT: hamburger ---------- */}
      <div className="flex min-w-0 items-center">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#526581] transition-colors hover:bg-gray-100 hover:text-[#2f6b8a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6b8a] md:hidden"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* ---------- CENTER: heading ---------- */}
      <h1 className="truncate text-center text-[24px] font-extrabold tracking-tight text-[#2f6b8a]">
        Ishraq HR Admin
      </h1>

      {/* ---------- RIGHT: date/time + profile ---------- */}
      <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-4">
        {/* Live date/time */}
        <span
          className="hidden truncate text-[12px] font-medium tabular-nums text-gray-500 sm:inline"
          title="Current date and time"
        >
          {now}
        </span>

        {/* DIVIDER */}
        <div className="hidden h-7 w-px bg-gray-200 sm:block" />

        {/* PROFILE */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
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
              <UserRound size={17} className="text-[#2f6b8a]" />
            </div>

            {/* USER DETAILS */}
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-semibold text-gray-800">Admin</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Super Admin</p>
            </div>

            {/* DROPDOWN ARROW */}
            {profileOpen ? (
              <ChevronUp size={14} className="text-gray-500" />
            ) : (
              <ChevronDown size={14} className="text-gray-500" />
            )}
          </button>

          {/* PROFILE DROPDOWN */}
          {profileOpen && (
            <>
              <button
                type="button"
                aria-label="Close profile menu"
                onClick={() => setProfileOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
              />

              <div
                className="absolute right-0 top-[48px] w-[240px]
                bg-white rounded-xl shadow-xl
                border border-gray-100 z-50 overflow-hidden
                animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full
                    bg-[#e8f0f5] flex items-center justify-center"
                  >
                    <UserRound size={20} className="text-[#2f6b8a]" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800">
                      Admin
                    </h3>
                    <p className="text-xs text-gray-500 truncate">Ishraq HR</p>
                  </div>
                </div>

                <div className="border-t border-gray-100" />

                <button
                  type="button"
                  onClick={() => handleLogout()}
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

export default AdminHeader;