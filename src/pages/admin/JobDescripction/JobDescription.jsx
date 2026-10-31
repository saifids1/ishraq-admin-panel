import { useStatusToast } from "../../../components/common/StatusModalProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  Inbox,
  ChevronsRight,
  Plus,
  BriefcaseBusiness,
  UserPlus,
  Users,
  RefreshCw,
} from "lucide-react";
import { StatCardGrid } from "../../../components/common/Dashboardkit";
import { getAllJDByAdmin } from "../../../api/Services/jdfornonregistercompanyApi";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

/* ------------------------------ CONSTANTS ------------------------------ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const TABLE_MIN_WIDTH = 1000;

const COLUMNS = [
  { key: "srNo", width: "70px", minWidth: "60px" },
  { key: "jobId", width: "120px", minWidth: "100px" },
  { key: "organization", width: "220px", minWidth: "160px" },
  { key: "position", width: "220px", minWidth: "160px" },
  { key: "jobCategory", width: "180px", minWidth: "140px" },
  { key: "vacancies", width: "110px", minWidth: "90px" },
  { key: "applicants", width: "120px", minWidth: "100px" },
  { key: "actions", width: "110px", minWidth: "90px", sticky: true },
];

const COL_SPAN_ALL = COLUMNS.length;

const BADGE_BASE =
  "inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

/* ------------------------------ NORMALIZE ------------------------------ */

const firstValue = (item, ...keys) =>
  keys
    .map((key) => item?.[key])
    .find((value) => value !== undefined && value !== null) ?? "";

// Finds the array inside an API response, whatever the wrapper looks like.
const extractList = (response) => {
  const root = response?.data ?? response;
  const candidates = [
    root?.data?.data,
    root?.Data?.Data,
    root?.data,
    root?.Data,
    root,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (Array.isArray(candidate?.data)) return candidate.data;
    if (Array.isArray(candidate?.Data)) return candidate.Data;
  }
  return [];
};

// Maps one /JDByAdmin record (PascalCase or jQ_ keys) into a table row.
const toListRow = (item) => ({
  id: firstValue(
    item,
    "JobDescriptionId",
    "jQ_job_description_id",
    "JQ_job_description_id",
    "jobDescriptionId",
    "id",
  ),
  jobId: firstValue(
    item,
    "JobDescriptionId",
    "jQ_job_description_id",
    "JQ_job_description_id",
    "jobDescriptionId",
    "id",
  ),
  organizationName: firstValue(
    item,
    "instituteTypeName",
    "InstituteTypeName",
    "organizationName",
  ),
  position: firstValue(item, "jobRoleName", "JobRoleName", "position"),
  jobCategory: firstValue(
    item,
    "jobCategoryName",
    "JobCategoryName",
    "jobCategory",
  ),
  vacancies: firstValue(item, "jQ_vacancies", "vacancies", "numberOfVacancies"),
  applicants:
    firstValue(item, "appliedCount", "applicants", "applicantCount") || 0,
});

