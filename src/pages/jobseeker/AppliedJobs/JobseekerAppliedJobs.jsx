import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronsRight,
  Search as SearchIcon,
  ChevronDown,
  RotateCcw,
  BriefcaseBusiness,
  Building2,
  MapPin,
  CalendarDays,
  Clock3,
  CircleCheck,
  CircleX,
  UserRound,
} from "lucide-react";

import {
  StatCardGrid,
  DashboardHeader,
  KitStyles,
} from "../../../components/common/Dashboardkit";

import { getJobs } from "./JobRequirementData";

/* ============================================================
   APPLICATION DATA
   ============================================================

   Temporary UI data.

   Later this should come from your API, for example:

   GET /jobseekers/:id/applications

   Expected structure can remain the same:

   {
     id,
     jobId,
     appliedDate,
     applicationStatus
   }

   The job information is then matched from getJobs().
============================================================ */

const DEMO_APPLICATIONS = [
  {
    id: 1,
    jobId: 1,
    appliedDate: "2026-09-28",
    applicationStatus: "Applied",
  },
  {
    id: 2,
    jobId: 2,
    appliedDate: "2026-09-24",
    applicationStatus: "Shortlisted",
  },
  {
    id: 3,
    jobId: 3,
    appliedDate: "2026-09-18",
    applicationStatus: "Interview Scheduled",
  },
  {
    id: 4,
    jobId: 4,
    appliedDate: "2026-09-10",
    applicationStatus: "Rejected",
  },
];

/* ============================================================
   APPLICATION STATUS
============================================================ */

const APPLICATION_STATUSES = [
  "All",
  "Applied",
  "Shortlisted",
  "Interview Scheduled",
  "Selected",
  "Rejected",
];

/* ============================================================
   STATUS STYLE (prominent / solid, matching TYPE_STYLE below)
============================================================ */

const APPLICATION_STATUS_STYLE = {
  Applied: {
    wrapper: "bg-sky-600 text-white ring-sky-700",
    icon: Clock3,
  },

  Shortlisted: {
    wrapper: "bg-violet-600 text-white ring-violet-700",
    icon: UserRound,
  },

  "Interview Scheduled": {
    wrapper: "bg-amber-500 text-white ring-amber-600",
    icon: CalendarDays,
  },

  Selected: {
    wrapper: "bg-emerald-600 text-white ring-emerald-700",
    icon: CircleCheck,
  },

  Rejected: {
    wrapper: "bg-rose-600 text-white ring-rose-700",
    icon: CircleX,
  },
};

/* ============================================================
   JOB TYPE STYLE
============================================================ */

const TYPE_STYLE = {
  "Full Time": "bg-sky-600 text-white ring-sky-700",
  "Part Time": "bg-violet-600 text-white ring-violet-700",
  Contract: "bg-amber-500 text-white ring-amber-600",
  "Visiting Consultant": "bg-teal-600 text-white ring-teal-700",
};

const BADGE_BASE =
  "inline-flex h-7 w-[100px] overflow-hidden items-center justify-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium ring-1 ring-inset whitespace-nowrap";

/* ============================================================
   APPLICATION STATUS BADGE
============================================================ */

const ApplicationStatusBadge = ({ status }) => {
  const config =
    APPLICATION_STATUS_STYLE[status] || APPLICATION_STATUS_STYLE.Applied;

  const Icon = config.icon;

  return (
    <span className={`${BADGE_BASE} ${config.wrapper}`}>
      <Icon size={13} strokeWidth={2.2} />

      {status || "Applied"}
    </span>
  );
};

/* ============================================================
   JOB STATUS BADGE
============================================================ */

const JobStatusBadge = ({ status }) => {
  const open = status === "Open";

  return (
    <span
      className={`${BADGE_BASE} ${
        open
          ? "bg-emerald-600 text-white ring-emerald-700"
          : "bg-slate-500 text-white ring-slate-600"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${open ? "bg-white" : "bg-slate-200"}`}
      />

      {status || "-"}
    </span>
  );
};

/* ============================================================
   EMPLOYMENT TYPE BADGE
============================================================ */

const TypeBadge = ({ type }) => (
  <span
    className={`${BADGE_BASE} ${
      TYPE_STYLE[type] || "bg-gray-600 text-white ring-gray-700"
    }`}
  >
    {type || "-"}
  </span>
);

/* ============================================================
   SELECT
============================================================ */

