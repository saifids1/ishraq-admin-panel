import React, { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  BookUser,
  Building2,
  KeyRound,
  ClipboardList,
  MessageCircleQuestion,
  ShieldAlert,
  MessagesSquare,
  NotebookDot,
  ChevronDown,
  ChevronRight,
  Database,
  School,
  Briefcase,
  Globe,
  Landmark,
  Map,
  Clock,
  Users,
  AlertTriangle,
  BadgeCheck,
  X as CloseIcon,
} from "lucide-react";

/* ------------------------------ STYLES ------------------------------ */

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

.sb-item { animation: sbSlideIn .45s cubic-bezier(.2,.8,.2,1) both; }
.sb-link:hover .sb-icon { animation: sbWiggle .55s ease-in-out; }
.sb-shimmer::after {
  content: "";
  position: absolute; inset: 0;
  width: 40%;
  background: linear-gradient(110deg, transparent, rgba(255,255,255,.35), transparent);
  animation: sbShimmer 2.8s ease-in-out infinite;
}
.sb-ping { animation: sbPing 1.6s ease-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .sb-item, .sb-ping,
  .sb-shimmer::after, .sb-link:hover .sb-icon { animation: none !important; }
}
`;

/* ------------------------------ HOOKS ------------------------------ */

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < breakpoint,
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
};

/* ------------------------------ MENU ------------------------------ */

const MENU_ITEMS = [
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
    text: "Complaints",
    icon: ShieldAlert,
    link: "/admin/complaints",
    tile: "from-rose-400 to-red-500",
  },
  {
    text: "Contact Us Enquiry",
    icon: MessageCircleQuestion,
    link: "/admin/contact",
    tile: "from-fuchsia-400 to-purple-500",
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
    children: [
      { text: "City", link: "/admin/settings/master/cityMaster", icon: Map },
      {
        text: "Complaint Category",
        link: "/admin/settings/master/complaintCategory",
        icon: AlertTriangle,
      },
      { text: "Country", link: "/admin/settings/master/countryMaster", icon: Globe },
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

const BOTTOM_ITEMS = [];

/* ------------------------------ COMPONENT ------------------------------ */

export const AdminSidebar = ({ open = false, onClose }) => {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();

  const [expanded, setExpanded] = useState(true);

  const isMasterPath =
    pathname.startsWith("/admin/master-data") ||
    pathname.startsWith("/admin/settings/master");

  const [masterDataOpen, setMasterDataOpen] = useState(isMasterPath);

  useEffect(() => {
    if (isMasterPath) setMasterDataOpen(true);
  }, [isMasterPath]);

  useEffect(() => {
    if (isMobile) setExpanded(true);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && open) onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* Lock body scroll while the mobile drawer is open */
  useEffect(() => {
    if (!isMobile) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, open]);

  const toggleAccordion = useCallback(() => {
    if (!expanded) {
      setExpanded(true);
      setMasterDataOpen(true);
      return;
    }
    setMasterDataOpen((prev) => !prev);
  }, [expanded]);

  /* --------------------------- ACTIVE MATCHERS --------------------------- */

  // Exact match OR a child path of it (e.g. /admin/settings/master/cityMaster/5)
  const isLinkActive = useCallback(
    (link) => pathname === link || pathname.startsWith(`${link}/`),
    [pathname],
  );

  /* --------------------------- SHARED RENDERERS --------------------------- */

  const renderItem = (item, index) => {
    if (item.children) {
      const Icon = item.icon;
      const parentActive = item.children.some((child) =>
        isLinkActive(child.link),
      );

      return (
        <li key={item.text} className="list-none">
          <button
            type="button"
            title={!expanded ? item.text : undefined}
            onClick={toggleAccordion}
            className={`sb-link relative flex h-11 w-full items-center rounded-xl px-2
              transition-all duration-300 group
              ${
                parentActive
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
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                const childActive = isLinkActive(child.link);

                return (
                  <li key={child.link} className="list-none">
                    <NavLink
                      to={child.link}
                      end
                      className={() =>
                        `flex min-h-9 items-center gap-2 rounded-lg px-2.5 py-2
                          text-xs font-medium transition-all
                          ${
                            childActive
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
            `sb-link relative flex items-center h-11 px-2 my-1 rounded-xl
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
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-white
                  transition-all duration-300 ${
                    isActive ? "h-6 opacity-100" : "h-0 opacity-0"
                  }`}
              />

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

  /* --------------------------- MOBILE DRAWER --------------------------- */

  if (isMobile) {
    return (
      <>
        <div
          aria-hidden="true"
          onClick={onClose}
          className={`fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />

        <aside
          aria-label="Sidebar navigation"
          aria-hidden={!open}
          className={`fixed inset-y-0 left-0 z-[80] flex w-[260px] max-w-[85vw] flex-col transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <style>{styles}</style>

          <nav className="flex h-full flex-col border-r border-gray-200 bg-gradient-to-b from-white via-sky-50/40 to-indigo-50/60 shadow-xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-3">
              <img
                src="/IshraqHR.png"
                alt="Ishraq logo"
                className="h-10 w-auto shrink-0"
              />
              <button
                type="button"
                onClick={onClose}
                title="Close sidebar"
                aria-label="Close sidebar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#2f6b8a] to-[#4aa3c0] text-white shadow-md transition hover:shadow-lg hover:brightness-105 active:scale-95"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="common-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-3">
              <ul className="space-y-1">{MENU_ITEMS.map(renderItem)}</ul>
            </div>

            {BOTTOM_ITEMS.length > 0 && (
              <div className="shrink-0 border-t border-gray-100 px-2 py-3">
                <ul className="space-y-1">
                  {BOTTOM_ITEMS.map((item, i) =>
                    renderItem(item, MENU_ITEMS.length + i),
                  )}
                </ul>
              </div>
            )}
          </nav>
        </aside>
      </>
    );
  }

  /* --------------------------- DESKTOP / TABLET --------------------------- */

  return (
    <aside
      className={`hidden h-screen shrink-0 transition-all duration-300 md:flex ${
        expanded ? "w-64" : "w-[72px]"
      }`}
    >
      <style>{styles}</style>

      <nav className="flex h-full w-full flex-col border-r border-gray-200 bg-gradient-to-b from-white via-sky-50/40 to-indigo-50/60 shadow-sm">
        <div
          className={`flex h-16 items-center border-b border-gray-100 px-3 ${
            expanded ? "justify-between" : "justify-center"
          }`}
        >
          {expanded && (
            <img
              src="/IshraqHR.png"
              alt="Ishraq logo"
              className="h-12 w-auto shrink-0"
            />
          )}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            className="rounded-full bg-gradient-to-br from-[#2f6b8a] to-[#4aa3c0] p-2 text-white shadow-md transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95"
          >
            {expanded ? (
              <ChevronsLeft size={14} />
            ) : (
              <ChevronsRight size={14} />
            )}
          </button>
        </div>

        <div className="common-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-3">
          <ul className="space-y-1">{MENU_ITEMS.map(renderItem)}</ul>
        </div>

        {BOTTOM_ITEMS.length > 0 && (
          <div className="border-t border-gray-100 px-2 py-3">
            <ul className="space-y-1">
              {BOTTOM_ITEMS.map((item, i) =>
                renderItem(item, MENU_ITEMS.length + i),
              )}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
};

export default AdminSidebar;