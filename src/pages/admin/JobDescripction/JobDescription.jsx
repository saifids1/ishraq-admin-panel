import { useStatusToast } from "../../../components/common/StatusModalProvider";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Search as SearchIcon,
  X as CloseIcon,
  Inbox,
  UserRoundCheck,
  UserRoundX,
  ChevronsRight,
  Plus,
  BriefcaseBusiness,
  BadgeCheck,
  UserPlus,
  Users,
  Flag,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { StatCardGrid } from "../../../components/common/Dashboardkit";
import jdfornonregistercompanyApi from "../../../api/Services/jdfornonregistercompanyApi";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

/* ------------------------------ CONSTANTS ------------------------------ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const TABLE_MIN_WIDTH = 1560;

const COLUMNS = [
  { key: "srNo", width: "55px", minWidth: "50px" },
  { key: "requestId", width: "170px", minWidth: "130px" },
  { key: "organization", width: "200px", minWidth: "150px" },
  { key: "position", width: "180px", minWidth: "140px" },
  { key: "status", width: "120px", minWidth: "90px" },
  { key: "requirementStatus", width: "150px", minWidth: "110px" },
  { key: "jobCategory", width: "160px", minWidth: "120px" },
  { key: "vacancies", width: "100px", minWidth: "85px" },
  { key: "applicants", width: "110px", minWidth: "90px" },
  { key: "actions", width: "110px", minWidth: "90px", sticky: true },
];

const COL_SPAN_ALL = COLUMNS.length;

const TONES = {
  success: { badge: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20" },
  danger: { badge: "bg-rose-600 ring-rose-700 shadow-rose-600/20" },
  warning: { badge: "bg-amber-500 ring-amber-600 shadow-amber-500/20" },
  neutral: { badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20" },
};

const STATUS_TONES = {
  Open: "success",
  Closed: "danger",
  Paused: "warning",
  Active: "success",
  Inactive: "danger",
  Draft: "neutral",
};

const toneOf = (value) => TONES[STATUS_TONES[value]] ?? TONES.neutral;

const BADGE_BASE =
  "inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

/* ------------------------------ NORMALIZE ------------------------------ */

const firstValue = (item, ...keys) =>
  keys
    .map((key) => item?.[key])
    .find((value) => value !== undefined && value !== null) ?? "";

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

const parseListResponse = (response) => {
  const root = response?.data ?? response;
  const payload = root?.data ?? root?.Data ?? root;
  const list = Array.isArray(payload)
    ? payload
    : payload?.data ?? payload?.Data ?? [];

  return {
    list: Array.isArray(list) ? list : [],
    totalRecords: Number(
      root?.totalRecords ?? payload?.totalRecords ?? list.length,
    ),
    totalPages: Number(root?.totalPages ?? payload?.totalPages ?? 0),
  };
};

const toListRow = (item, srNo) => {
  const status = firstValue(
    item,
    "jobStatusName",
    "status",
    "JQ_status",
    "JS_name",
  );
  const activeValue = firstValue(
    item,
    "jQ_is_active",
    "JQ_is_active",
    "isActive",
  );
  const hasActiveValue = activeValue !== "";
  const isActive = hasActiveValue
    ? [true, 1, "1", "true", "True"].includes(activeValue)
    : status === "Open" || status === "Active";

  return {
    ...item,
    id: firstValue(
      item,
      "jQ_job_requirement_id",
      "JQ_job_requirement_id",
      "JQ_id",
      "jobRequirementId",
      "id",
    ),
    requestId: firstValue(
      item,
      "jQ_job_re_id",
      "JQ_job_re_id",
      "jQ_request_no",
      "requestNo",
      "requestId",
    ),
    organizationName: firstValue(
      item,
      "employerName",
      "organizationName",
      "JQ_organization_name",
      "JQ_organizationName",
      "organization_name",
    ),
    position: firstValue(
      item,
      "jQ_position_title",
      "JQ_position_title",
      "position",
      "JQ_position",
      "JQ_position_required",
      "positionRequired",
    ),
    department: firstValue(
      item,
      "jQ_department_speciality",
      "JQ_department_speciality",
      "department",
      "JQ_department",
      "departmentSpeciality",
    ),
    employmentType: firstValue(
      item,
      "employmentTypeName",
      "employmentType",
      "ET_name",
      "ET_employment_type_name",
      "JQ_employment_type",
      "employment_type",
    ),
    jobCategory: firstValue(
      item,
      "jobCategoryName",
      "jobCategory",
      "JC_name",
      "JQ_job_category",
    ),
    vacancies: firstValue(
      item,
      "jQ_vacancies",
      "JQ_vacancies",
      "vacancies",
      "JQ_number_of_vacancies",
      "numberOfVacancies",
    ),
    applicants:
      firstValue(
        item,
        "appliedCount",
        "applicants",
        "applicantCount",
        "JQ_applicants",
      ) || 0,
    location: firstValue(
      item,
      "jobLocationName",
      "location",
      "JQ_job_location",
      "jobLocation",
    ),
    isActive,
    status: hasActiveValue ? (isActive ? "Active" : "Inactive") : status || "-",
    requirementStatus: status || "-",
    requirementStatusId: firstValue(
      item,
      "jQ_job_status_id",
      "JQ_job_status_id",
      "jobStatusId",
    ),
    deadline: firstValue(item, "jQ_deadline", "JQ_deadline", "deadline"),
    srNo,
  };
  };

