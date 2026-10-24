import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ChevronsRight,
  Inbox,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { StatCardGrid } from "../../../components/common/Dashboardkit";
import { getCurrentUserId } from "../../../utils/authUtils";
import {
  getPayload,
  extractEmployerRecord,
  normalizeEmployer,
  getEmployerRequest,
} from "../../../utils/employerProfile";
import { getEmployerJobRequirementsPaginated } from "../../../api/jobRequirementApi";

/* ------------------------------ CONSTANTS ------------------------------ */

const PAGE_SIZES = [10, 25, 50, 100];
const TABLE_MIN_WIDTH = 1380;

const COLUMNS = [
  { key: "srNo", width: "60px" },
  { key: "jdNo", width: "180px" },
  { key: "position", width: "260px" },
  { key: "instituteType", width: "170px" },
  { key: "jobRole", width: "200px" },
  { key: "jobCategory", width: "180px" },
  { key: "vacancies", width: "110px" },
  { key: "applied", width: "110px" },
  { key: "status", width: "140px" },
  { key: "actions", width: "150px" },
];

const ORG_TYPE_STYLE = {
  Hospital: "bg-sky-600 text-white ring-sky-700",
  Hospitals: "bg-sky-600 text-white ring-sky-700",
  "Diagnostic Lab": "bg-teal-600 text-white ring-teal-700",
  "Home Care": "bg-amber-500 text-white ring-amber-600",
  "Nursing Home": "bg-indigo-600 text-white ring-indigo-700",
  Pharmacy: "bg-violet-600 text-white ring-violet-700",
};

const TONES = {
  success: {
    badge: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20",
    Icon: ShieldCheck,
  },
  danger: {
    badge: "bg-rose-600 ring-rose-700 shadow-rose-600/20",
    Icon: ShieldAlert,
  },
  warning: {
    badge: "bg-amber-500 ring-amber-600 shadow-amber-500/20",
    Icon: ShieldAlert,
  },
  neutral: {
    badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20",
    Icon: ShieldAlert,
  },
};

const BADGE_BASE =
  "inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

const STATUS_TONES = {
  Open: "success",
  Hold: "warning",
  Closed: "danger",
};

const toneOf = (value) => TONES[STATUS_TONES[value]] ?? TONES.neutral;

/* ------------------------------ HELPERS ------------------------------ */

const normalizeJob = (item) => ({
  id: item?.jQ_job_requirement_id,
  jdNo: item?.jQ_job_re_id,
  position: item?.jQ_position_title || "Untitled position",
  department: item?.jQ_department_speciality || "",
  location: item?.jobLocationName || "-",
  instituteType: item?.instituteTypeName || "-",
  jobRole: item?.jobRoleName || "-",
  jobCategory: item?.jobCategoryName || "-",
  vacancies: Number(item?.jQ_vacancies) || 0,
  applied: Number(item?.appliedCount) || 0,
  statusName: item?.jobStatusName || "-",
  isActive: item?.jQ_is_active === true,
});

// Handles the paginated shape { pageNo, pageSize, totalRecords, totalPages, data: [] }
// whether or not the HTTP client wraps it in an extra `data` layer.
const parseResponse = (response) => {
  const body =
    response?.totalRecords !== undefined || Array.isArray(response?.data)
      ? response
      : response?.data ?? response;

  const rows = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body)
      ? body
      : [];

  return {
    rows,
    totalRecords: Number(body?.totalRecords ?? rows.length) || 0,
    totalPages: Math.max(1, Number(body?.totalPages ?? 1) || 1),
  };
};

const Badge = ({ value, className = "" }) => (
  <span title={value} className={`${BADGE_BASE} ${className}`}>
    <span className="truncate">{value}</span>
  </span>
);

/* ------------------------------ COMPONENT ------------------------------ */