const Select = ({ label, value, onChange, options }) => (
  <div className="relative min-w-[200px] flex-1 xl:flex-none">
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="
        h-9
        w-full
        cursor-pointer
        appearance-none
        rounded-lg
        border
        border-[#c9d5dd]
        bg-white
        px-3
        pr-9
        text-[14px]
        font-medium
        text-[#34445a]
        outline-none
        transition
        hover:border-[#2c6b8a]
        focus:border-[#2c6b8a]
        focus:ring-2
        focus:ring-[#2c6b8a]/30
      "
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option === "All" ? `${label}: All` : option}
        </option>
      ))}
    </select>

    <ChevronDown
      size={15}
      className="
        pointer-events-none
        absolute
        right-3
        top-1/2
        -translate-y-1/2
        text-[#9aa5b1]
      "
    />
  </div>
);

/* ============================================================
   PAGE
============================================================ */

const JobseekerAppliedJobs = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [sort, setSort] = useState({
    key: null,
    dir: null,
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /*
   * Merge application information with job information.
   *
   * Later, replace DEMO_APPLICATIONS with API data.
   */
  const applications = useMemo(() => {
    const jobs = getJobs();

    return DEMO_APPLICATIONS.map((application) => {
      const job = jobs.find(
        (item) => String(item.id) === String(application.jobId),
      );

      if (!job) return null;

      return {
        ...application,
        ...job,
      };
    }).filter(Boolean);
  }, []);

  /* ==========================================================
     STATS
  ========================================================== */

  const stats = useMemo(() => {
    const total = applications.length;

    const active = applications.filter(
      (item) => item.applicationStatus !== "Rejected",
    ).length;

    const shortlisted = applications.filter(
      (item) =>
        item.applicationStatus === "Shortlisted" ||
        item.applicationStatus === "Interview Scheduled",
    ).length;

    const selected = applications.filter(
      (item) => item.applicationStatus === "Selected",
    ).length;

    return {
      total,
      active,
      shortlisted,
      selected,
    };
  }, [applications]);

  /* ==========================================================
     KPI CARDS (same shape StatCardGrid uses on the dashboards,
     so colors/icons/layout stay consistent app-wide)
  ========================================================== */


  /* ==========================================================
     FILTER
  ========================================================== */

  const isFiltered = search.trim() !== "" || statusFilter !== "All";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPage(1);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = applications.filter((application) => {
      const searchableText = [
        application.organizationName,
        application.position,
        application.department,
        application.location,
        application.employmentType,
        application.applicationStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !searchableText.includes(query)) {
        return false;
      }

      if (
        statusFilter !== "All" &&
        application.applicationStatus !== statusFilter
      ) {
        return false;
      }

      return true;
    });

    if (sort.key) {
      rows.sort((a, b) => {
        const first = a[sort.key] ?? "";
        const second = b[sort.key] ?? "";

        const comparison = String(first).localeCompare(String(second));

        return sort.dir === "asc" ? comparison : -comparison;
      });
    }

    return rows;
  }, [applications, search, statusFilter, sort]);

  /* ==========================================================
     PAGINATION
  ========================================================== */

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const currentPage = Math.min(page, totalPages);

  const start = (currentPage - 1) * pageSize;

  const pageRows = filtered.slice(start, start + pageSize);

  const pageNumbers = useMemo(() => {
    const windowSize = 5;

    let from = Math.max(1, currentPage - Math.floor(windowSize / 2));

    const to = Math.min(totalPages, from + windowSize - 1);

    from = Math.max(1, to - windowSize + 1);

    return Array.from(
      {
        length: to - from + 1,
      },
      (_, index) => from + index,
    );
  }, [currentPage, totalPages]);

  /* ==========================================================
     HELPERS
  ========================================================== */

  const formatDate = (date) => {
    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* ==========================================================
     CLASSES
  ========================================================== */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[12.5px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";

  const td = "border-t border-[#e2e8ee] px-3.5 py-3 text-[14px] text-slate-900";

  /* ==========================================================
     RENDER
  ========================================================== */
  const Styles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
      .jp-page { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; }
      @keyframes jp-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
      @keyframes jp-pop { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: none; } }
      @keyframes jp-fade { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }
      @keyframes jp-halo { 0%,100% { transform: scale(1); opacity: .55; } 50% { transform: scale(1.15); opacity: .15; } }
      @keyframes jp-ping { 75%,100% { transform: scale(2.4); opacity: 0; } }
      @keyframes jp-float { 50% { transform: translateY(10px) scale(1.1); } }
      @keyframes jp-bob { 50% { transform: translateY(-3px) rotate(-8deg); } }
      @keyframes jp-shift { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
      .jp-up { animation: jp-up .55s cubic-bezier(.2,.8,.2,1) both; }
      .jp-pop { animation: jp-pop .35s cubic-bezier(.3,1.4,.5,1) both; }
      .jp-tab { animation: jp-fade .35s ease both; }
      .jp-halo { animation: jp-halo 2.4s ease-in-out infinite; }
      .jp-ping { animation: jp-ping 1.6s cubic-bezier(0,0,.2,1) infinite; }
      .jp-bob { animation: jp-bob 2.6s ease-in-out infinite; }
      .jp-orb { position: absolute; border-radius: 9999px; pointer-events: none; background: rgba(255,255,255,.16); }
      .jp-orb-a { width: 86px; height: 86px; right: -24px; top: -28px; animation: jp-float 4s ease-in-out infinite; }
      .jp-orb-b { width: 56px; height: 56px; right: 34px; bottom: -32px; background: rgba(255,255,255,.10); animation: jp-float 5s ease-in-out infinite reverse; }
      .jp-hero { background-size: 200% 200%; animation: jp-shift 10s linear infinite alternate; }
      @media (prefers-reduced-motion: reduce) {
        .jp-up,.jp-pop,.jp-tab,.jp-halo,.jp-ping,.jp-bob,.jp-orb,.jp-hero { animation: none !important; }
      }
    `}</style>
  );
  return (
    <div className="isharq-dash min-h-full text-[#1e2b36]">
      {Styles}

      {/* ======================================================
          SUMMARY (shared StatCardGrid — same colors/icons as
          the dashboards)
      ====================================================== */}


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="mx-auto mt-3 max-w-[1400px] rounded-[12px] border border-[#e2e8ee] bg-white p-2 shadow-sm sm:px-[18px]">
        {/* ====================================================
            FILTERS
        ==================================================== */}

        <div className="mb-2 flex flex-col items-start justify-between gap-3 xl:flex-row xl:items-center">
          <div>
            <h2 className="m-0 text-[20px] font-extrabold text-[#2c6b8a]">
              Application History
            </h2>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto">
            {/* SEARCH */}

            <div className="relative min-w-[320px] flex-1 xl:flex-none">
              <SearchIcon
                size={15}
                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-[#9aa5b1]
                "
              />

              <input
                type="search"
                aria-label="Search applied jobs"
                placeholder="Search position, organization, location"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="
                  h-9
                  w-full
                  rounded-lg
                  border
                  border-[#c9d5dd]
                  bg-white
                  pl-9
                  pr-3
                  text-[14px]
                  text-[#1e2b36]
                  outline-none
                  transition
                  placeholder:text-[#9aa5b1]
                  hover:border-[#2c6b8a]
                  focus:border-[#2c6b8a]
                  focus:ring-2
                  focus:ring-[#2c6b8a]/30
                "
              />
            </div>

            <Select
              label="Status"
              value={statusFilter}
              options={APPLICATION_STATUSES}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            />

            {/* RESET */}

            <button
              type="button"
              onClick={resetFilters}
              disabled={!isFiltered}
              title="Reset filters"
              className="
                group
                inline-flex
                h-9
                shrink-0
                cursor-pointer
                items-center
                gap-1.5
                rounded-lg
                px-2.5
                text-[14px]
                font-medium
                text-[#d64545]
                transition
                hover:bg-[#fbe9e9]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <RotateCcw
                size={14}
                className="
                  transition-transform
                  duration-300
                  group-enabled:group-hover:-rotate-180
                "
              />
              Reset
            </button>
          </div>
        </div>

        <hr />

        {/* ====================================================
            TABLE
        ==================================================== */}

        <div className="common-scrollbar h-[46vh] mt-4 overflow-auto rounded-lg border border-[#cbe1f4]">
          <table className="w-full border-collapse text-[14px]">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-3.5 py-3 text-left text-[14px] font-bold text-white">
                  Sr.No
                </th>
                <th className="bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-3.5 py-3 text-left text-[14px] font-bold text-white">
                  Job Status
                </th>

                <th className="bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-3.5 py-3 text-left text-[14px] font-bold text-white">
                  Organization
                </th>

                <th className="bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-3.5 py-3 text-left text-[14px] font-bold text-white">
                  Job
                </th>

                <th className="bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-3.5 py-3 text-left text-[14px] font-bold text-white">
                  Type
                </th>

                <th className="bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-3.5 py-3 text-left text-[14px] font-bold text-white">
                  Applied On
                </th>

                <th className="bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-3.5 py-3 text-left text-[14px] font-bold text-white">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="border-t border-[#e2e8ee] px-4 py-14 text-center"
                  >
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a]">
                      <BriefcaseBusiness size={22} />
                    </div>

                    <p className="mt-3 text-[15px] font-medium text-[#1e2b36]">
                      {isFiltered
                        ? "No applications match these filters"
                        : "No job applications yet"}
                    </p>

                    <p className="mt-1 text-[13px] text-[#6b7a88]">
                      {isFiltered
                        ? "Try a different search or clear the filters."
                        : "Jobs applied by this jobseeker will appear here."}
                    </p>

                    {isFiltered && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-3 cursor-pointer rounded-lg bg-[#2c6b8a] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#245a75]"
                      >
                        Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                pageRows.map((application, index) => (
                  <tr
                    key={application.id}
                    className="
                      group
                      transition-colors
                      even:bg-[#f9fbfc]
                      hover:bg-[#e8f1f6]
                    "
                  >
                    {/* SR NO */}

                    <td className={`${td} tabular-nums`}>
                      {start + index + 1}
                    </td>

                    {/* JOB STATUS */}

                    <td className={td}>
                      <JobStatusBadge status={application.status} />
                    </td>

                    {/* ORGANIZATION */}

                    <td className={`${td} whitespace-nowrap`}>
                      <div className="flex flex-col">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Building2
                            size={13}
                            className="shrink-0 text-[#2c6b8a]"
                          />
                          {application.organizationName || "-"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={13} className="shrink-0 text-[#6b7a88]" />
                          {application.location || "-"}
                        </span>
                      </div>
                    </td>

                    {/* JOB */}

                    <td className={td}>
                      <div className="min-w-[190px]">
                        <p className="font-semibold text-[#1e2b36]">
                          {application.position || "-"}
                        </p>

                        {application.department && (
                          <p className="mt-0.5 text-[12px] text-[#6b7a88]">
                            {application.department}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* TYPE */}

                    <td className={td}>
                      <TypeBadge type={application.employmentType} />
                    </td>

                    {/* APPLIED DATE */}

                    <td className={`${td} whitespace-nowrap`}>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={13} className="text-[#6b7a88]" />

                        {formatDate(application.appliedDate)}
                      </span>
                    </td>

                    {/* ACTIONS */}

                    <td className={td}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/jobseeker/applications/${application.id}`)
                        }
                        title="View job"
                        aria-label={`View ${application.position}`}
                        className="
                          grid
                          h-7
                          w-7
                          cursor-pointer
                          place-items-center
                          rounded-md
                          bg-gradient-to-br
                          from-[#168fa1]
                          to-[#35b8c4]
                          text-white
                          shadow-sm
                          transition
                          hover:-translate-y-0.5
                          hover:shadow-md
                          focus:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-[#1a9aa8]
                          focus-visible:ring-offset-2
                        "
                      >
                        <ChevronsRight size={14} strokeWidth={2.2} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ====================================================
            PAGINATION
        ==================================================== */}

        <div className="mt-3.5 flex flex-col gap-3 border-t border-[#e2e8ee] pt-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3.5 text-[12.5px] text-[#60738a]">
            <span>
              Showing{" "}
              <strong className="font-semibold text-[#53677f]">
                {filtered.length ? start + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="font-semibold text-[#53677f]">
                {Math.min(start + pageSize, filtered.length)}
              </strong>{" "}
              of{" "}
              <strong className="font-semibold text-[#53677f]">
                {filtered.length}
              </strong>{" "}
              entries
            </span>

            <label className="flex items-center gap-1.5">
              <span>Show:</span>

              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="
                  h-8
                  cursor-pointer
                  rounded-lg
                  border
                  border-[#dce3eb]
                  bg-white
                  px-2
                  text-[12.5px]
                  text-[#34445a]
                  hover:border-[#2c6b8a]
                  focus:border-[#2c6b8a]
                  focus:outline-none
                  focus:ring-2
                  focus:ring-[#2c6b8a]/30
                "
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <nav
            aria-label="Pagination"
            className="flex flex-wrap items-center gap-1"
          >
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:bg-[#e8f1f6] disabled:cursor-not-allowed disabled:text-[#b8c4d3]`}
            >
              Previous
            </button>

            {pageNumbers.map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                aria-current={number === currentPage ? "page" : undefined}
                className={`${pageBtn} ${
                  number === currentPage
                    ? "bg-gradient-to-br from-[#2c6b8a] to-[#3b86a6] font-semibold text-white shadow-sm"
                    : "border border-[#dce3eb] bg-white text-[#34445a] hover:bg-[#e8f1f6]"
                }`}
              >
                {number}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:bg-[#e8f1f6] disabled:cursor-not-allowed disabled:text-[#b8c4d3]`}
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default JobseekerAppliedJobs;