const JobDescriptionList = () => {
  const navigate = useNavigate();
  const [toast] = useStatusToast();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [query, setQuery] = useState({
    search: "",
    isActive: "All",
  });

  const [busy, setBusy] = useState(false);

  const [statusDialog, setStatusDialog] = useState(null);
  const [jobStatuses, setJobStatuses] = useState([]);
  const [statusForm, setStatusForm] = useState({
    jobStatusId: "",
    deadline: "",
  });
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");

  /* --------------------------- SCROLL SYNC REFS --------------------------- */

  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);

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
      const params = { pageNo: page, pageSize, JQ_is_CreatedByAdmin : true, JQ_employer_id : null };
      if (query.search.trim()) params.search = query.search.trim();
      if (query.isActive !== "All")
        params.isActive = query.isActive === "Active";

      const response = await jdfornonregistercompanyApi.getJobDescription(params);
      const result = parseListResponse(response);

      setJobs(
        result.list.map((item, index) =>
          toListRow(item, (page - 1) * pageSize + index + 1)
        ),
      );
      setTotalRecords(result.totalRecords);
      setTotalPages(
        result.totalPages ||
          Math.max(1, Math.ceil(result.totalRecords / pageSize)),
      );
    } catch (err) {
      setJobs([]);
      setTotalRecords(0);
      setTotalPages(0);
      setError(
        getApiErrorMessage(err) || "Unable to load job description records.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query]);

  useEffect(() => {
    load();
  }, [load]);

  /* --------------------------- REFRESH --------------------------- */

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load, refreshing]);

  /* --------------------------- STATS --------------------------- */

  const stats = useMemo(
    () => [
      {
        title: "Total Job Descriptions",
        value: totalRecords,
        note: "All time",
        icon: BriefcaseBusiness,
        from: "#6366f1",
        to: "#8b5cf6",
        color: "#6366f1",
        color2: "#8b5cf6",
      },
      {
        title: "Active Jobs",
        value: jobs.filter((j) => j.isActive).length,
        note: "Active requirements",
        icon: BadgeCheck,
        from: "#10b981",
        to: "#059669",
        color: "#10b981",
        color2: "#34d399",
      },
      {
        title: "Total Vacancies",
        value: jobs.reduce((s, j) => s + Number(j.vacancies || 0), 0),
        note: "Across all jobs",
        icon: UserPlus,
        from: "#f59e0b",
        to: "#ef4444",
        color: "#f59e0b",
        color2: "#fb923c",
      },
      {
        title: "Total Applicants",
        value: jobs.reduce((s, j) => s + Number(j.applicants || 0), 0),
        note: "Interested across all jobs",
        icon: Users,
        from: "#0ea5e9",
        to: "#2563eb",
        color: "#0ea5e9",
        color2: "#38bdf8",
      },
    ],
    [jobs, totalRecords],
  );

  /* --------------------------- TOGGLE --------------------------- */

  const handleToggle = async (row) => {
    setBusy(true);
    try {
      await jdfornonregistercompanyApi.toggleActive?.(row.id, !row.isActive);
      await load();
      toast?.({
        message: `Job description ${!row.isActive ? "activated" : "deactivated"} successfully.`,
        type: "success",
      });
    } catch (err) {
      toast?.({
        message: getApiErrorMessage(err) || "Failed to toggle status.",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const patchFilter = (patch) => {
    setQuery((q) => ({ ...q, ...patch }));
    setPage(1);
  };

  /* --------------------------- PAGINATION --------------------------- */

  const count = totalRecords;
  const totalPagesLocal = Math.max(1, totalPages);
  const currentPage = Math.min(page, totalPagesLocal);
  const start = (currentPage - 1) * pageSize;
  const pageRows = jobs;

  const pageNumbers = useMemo(() => {
    const win = 5;
    let from = Math.max(1, currentPage - Math.floor(win / 2));
    const to = Math.min(totalPagesLocal, from + win - 1);
    from = Math.max(1, to - win + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, totalPagesLocal]);

  /* --------------------------- STATUS DIALOG --------------------------- */

  const openStatusDialog = async (row) => {
    setStatusDialog(row);
    setStatusForm({
      jobStatusId: row.requirementStatusId ?? "",
      deadline: row.deadline ? String(row.deadline).slice(0, 10) : "",
    });
    setStatusError("");
    setStatusLoading(true);

    try {
      const response = await jdfornonregistercompanyApi.getJobStatuses();
      setJobStatuses(extractList(response));
    } catch (err) {
      setStatusError(getApiErrorMessage(err) || "Unable to load job statuses.");
    } finally {
      setStatusLoading(false);
    }
  };

  const closeStatusDialog = () => {
    setStatusDialog(null);
    setStatusError("");
  };

  const submitStatusUpdate = async (e) => {
    e.preventDefault();
    if (!statusDialog) return;
    setStatusSaving(true);
    setStatusError("");
    try {
      if (jdfornonregistercompanyApi.updateStatusAndDeadline) {
        await jdfornonregistercompanyApi.updateStatusAndDeadline(
          statusDialog.id,
          { jobStatusId: statusForm.jobStatusId, deadline: statusForm.deadline },
        );
      }
      await load();
      closeStatusDialog();
      toast?.({
        message: "Job description status updated successfully.",
        type: "success",
      });
    } catch (err) {
      setStatusError(getApiErrorMessage(err) || "Failed to update status.");
    } finally {
      setStatusSaving(false);
    }
  };

  /* ---------------------------- STYLES ---------------------------- */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";
  const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a]`;
  const td =
    "border-t border-[#e2e8ee] px-2 py-2 text-[13px] text-slate-900 sm:px-3.5 sm:py-2.5 sm:text-[15px]";
  const filterInput =
    "h-9 w-full cursor-pointer appearance-none rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] px-3 pr-9 text-[14px] font-medium text-[#34445a] outline-none transition hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30";
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

          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center md:w-auto">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 py-2 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]/30"
            >
              <SlidersHorizontal size={14} strokeWidth={2.2} />
              <span className="inline">{showFilters ? "Hide" : "Show"} Filters</span>
            </button>

            <div className="flex w-full items-center gap-2.5 sm:w-auto">
              <div className="relative w-full sm:flex-1 md:w-[280px] md:flex-none">
                <SearchIcon
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
                />
                <input
                  type="search"
                  aria-label="Search jobs..."
                  placeholder="Search by job title, company or ID"
                  value={query.search}
                  onChange={(e) => setQuery({ ...query, search: e.target.value })}
                  className="h-9 w-full rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] pl-9 pr-3 text-[13px] text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
                />
              </div>

              <button
                type="button"
                title="Refresh table"
                aria-label="Refresh table"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className={`${btnRefresh} flex-1 sm:flex-none disabled:opacity-60`}
              >
                <RefreshCw
                  size={15}
                  strokeWidth={2.2}
                  className={`shrink-0 transition-transform duration-500 ${
                    refreshing ? "animate-spin" : "group-hover:rotate-90"
                  }`}
                />
                <span className="truncate">
                  {refreshing ? "Refreshing..." : "Refresh"}
                </span>
              </button>

              <button
                type="button"
                title="Add"
                onClick={() => navigate("/admin/jdbyadmin/add")}
                className={`${btnPrimary} flex-1 sm:flex-none`}
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
        </div>

        {/* FILTER PANEL (collapsible, inside card) */}
        {showFilters && (
          <div className="mt-1 rounded-xl border border-[#e2e8ee] bg-[#f9fbfc] p-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <select
                  aria-label="Status"
                  value={query.isActive}
                  onChange={(e) => patchFilter({ isActive: e.target.value })}
                  className={filterInput}
                >
                  <option value="All">Status: All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
                />
              </div>
            </div>
          </div>
        )}

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
                  <th scope="col" className={thClass}>Status</th>
                  <th scope="col" className={thClass}>Requirement Status</th>
                  <th scope="col" className={thClass}>Job Category</th>
                  <th scope="col" className={thClass}>Vacancies</th>
                  <th scope="col" className={thClass}>Applicants</th>
                  <th scope="col" className={stickyActionsHead}>Actions</th>
                </tr>
              </thead>
            </table>
          </div>

          <div
            ref={bodyScrollRef}
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
                        No job descriptions yet
                      </p>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, index) => (
                    <tr
                      key={row.id ?? index}
                      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
                      className="js-row group transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                    >
                      <td className={`${td} tabular-nums`}>
                        {start + index + 1}
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span className="flex min-w-0 flex-col">
                          <span
                            className="truncate font-medium text-slate-900"
                            title={row.requestId || "-"}
                          >
                            {row.requestId || "-"}
                          </span>
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-slate-900">
                            {row.organizationName || "-"}
                          </span>
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-slate-900">
                            {row.position || "-"}
                          </span>
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span
                          className={`${BADGE_BASE} !h-6 !min-w-[80px] !px-2 !text-[12px] sm:!h-7 sm:!min-w-[96px] sm:!text-[14px] ${toneOf(row.status).badge}`}
                        >
                          {row.status || "-"}
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span
                          className={`${BADGE_BASE} !h-6 !min-w-[80px] !px-2 !text-[12px] sm:!h-7 sm:!min-w-[96px] sm:!text-[14px] ${toneOf(row.requirementStatus).badge}`}
                        >
                          {row.requirementStatus || "-"}
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

                      <td className={`${td} whitespace-nowrap sm:w-10!`}>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/admin/jdbyadmin/${row.id}`)
                          }
                          title={`View ${row.position || "this job"}`}
                          aria-label={`View ${row.position || "this job"}`}
                          className={`${BADGE_BASE} !h-6 !min-w-[80px] !px-2 !text-[12px] bg-sky-500 ring-sky-600 shadow-sky-500/20 sm:!h-7 sm:!min-w-[96px] sm:!text-[14px]`}
                        >
                          <Users
                            size={12}
                            strokeWidth={2.4}
                            className="sm:hidden"
                          />
                          <Users
                            size={13}
                            strokeWidth={2.4}
                            className="hidden sm:block"
                          />
                          {Number(row.applicants || 0)}
                        </button>
                      </td>
                      <td className={stickyActionsCell}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title={`View ${row.position || "Job"}`}
                            aria-label={`View ${row.position || "Job"}`}
                            onClick={() =>
                              navigate(`/admin/jdbyadmin/${row.id}`)
                            }
                            className="grid h-6 w-6 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                          >
                            <ChevronsRight size={14} strokeWidth={2.2} />
                          </button>

                          <button
                            type="button"
                            title="Update requirement status and deadline"
                            aria-label="Update requirement status and deadline"
                            onClick={() => openStatusDialog(row)}
                            className="grid h-6 w-6 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#7c4dca] to-[#a878e8] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                          >
                            <Flag size={14} strokeWidth={2.2} />
                          </button>

                          {busy ? null : (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={row.isActive}
                              aria-label={
                                row.isActive
                                  ? `Deactivate ${row.position || "Job"}`
                                  : `Activate ${row.position || "Job"}`
                              }
                              title={
                                row.isActive
                                  ? "Active. Click to deactivate"
                                  : "Inactive. Click to activate"
                              }
                              onClick={() => handleToggle(row)}
                              className={`relative h-6 w-[38px] shrink-0 cursor-pointer rounded-full p-0.5 shadow-inner transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 sm:w-[42px] ${
                                row.isActive
                                  ? "bg-gradient-to-r from-[#16834f] to-[#2fc77e]"
                                  : "bg-gradient-to-r from-[#c8323f] to-[#ed626b]"
                              }`}
                            >
                              <span
                                className={`grid h-5 w-5 place-items-center rounded-full bg-white shadow-md transition-transform duration-300 ${
                                  row.isActive
                                    ? "translate-x-[14px] sm:translate-x-[18px]"
                                    : "translate-x-0"
                                }`}
                              >
                                {row.isActive ? (
                                  <UserRoundCheck
                                    size={13}
                                    strokeWidth={2.7}
                                    className="text-emerald-700"
                                  />
                                ) : (
                                  <UserRoundX
                                    size={13}
                                    strokeWidth={2.7}
                                    className="text-rose-700"
                                  />
                                )}
                              </span>
                            </button>
                          )}
                        </div>
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

          <nav
            aria-label="Pagination"
            className="flex flex-wrap items-center gap-1"
          >
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={navBtn}
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
              disabled={currentPage === totalPagesLocal}
              className={navBtn}
            >
              Next
            </button>
          </nav>
        </div>

        {/* STATUS DIALOG — responsive like EmployerList modals */}
        {statusDialog && (
          <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-4">
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
              onClick={closeStatusDialog}
              aria-hidden="true"
            />
            <form
              onSubmit={submitStatusUpdate}
              className="relative max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-[#2c6b8a] to-[#4a9bb3]" />
              <div className="flex items-start justify-between gap-2 border-b border-[#e2e8ee] px-4 py-3.5 sm:px-6 sm:py-4">
                <div className="min-w-0">
                  <h2 className="text-[16px] font-bold text-[#1e2b36] sm:text-[18px]">
                    Update Job Description Status
                  </h2>
                  <p className="mt-1 truncate text-[12px] text-[#6b7a88] sm:text-[13px]">
                    {statusDialog.position || "Job description"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeStatusDialog}
                  disabled={statusSaving}
                  aria-label="Close"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#9aa5b1] hover:bg-slate-100 disabled:opacity-50"
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              {statusError && (
                <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 sm:mx-6">
                  {statusError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:gap-5 sm:px-6 sm:py-5">
                <label className="text-sm font-medium text-slate-700">
                  Job Description Status
                  <select
                    value={statusForm.jobStatusId}
                    onChange={(event) =>
                      setStatusForm((current) => ({
                        ...current,
                        jobStatusId: event.target.value,
                      }))
                    }
                    disabled={statusLoading || statusSaving}
                    required
                    className="mt-1.5 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50"
                  >
                    <option value="">
                      {statusLoading ? "Loading statuses..." : "Select status"}
                    </option>
                    {jobStatuses.map((item) => (
                      <option
                        key={item.jS_job_status_id ?? item.id}
                        value={item.jS_job_status_id ?? item.id}
                      >
                        {item.jS_name ?? item.name ?? "-"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Deadline
                  <input
                    type="date"
                    value={statusForm.deadline}
                    onChange={(event) =>
                      setStatusForm((current) => ({
                        ...current,
                        deadline: event.target.value,
                      }))
                    }
                    disabled={statusLoading || statusSaving}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50"
                  />
                </label>
              </div>

              <div className="border-t border-[#e2e8ee] px-4 py-4 sm:px-6 sm:py-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeStatusDialog}
                  disabled={statusSaving}
                  className="px-4 py-2 text-sm font-medium text-slate-700 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusSaving || !statusForm.jobStatusId}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-[#2c6b8a] hover:bg-[#3b86a6] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {statusSaving ? "Saving..." : "Save"}
                </button>
              </div>

            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDescriptionList;