const JobRequirementList = () => {
  const navigate = useNavigate();

  const [employer, setEmployer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  /* refs for horizontal scroll sync */
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);

  const employerId = employer?.EM_employer_id;

  /* Step 1: load employer so jobs can be filtered by employer ID. */
  useEffect(() => {
    let cancelled = false;

    const loadEmployer = async () => {
      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error(
            "Your login session could not be identified. Please sign in again.",
          );
        }

        const response = await getEmployerRequest(userId);
        const record = normalizeEmployer(
          extractEmployerRecord(getPayload(response)),
        );

        if (!record || record.EM_employer_id === undefined) {
          throw new Error("Employer details were not returned by the API.");
        }

        if (!cancelled) setEmployer(record);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load employer details.");
          setLoading(false);
        }
      }
    };

    loadEmployer();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  /* Step 2: load job requirements once the employer ID is known. */
  useEffect(() => {
    if (!employerId) return undefined;

    let cancelled = false;

    const loadJobs = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getEmployerJobRequirementsPaginated(employerId, {
          pageNo: page,
          pageSize,
        });

        if (response?.Success === false || response?.success === false) {
          throw new Error(
            response?.Message ||
              response?.message ||
              "Unable to load job requirements.",
          );
        }

        const result = parseResponse(response);

        if (cancelled) return;

        setJobs(result.rows.map(normalizeJob));
        setTotalRecords(result.totalRecords);
        setTotalPages(result.totalPages);
      } catch (err) {
        if (cancelled) return;

        setJobs([]);
        setTotalRecords(0);
        setTotalPages(1);
        setError(
          err?.response?.data?.Message ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load job requirements.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadJobs();

    return () => {
      cancelled = true;
    };
  }, [employerId, page, pageSize, reloadKey]);

  /* sync header & body horizontal scroll */
  useEffect(() => {
    const body = bodyScrollRef.current;
    const header = headerScrollRef.current;
    if (!body || !header) return undefined;

    const onScroll = () => {
      header.scrollLeft = body.scrollLeft;
    };
    body.addEventListener("scroll", onScroll);
    return () => body.removeEventListener("scroll", onScroll);
  }, []);

  /* keep the current page inside the valid range after the total changes */
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  /* --------------------------- REFRESH --------------------------- */

  const handleRefresh = useCallback(() => {
    if (refreshing || loading) return;
    setRefreshing(true);
    setReloadKey((value) => value + 1);
  }, [refreshing, loading]);

  /* --------------------------- STATS --------------------------- */

  const stats = useMemo(() => {
    const openCount = jobs.filter(
      (j) => j.statusName.toLowerCase() === "open",
    ).length;
    const totalVacancies = jobs.reduce((sum, j) => sum + j.vacancies, 0);
    const totalApplicants = jobs.reduce((sum, j) => sum + j.applied, 0);

    return [
      {
        title: "Job requirements posted",
        value: totalRecords,
        note: "All time",
        icon: BriefcaseBusiness,
        color: "#6366f1",
        color2: "#8b5cf6",
        from: "#6366f1",
        to: "#8b5cf6",
      },
      {
        title: "Open jobs",
        value: openCount,
        note: `Of ${jobs.length} on this page`,
        icon: BadgeCheck,
        color: "#10b981",
        color2: "#34d399",
        from: "#10b981",
        to: "#059669",
      },
      {
        title: "Total vacancies",
        value: totalVacancies,
        note: "On this page",
        icon: UserPlus,
        color: "#f59e0b",
        color2: "#fb923c",
        from: "#f59e0b",
        to: "#ef4444",
      },
      {
        title: "Total applicants",
        value: totalApplicants,
        note: "On this page",
        icon: Users,
        color: "#0ea5e9",
        color2: "#38bdf8",
        from: "#0ea5e9",
        to: "#2563eb",
      },
    ];
  }, [jobs, totalRecords]);

  /* --------------------------- PAGINATION --------------------------- */

  const currentPage = Math.min(page, totalPages);
  const start = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalRecords);

  const pageNumbers = useMemo(() => {
    const win = 5;
    let from = Math.max(1, currentPage - Math.floor(win / 2));
    const to = Math.min(totalPages, from + win - 1);
    from = Math.max(1, to - win + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, totalPages]);

  /* ---------------------------- STYLES ---------------------------- */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";
  const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] disabled:cursor-not-allowed disabled:border-[#e2e8ee] disabled:text-[#b8c4d3] disabled:hover:bg-white disabled:hover:text-[#b8c4d3]`;
  const td =
    "border-t border-[#e2e8ee] px-3.5 py-2.5 text-[15px] font-semibold text-slate-900";
  const btnPrimary =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2";
  const btnRefresh =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-left text-[15px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)]";

  const stickyActionsHead =
    "sticky right-0 z-30 whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-center text-[15px] font-semibold tracking-wide text-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.25)]";

  const stickyActionsCell =
    "sticky right-0 z-20 bg-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.15)] group-even:bg-[#f9fbfc] group-hover:bg-[#e8f1f6]";

  const headers = [
    { key: "srNo", label: "Sr.No", className: thClass },
    { key: "jdNo", label: "Job Requirement No", className: thClass },
    { key: "position", label: "Position & Location", className: thClass },
    { key: "instituteType", label: "Institute Type", className: thClass },
    { key: "jobRole", label: "Job Role", className: thClass },
    { key: "jobCategory", label: "Job Category", className: thClass },
    { key: "vacancies", label: "Vacancies", className: thClass },
    { key: "applied", label: "Applied", className: thClass },
    { key: "status", label: "Status", className: thClass },
    { key: "actions", label: "Actions", className: stickyActionsHead },
  ];

  /* ---------------------------- RENDER ---------------------------- */

  return (
    <div>
      <StatCardGrid items={stats} />

      <div className="mx-auto max-w-[1400px] rounded-[14px] border border-[#e2e8ee] bg-white p-4 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:px-5">
        {/* HEADER */}
        <div className="mb-2 flex flex-col items-start justify-between gap-3 xl:flex-row xl:items-center">
          <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
            Job Requirements
          </h1>

          <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto xl:justify-end">
            <button
              type="button"
              title="Refresh table"
              aria-label="Refresh table"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className={btnRefresh}
            >
              <RefreshCw
                size={15}
                strokeWidth={2.2}
                className={`transition-transform duration-500 ${
                  refreshing ? "animate-spin" : "group-hover:rotate-90"
                }`}
              />
              <span className="hidden sm:inline">
                {refreshing ? "Refreshing..." : "Refresh"}
              </span>
            </button>

            <button
              type="button"
              title="Add job requirement"
              onClick={() => navigate("/employer/job-requirements/create")}
              className={btnPrimary}
            >
              <Plus
                size={15}
                strokeWidth={2.2}
                className="transition-transform group-hover:scale-110"
              />
              <span className="hidden sm:inline">Add Job Requirement</span>
            </button>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="my-3.5 h-px bg-gradient-to-r from-[#2c6b8a]/45 via-[#e2e8ee] to-transparent"
        />

        {/* ERROR */}
        {error && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={handleRefresh}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/*
          TABLE LAYOUT
          - Outer wrapper: 370px fixed, rounded border
          - Header strip: fixed, no vertical scrollbar, horizontal-scroll
            synced from body via ref
          - Body: vertical scrollbar only here (scrollbarGutter reserves space)
          - Actions column: sticky right in BOTH header and body
        */}
        <div className="mt-4 h-[370px] overflow-hidden rounded-lg border border-[#cbe1f4]">
          <div className="flex h-full flex-col">
            {/* Header strip */}
            <div ref={headerScrollRef} className="shrink-0 overflow-hidden">
              <table
                className="w-full table-fixed border-collapse text-[15px]"
                style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
              >
                <colgroup>
                  {COLUMNS.map((c) => (
                    <col key={c.key} style={{ width: c.width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h.key} scope="col" className={h.className}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>

            {/* Body */}
            <div
              ref={bodyScrollRef}
              className="common-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-auto"
              style={{ scrollbarGutter: "stable" }}
            >
              <table
                className="w-full table-fixed border-collapse text-[15px]"
                style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
              >
                <colgroup>
                  {COLUMNS.map((c) => (
                    <col key={c.key} style={{ width: c.width }} />
                  ))}
                </colgroup>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={headers.length}
                        className="px-4 py-12 text-center"
                      >
                        <div className="flex flex-col items-center">
                          <span
                            aria-hidden="true"
                            className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#e8f1f6] border-t-[#2c6b8a]"
                          />
                          <p className="mt-3 text-[15px] text-[#6b7a88]">
                            Loading...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={headers.length}
                        className="border-t border-[#e2e8ee] px-4 py-12 text-center"
                      >
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                          <Inbox size={22} />
                        </div>
                        <p className="mt-3 text-[15px] text-[#1e2b36]">
                          No job requirements found
                        </p>
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job, index) => (
                      <tr
                        key={job.id ?? index}
                        style={{
                          animationDelay: `${Math.min(index, 12) * 35}ms`,
                        }}
                        className="js-row group transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                      >
                        <td className={`${td} tabular-nums`}>
                          {start + index}
                        </td>
                        <td className={`${td} tabular-nums`}>
                          {job.jdNo}
                        </td>

                        <td className={`${td} whitespace-nowrap`}>
                          <span className="flex min-w-0 flex-col">
                            <span
                              className="truncate font-medium text-slate-900"
                              title={job.position}
                            >
                              {job.position}
                            </span>
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-[#6b7a88]">
                              <MapPin
                                size={12}
                                className="shrink-0 text-[#9aa5b1]"
                              />
                              <span className="truncate">{job.location}</span>
                            </span>
                          </span>
                        </td>

                        <td className={`${td} whitespace-nowrap`}>
                          <span
                            title={job.instituteType}
                            className={`inline-flex h-7 w-[140px] items-center justify-center rounded-md px-2.5 text-[15px] ring-1 ring-inset whitespace-nowrap shadow-sm ${
                              ORG_TYPE_STYLE[job.instituteType] ||
                              "bg-gray-600 text-white ring-gray-700"
                            }`}
                          >
                            <span className="truncate">
                              {job.instituteType}
                            </span>
                          </span>
                        </td>

                        <td className={`${td} whitespace-nowrap`}>
                          <span className="block truncate" title={job.jobRole}>
                            {job.jobRole}
                          </span>
                        </td>

                        <td className={`${td} whitespace-nowrap`}>
                          <Badge
                            value={job.jobCategory}
                            className="bg-orange-600 text-white ring-orange-700 shadow-orange-600/20"
                          />
                        </td>

                        <td className={`${td} text-center tabular-nums`}>
                          {job.vacancies}
                        </td>

                        <td className={`${td} text-center tabular-nums`}>
                          {job.applied}
                        </td>

                        <td className={`${td} whitespace-nowrap`}>
                          <span
                            className={`${BADGE_BASE} ${
                              toneOf(job.statusName).badge
                            }`}
                          >
                            {job.statusName}
                          </span>
                        </td>

                        <td
                          className={`${td} ${stickyActionsCell} text-center`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              title="View job requirement"
                              aria-label={`View ${job.position}`}
                              onClick={() =>
                                navigate(`/employer/job-requirements/${job.id}`)
                              }
                              className="grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                            >
                              <ChevronsRight size={14} strokeWidth={2.2} />
                            </button>

                            <button
                              type="button"
                              title="Edit job requirement"
                              aria-label={`Edit ${job.position}`}
                              onClick={() =>
                                navigate(
                                  `/employer/job-requirements/${job.id}/edit`,
                                )
                              }
                              className="grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#2c6b8a] to-[#3b86a6] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                            >
                              <Pencil size={13} strokeWidth={2.2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PAGINATION */}
        <div className="mt-3.5 flex flex-col gap-3 border-t border-[#e2e8ee] pt-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3.5 text-[13px] text-[#60738a]">
            <span>
              Showing{" "}
              <strong className="font-semibold text-[#53677f]">{start}</strong>{" "}
              to{" "}
              <strong className="font-semibold text-[#53677f]">{end}</strong>{" "}
              of{" "}
              <strong className="font-semibold text-[#53677f]">
                {totalRecords}
              </strong>{" "}
              entries
            </span>

            <label className="flex items-center gap-1.5">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 cursor-pointer rounded-lg border border-[#dce3eb] bg-white px-2 text-[13px] text-[#34445a] hover:border-[#2c6b8a] focus:border-[#2c6b8a] focus:outline-none focus:ring-2 focus:ring-[#2c6b8a]/30"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <nav
            aria-label="Job requirement pagination"
            className="flex flex-wrap items-center gap-1"
          >
            <button
              type="button"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1 || loading}
              className={navBtn}
            >
              Previous
            </button>

            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                disabled={loading}
                aria-current={n === currentPage ? "page" : undefined}
                className={`${pageBtn} ${
                  n === currentPage
                    ? "bg-gradient-to-br from-[#2c6b8a] to-[#3b86a6] font-semibold text-white shadow-[0_2px_6px_rgba(44,107,138,0.45)] ring-2 ring-[#2c6b8a]/25"
                    : "border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a]"
                }`}
              >
                {n}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages || loading}
              className={navBtn}
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default JobRequirementList;