const JobDescriptionList = () => {
  const navigate = useNavigate();
  const [toast] = useStatusToast();

  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* --------------------------- SCROLL SYNC REFS --------------------------- */

  const headerScrollRef = useRef(null);

  const handleBodyScroll = useCallback((e) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, []);

  /* --------------------------- FETCH --------------------------- */

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAllJDByAdmin();
      setAllJobs(extractList(response).map(toListRow));
    } catch (err) {
      setAllJobs([]);
      toast?.({
        message: getApiErrorMessage(err) || "Unable to load job descriptions.",
        type: "error",
      });
      setError(
        getApiErrorMessage(err) || "Unable to load job description records.",
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  /* --------------------------- FILTER + PAGINATION (client side) --------------------------- */

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allJobs;
    return allJobs.filter((job) =>
      [job.jobId, job.organizationName, job.position, job.jobCategory].some(
        (value) => String(value ?? "").toLowerCase().includes(term),
      ),
    );
  }, [allJobs, search]);

  const count = filteredJobs.length;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  const pageRows = useMemo(
    () =>
      filteredJobs
        .slice(start, start + pageSize)
        .map((row, index) => ({ ...row, srNo: start + index + 1 })),
    [filteredJobs, start, pageSize],
  );

  const pageNumbers = useMemo(() => {
    const win = 5;
    let from = Math.max(1, currentPage - Math.floor(win / 2));
    const to = Math.min(totalPages, from + win - 1);
    from = Math.max(1, to - win + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, totalPages]);

  /* --------------------------- STATS --------------------------- */

  const stats = useMemo(
    () => [
      {
        title: "Total Job Descriptions",
        value: allJobs.length,
        note: "All time",
        icon: BriefcaseBusiness,
        from: "#6366f1",
        to: "#8b5cf6",
        color: "#6366f1",
        color2: "#8b5cf6",
      },
      {
        title: "Total Vacancies",
        value: allJobs.reduce((s, j) => s + Number(j.vacancies || 0), 0),
        note: "Across all jobs",
        icon: UserPlus,
        from: "#f59e0b",
        to: "#ef4444",
        color: "#f59e0b",
        color2: "#fb923c",
      },
      {
        title: "Total Applicants",
        value: allJobs.reduce((s, j) => s + Number(j.applicants || 0), 0),
        note: "Interested across all jobs",
        icon: Users,
        from: "#0ea5e9",
        to: "#2563eb",
        color: "#0ea5e9",
        color2: "#38bdf8",
      },
    ],
    [allJobs],
  );

  /* ---------------------------- STYLES ---------------------------- */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";
  const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a]`;
  const td =
    "border-t border-[#e2e8ee] px-2 py-2 text-[13px] text-slate-900 sm:px-3.5 sm:py-2.5 sm:text-[15px]";
  const btnPrimary =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#16834f] to-[#2fb877] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834f] focus-visible:ring-offset-2";
  const btnRefresh =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2";

  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-2 py-2 text-left text-[12px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)] sm:px-4 sm:py-1.5 sm:text-[15px]";

  const stickyActionsHead =
    "sticky right-0 z-30 w-[110px] min-w-[110px] whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-1 py-2 text-center text-[12px] font-semibold tracking-wide text-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.35)] sm:px-2 sm:py-1.5 sm:text-[15px]";

  const stickyActionsCell =
    "sticky right-0 z-20 w-[110px] min-w-[110px] border-t border-[#e2e8ee] bg-white px-1 py-2 text-center text-[13px] text-slate-900 shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.18)] group-even:bg-[#f9fbfc] group-hover:bg-[#e8f1f6] sm:px-2 sm:py-2.5 sm:text-[15px]";

  /* ---------------------------- RENDER ---------------------------- */

  return (
    <div className="w-full min-w-0">
      <StatCardGrid items={stats} />

      <div className="mx-auto w-full min-w-0 max-w-[1400px] rounded-[14px] border border-[#e2e8ee] bg-white p-2.5 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:p-4 lg:px-5">
        {/* HEADER */}
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
            Job Descriptions
          </h1>

          <div className="flex w-full items-center gap-2.5 md:w-auto">
            <div className="relative w-full md:w-[280px]">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
              />
              <input
                type="search"
                aria-label="Search job descriptions"
                placeholder="Search by job ID, organization, role or category"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] pl-9 pr-3 text-[13px] text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
              />
            </div>

            <button
              type="button"
              title="Refresh table"
              aria-label="Refresh table"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className={`${btnRefresh} disabled:opacity-60`}
            >
              <RefreshCw
                size={15}
                strokeWidth={2.2}
                className={`shrink-0 transition-transform duration-500 ${
                  refreshing ? "animate-spin" : "group-hover:rotate-90"
                }`}
              />
              <span className="hidden sm:inline">
                {refreshing ? "Refreshing..." : "Refresh"}
              </span>
            </button>

            <button
              type="button"
              title="Add"
              onClick={() => navigate("/admin/jdbyadmin/add")}
              className={btnPrimary}
            >
              <Plus
                size={15}
                strokeWidth={2.2}
                className="shrink-0 transition-transform group-hover:scale-110"
              />
              <span>Add</span>
            </button>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="my-3.5 h-px bg-gradient-to-r from-[#2c6b8a]/45 via-[#e2e8ee] to-transparent"
        />

        {/* ERROR */}
        {error && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span className="min-w-0 break-words">{error}</span>
            <button
              type="button"
              onClick={load}
              className="shrink-0 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* TABLE: fixed header + scrollable body */}
        <div className="mt-4 w-full min-w-0">
          <div
            ref={headerScrollRef}
            className="overflow-hidden rounded-t-lg border border-b-0 border-[#cbe1f4]"
          >
            <table
              className="w-full table-fixed border-collapse text-[13px] sm:text-[15px]"
              style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
            >
              <colgroup>
                {COLUMNS.map((c) => (
                  <col key={c.key} style={{ width: c.width, minWidth: c.minWidth }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className={thClass}>Sr.No</th>
                  <th scope="col" className={thClass}>Job ID</th>
                  <th scope="col" className={thClass}>Organization</th>
                  <th scope="col" className={thClass}>Position</th>
                  <th scope="col" className={thClass}>Job Category</th>
                  <th scope="col" className={thClass}>Vacancies</th>
                  <th scope="col" className={thClass}>Applicants</th>
                  <th scope="col" className={stickyActionsHead}>Actions</th>
                </tr>
              </thead>
            </table>
          </div>

          <div
            onScroll={handleBodyScroll}
            className="common-scrollbar h-[330px] w-full min-w-0 overflow-auto rounded-b-lg border border-[#cbe1f4] border-t-0"
          >
            <table
              className="w-full table-fixed border-collapse text-[13px] sm:text-[15px]"
              style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
            >
              <colgroup>
                {COLUMNS.map((c) => (
                  <col key={c.key} style={{ width: c.width, minWidth: c.minWidth }} />
                ))}
              </colgroup>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={COL_SPAN_ALL} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          aria-hidden="true"
                          className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#e8f1f6] border-t-[#2c6b8a]"
                        />
                        <p className="mt-3 text-[14px] text-[#6b7a88] sm:text-[15px]">
                          Loading...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COL_SPAN_ALL}
                      className="border-t border-[#e2e8ee] px-4 py-12 text-center"
                    >
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                        <Inbox size={22} />
                      </div>
                      <p className="mt-3 text-[14px] text-[#1e2b36] sm:text-[15px]">
                        {allJobs.length === 0
                          ? "No job descriptions yet"
                          : "No job descriptions match your search"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, index) => (
                    <tr
                      key={row.id ?? index}
                      className="group transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                    >
                      <td className={`${td} tabular-nums`}>{row.srNo}</td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span className="block truncate font-medium text-slate-900">
                          {row.jobId || "-"}
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span className="block truncate font-medium text-slate-900">
                          {row.organizationName || "-"}
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span className="block truncate font-medium text-slate-900">
                          {row.position || "-"}
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        {row.jobCategory ? (
                          <span className="block truncate text-[12px] sm:text-[14px]">
                            {row.jobCategory}
                          </span>
                        ) : (
                          <span className="text-[#9aa5b1]">-</span>
                        )}
                      </td>

                      <td className={`${td} whitespace-nowrap tabular-nums`}>
                        <strong className="font-semibold">
                          {row.vacancies ?? 0}
                        </strong>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span
                          className={`${BADGE_BASE} !h-6 !min-w-[80px] !px-2 !text-[12px] bg-sky-500 ring-sky-600 shadow-sky-500/20 sm:!h-7 sm:!min-w-[96px] sm:!text-[14px]`}
                        >
                          <Users size={13} strokeWidth={2.4} />
                          {Number(row.applicants || 0)}
                        </span>
                      </td>

                      <td className={stickyActionsCell}>
                        <button
                          type="button"
                          title={`View ${row.position || "job description"}`}
                          aria-label={`View ${row.position || "job description"}`}
                          onClick={() => navigate(`/admin/jdbyadmin/${row.id}`)}
                          className="mx-auto grid h-6 w-6 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
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
        </div>

        {/* PAGINATION */}
        <div className="mt-3.5 flex flex-col gap-3 border-t border-[#e2e8ee] pt-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3.5 text-[13px] text-[#60738a]">
            <span>
              Showing{" "}
              <strong className="font-semibold text-[#53677f]">
                {count ? start + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="font-semibold text-[#53677f]">
                {Math.min(start + pageSize, count)}
              </strong>{" "}
              of{" "}
              <strong className="font-semibold text-[#53677f]">{count}</strong>{" "}
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
                {DEFAULT_PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`${navBtn} disabled:opacity-50`}
            >
              Previous
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
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
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`${navBtn} disabled:opacity-50`}
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionList;