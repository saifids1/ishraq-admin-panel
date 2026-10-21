import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ChevronsLeft,
  ChevronsRight,
  Search,
  LayoutDashboard,
  BookUser,
  Building2,
  KeyRound,
  Activity,
  ClipboardList,
  MessageCircleQuestion,
  ShieldAlert,
  Settings,
  MessagesSquare,
  Sparkles,
  LifeBuoy,
  LogOut,
  NotebookDot,
  ChevronDown,
  ChevronRight,
  Database,
  MapPin,
  School,
  Briefcase,
  Globe,
  Landmark,
  Map,
  Clock,
  Users,
  AlertTriangle,
  BadgeCheck,
} from "lucide-react";

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

export const AdminSidebar = () => {
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState("");
  const [masterDataOpen, setMasterDataOpen] = useState(
    window.location.pathname.startsWith("/admin/master-data"),
  );

  // `tile` = icon background gradient used when the item is idle/hovered
  const menuItems = [
    {
      text: "Dashboard",
      icon: LayoutDashboard,
      link: "/admin/dashboard",
      tile: "from-sky-400 to-blue-500",
    },
    {
      text: "JobSeeker List",
      icon: BookUser,
      link: "/admin/jobseekers",
      tile: "from-emerald-400 to-teal-500",
    },
    {
      text: "Employers List",
      icon: Building2,
      link: "/admin/employer",
      tile: "from-violet-400 to-indigo-500",
    },
    {
      text: "Job Requirements",
      icon: NotebookDot,
      link: "/admin/job-requirement-list",
      tile: "from-violet-400 to-indigo-500",
    },
    {
      text: "Reset Password",
      icon: KeyRound,
      link: "/admin/reset-password",
      tile: "from-amber-400 to-orange-500",
    },
    {
      text: "Ask Expert Enquiry",
      icon: ClipboardList,
      link: "/admin/career",
      tile: "from-cyan-400 to-sky-500",
    },
    {
      text: "Contact Us Enquiry",
      icon: MessageCircleQuestion,
      link: "/admin/contact",
      tile: "from-fuchsia-400 to-purple-500",
    },
    {
      text: "Complaints",
      icon: ShieldAlert,
      link: "/admin/complaints",
      tile: "from-rose-400 to-red-500",
    },
    {
      text: "Feedback",
      icon: MessagesSquare,
      link: "/admin/feedback",
      tile: "from-pink-400 to-rose-500",
    },
    {
      text: "Master Data",
      icon: Database,
      link: "/admin/master-data",
      tile: "from-teal-400 to-cyan-600",
      // Children sorted alphabetically by `text`
      children: [
        {
          text: "City",
          link: "/admin/settings/master/cityMaster",
          icon: Map,
        },
        {
          text: "Complaint Category",
          link: "/admin/settings/master/complaintCategory",
          icon: AlertTriangle,
        },
        {
          text: "Country",
          link: "/admin/settings/master/countryMaster",
          icon: Globe,
        },
        {
          text: "Employment Preference",
          link: "/admin/settings/master/employmentType",
          icon: Clock,
        },
        {
          text: "Institute Type",
          link: "/admin/settings/master/instituteType",
          icon: School,
        },
        {
          text: "Job Category",
          link: "/admin/settings/master/jobCategory",
          icon: ClipboardList,
        },
        {
          text: "Job Role",
          link: "/admin/settings/master/jobRole",
          icon: Briefcase,
        },
        {
          text: "Job Status",
          link: "/admin/settings/master/jobStatus",
          icon: BadgeCheck,
        },
        {
          text: "State",
          link: "/admin/settings/master/stateMaster",
          icon: Landmark,
        },
        {
          text: "User Type",
          link: "/admin/settings/master/userType",
          icon: Users,
        },
      ],
    },
  ];

  const bottomItems = [
    // {
    //   text: "Settings",
    //   icon: Settings,
    //   link: "/admin/settings",
    //   tile: "from-slate-400 to-slate-600",
    // },
    // {
    //   text: "Feedback",
    //   icon: MessagesSquare,
    //   link: "/admin/feedback",
    //   tile: "from-pink-400 to-rose-500",
    // },
  ];

  const matches = (item) =>
    item.text.toLowerCase().includes(search.toLowerCase());

  const filteredItems = menuItems.filter(matches);
  const filteredBottomItems = bottomItems.filter(matches);

  const renderItem = (item, index) => {
    if (item.children) {
      const Icon = item.icon;

      return (
        <li key={item.text} className="list-none sb-item">
          <button
            type="button"
            title={!expanded ? item.text : undefined}
            onClick={() => {
              if (!expanded) {
                setExpanded(true);
                setMasterDataOpen(true);
              } else {
                setMasterDataOpen((prev) => !prev);
              }
            }}
            className={`sb-link relative flex h-11 w-full items-center rounded-xl px-2
          transition-all duration-300 group
          ${
            item.children.some((child) =>
              window.location.pathname.startsWith(child.link),
            )
              ? "bg-gradient-to-r from-[#2f6b8a] to-[#4aa3c0] text-white shadow-md"
              : "text-gray-600 hover:bg-blue-50 hover:text-[#2f6b8a]"
          }
          ${expanded ? "justify-start" : "justify-center"}`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg
            bg-gradient-to-br ${item.tile} shadow-sm`}
            >
              <Icon size={17} className="text-white" />
            </span>

            {expanded && (
              <>
                <span className="ml-3 flex-1 text-left text-sm font-medium">
                  {item.text}
                </span>
                {masterDataOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </>
            )}
          </button>

          {expanded && masterDataOpen && (
            <ul className="ml-5 mt-1 space-y-1 border-l-2 border-[#d8e8ef] pl-3">
              {item.children.filter(matches).map((child) => {
                const ChildIcon = child.icon;

                return (
                  <li key={child.link} className="list-none">
                    <NavLink
                      to={child.link}
                      className={({ isActive }) =>
                        `flex min-h-9 items-center gap-2 rounded-lg px-2.5 py-2
                      text-xs font-medium transition-all
                      ${
                        isActive
                          ? "bg-[#e5f2f7] text-[#2f6b8a] ring-1 ring-[#c8e1eb]"
                          : "text-gray-600 hover:bg-white hover:text-[#2f6b8a]"
                      }`
                      }
                    >
                      <ChildIcon size={14} />
                      <span>{child.text}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      );
    }

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
          title={!expanded ? item.text : undefined}
          className={({ isActive }) =>
            `sb-link relative flex items-center h-11 px-2 my-1 rounded-xl overflow-hidden
            transition-all duration-300 group
            ${
              isActive
                ? "sb-shimmer bg-gradient-to-r from-[#2f6b8a] via-[#3a86a8] to-[#4aa3c0] text-white shadow-lg shadow-[#2f6b8a]/30"
                : "text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent hover:text-[#2f6b8a] hover:translate-x-0.5"
            }
            ${expanded ? "justify-start" : "justify-center"}`
          }
        >
          {({ isActive }) => (
            <>
              {/* Animated active indicator bar */}
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
                    expanded ? "w-40 ml-3 opacity-100" : "w-0 ml-0 opacity-0"
                  }`}
              >
                {item.text}
              </span>

              {item.alert && (
                <span
                  className={`absolute z-10 ${
                    expanded
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
      className={`h-screen shrink-0 transition-all duration-300 ${
        expanded ? "w-64" : "w-[72px]"
      }`}
    >
      <style>{styles}</style>

      <nav className="h-full flex flex-col bg-gradient-to-b from-white via-sky-50/40 to-indigo-50/60 border-r border-gray-200 shadow-sm">
        {/* Logo and Collapse Button */}
        <div
          className={`h-16 px-3 flex items-center border-b border-gray-100 ${
            expanded ? "justify-between" : "justify-center"
          }`}
        >
          {expanded && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="sb-logo-badge grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#2f6b8a] to-[#38b2ac] shadow-md shadow-[#2f6b8a]/30">
                <Activity size={18} className="text-white" />
              </span>
              <h2 className="sb-brand font-bold text-xl tracking-wide whitespace-nowrap">
                Ishraq HR
              </h2>
            </div>
          )}

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            className="p-2 rounded-full text-white bg-gradient-to-br from-[#2f6b8a] to-[#4aa3c0]
              shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
          >
            {expanded ? (
              <ChevronsLeft size={14} />
            ) : (
              <ChevronsRight size={14} />
            )}
          </button>
        </div>

        {/* Main Menu */}
        <div className="flex-1 overflow-y-auto common-scrollbar overflow-x-hidden px-2 pt-2">
          <ul className="space-y-1">{filteredItems.map(renderItem)}</ul>

          {filteredItems.length === 0 &&
            filteredBottomItems.length === 0 &&
            expanded && (
              <p className="px-3 py-6 text-center text-sm text-gray-400">
                No menu items match "{search}"
              </p>
            )}
        </div>

        {/* Bottom Menu */}
        <div className="px-2 py-3 border-t border-gray-100">
          <ul className="space-y-1">
            {filteredBottomItems.map((item, i) =>
              renderItem(item, filteredItems.length + i),
            )}
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default AdminSidebar;