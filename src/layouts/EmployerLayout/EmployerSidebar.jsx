import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  MessagesSquare,
  ClipboardList,
  ShieldAlert,
  Activity,
  ChevronsRight,
  ChevronsLeft,
  X,
  Search,
} from "lucide-react";
import Logo from "../../IshraqHR2.png"

// Keyframes live here so no tailwind.config changes are needed
const styles = `
@keyframes sbSlideIn {
  from { opacity: 0; transform: translateX(-14px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes sbWiggle {
  0%, 100% { transform: rotate(0) scale(1); }
  25%      { transform: rotate(-12deg) scale(1.15); }
  60%      { transform: rotate(10deg) scale(1.15); }
}
@keyframes sbShimmer {
  0%   { transform: translateX(-120%); }
  100% { transform: translateX(220%); }
}
@keyframes sbPing {
  0%   { transform: scale(1); opacity: .8; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes sbFlow {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
@keyframes sbFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-2px); }
}

.sb-item { animation: sbSlideIn .45s cubic-bezier(.2,.8,.2,1) both; }
.sb-link:hover .sb-icon { animation: sbWiggle .55s ease-in-out; }
.sb-shimmer::after {
  content: "";
  position: absolute; inset: 0;
  width: 40%;
  background: linear-gradient(110deg, transparent, rgba(255,255,255,.35), transparent);
  animation: sbShimmer 2.8s ease-in-out infinite;
}
.sb-brand {
  background: linear-gradient(90deg, #2f6b8a, #38b2ac, #6366f1, #2f6b8a);
  background-size: 200% auto;
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: sbFlow 6s linear infinite;
}
.sb-logo-badge { animation: sbFloat 3s ease-in-out infinite; }
.sb-ping { animation: sbPing 1.6s ease-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .sb-item, .sb-brand, .sb-logo-badge, .sb-ping,
  .sb-shimmer::after, .sb-link:hover .sb-icon { animation: none !important; }
}
`;

const menuItems = [
  {
    text: "Dashboard",
    icon: LayoutDashboard,
    link: "/employer/dashboard",
    tile: "from-sky-400 to-blue-500",
  },
  {
    text: "Organization Profile",
    icon: Building2,
    link: "/employer/organization-profile",
    tile: "from-violet-400 to-indigo-500",
  },
  {
    text: "Job Requirements",
    icon: ClipboardList,
    link: "/employer/job-requirement-list",
    tile: "from-cyan-400 to-sky-500",
  },
  {
    text: "Complaints",
    icon: ShieldAlert,
    link: "/employer/complaint-list",
    tile: "from-rose-400 to-red-500",
  },
  {
    text: "Feedback",
    icon: MessagesSquare,
    link: "/employer/feedback-list",
    tile: "from-pink-400 to-rose-500",
  },
];

export const EmployerSidebar = ({ mobileOpen = false, onClose = () => {} }) => {
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState("");

  // On mobile the overlay always shows labels; on desktop it follows `expanded`
  const labelsVisible = mobileOpen || expanded;

  const filteredItems = menuItems.filter((item) =>
    item.text.toLowerCase().includes(search.toLowerCase()),
  );

  const renderItem = (item, index) => {
    const Icon = item.icon;

    return (
      <li
        key={item.text}
        className="list-none sb-item"
        style={{ animationDelay: `${index * 55}ms` }}
      >
        <NavLink
          to={item.link}
          end
          onClick={onClose}
          title={!labelsVisible ? item.text : undefined}
          className={({ isActive }) =>
            `sb-link relative flex items-center h-11 px-2 my-1 rounded-xl overflow-hidden
            transition-all duration-300 group
            ${
              isActive
                ? "sb-shimmer bg-gradient-to-r from-[#2f6b8a] via-[#3a86a8] to-[#4aa3c0] text-white shadow-lg shadow-[#2f6b8a]/30"
                : "text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent hover:text-[#2f6b8a] hover:translate-x-0.5"
            }
            ${labelsVisible ? "justify-start" : "justify-center md:justify-center"}`
          }
        >
          {({ isActive }) => (
            <>
              {/* Active indicator bar */}
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-white
                  transition-all duration-300 ${
                    isActive ? "h-6 opacity-100" : "h-0 opacity-0"
                  }`}
              />

              {/* Gradient icon tile */}
              <span
                className={`sb-icon relative z-10 shrink-0 grid place-items-center w-8 h-8 rounded-lg
                  transition-all duration-300 ${
                    isActive
                      ? "bg-white/20 ring-1 ring-white/40"
                      : `bg-gradient-to-br ${item.tile} text-white shadow-sm
                         group-hover:shadow-md group-hover:scale-110`
                  }`}
              >
                <Icon size={17} strokeWidth={2} className="text-white" />
              </span>

              <span
                className={`relative z-10 overflow-hidden whitespace-nowrap text-sm font-medium
                  transition-all duration-300 ${
                    labelsVisible
                      ? "w-40 ml-3 opacity-100"
                      : "w-0 ml-0 opacity-0"
                  }`}
              >
                {item.text}
              </span>

              {item.alert && (
                <span
                  className={`absolute z-10 ${
                    labelsVisible
                      ? "right-3 top-1/2 -translate-y-1/2"
                      : "right-1.5 top-1.5"
                  }`}
                >
                  <span className="sb-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="relative block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                </span>
              )}
            </>
          )}
        </NavLink>
      </li>
    );
  };

  return (
    <aside
      className={`
    ${mobileOpen ? "fixed inset-0 z-50 flex w-full bg-white" : "hidden"}
    md:flex md:static md:z-auto md:h-screen md:shrink-0 md:bg-transparent
    md:transition-all md:duration-300
    ${expanded ? "md:w-64" : "md:w-[72px]"}
  `}
    >
      <style>{styles}</style>

      <nav className="h-full w-full flex flex-col bg-white md:bg-gradient-to-b md:from-white md:via-sky-50/40 md:to-indigo-50/60 border-r border-gray-200 shadow-sm">
        {/* Logo and buttons */}
        <div
          className={`h-16 px-3 flex items-center border-b border-gray-100 ${
            labelsVisible ? "justify-between" : "justify-center"
          }`}
        >
          {/* {labelsVisible && ( */}
            <div className="flex items-center gap-2 min-w-0">
             <img src={Logo} width={100} height={160} alt="" />
            </div>
           {/* )} */}

          {/* Mobile: close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="md:hidden p-2 rounded-full text-gray-600 hover:bg-gray-100 active:scale-95 transition"
          >
            <X size={20} />
          </button>

          {/* Desktop: collapse button */}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            className="hidden md:block p-2 rounded-full text-white bg-gradient-to-br from-[#2f6b8a] to-[#4aa3c0]
              shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
          >
            {expanded ? (
              <ChevronsLeft size={14} />
            ) : (
              <ChevronsRight size={14} />
            )}
          </button>
        </div>

        {/* Search (only when labels are visible) */}
        {labelsVisible && (
          <div className="px-3 pt-3">
            <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-white border border-gray-200">
              <Search size={14} className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
        )}

        {/* Main Menu */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-2">
          <ul className="space-y-1">{filteredItems.map(renderItem)}</ul>

          {filteredItems.length === 0 && labelsVisible && (
            <p className="px-3 py-6 text-center text-sm text-gray-400">
              No menu items match "{search}"
            </p>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default EmployerSidebar;
