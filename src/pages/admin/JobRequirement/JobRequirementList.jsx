import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronDown,
  Search as SearchIcon,
  X as CloseIcon,
  Inbox,
  ShieldCheck,
  ShieldAlert,
  UserRoundCheck,
  UserRoundX,
  ChevronsRight,
  Pencil,
  Plus,
  BriefcaseBusiness,
  BadgeCheck,
  UserPlus,
  Users,
  Building2,Flag ,
} from "lucide-react";
import { StatCardGrid } from "../../../components/common/Dashboardkit";
import jobRequirementApi from "../../../api/Services/jobRequirementApi";
import jobStatusApi from "../../../api/Services/jobStatusApi";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

/* ------------------------------ CONSTANTS ------------------------------ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Contract", "Temporary", "Internship"];

/* ------------------------------ TONES ----------------------------- */

const TONES = {
  success: {
    badge: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20",
    core: "from-[#16834f] to-[#2fc77e]",
    ring: "bg-emerald-100",
    Icon: ShieldCheck,
  },
  danger: {
    badge: "bg-rose-600 ring-rose-700 shadow-rose-600/20",
    core: "from-[#c8323f] to-[#ed626b]",
    ring: "bg-rose-100",
    Icon: ShieldAlert,
  },
  warning: {
    badge: "bg-amber-500 ring-amber-600 shadow-amber-500/20",
    core: "from-[#d97706] to-[#fbbf24]",
    ring: "bg-amber-100",
    Icon: ShieldAlert,
  },
  neutral: {
    badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20",
    core: "from-[#64748b] to-[#94a3b8]",
    ring: "bg-slate-100",
    Icon: ShieldAlert,
  },
};

const BADGE_BASE =
  "inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

const STATUS_TONES = {
  Open: "success",
  Closed: "danger",
  Hold: "warning",
  Active: "success",
  Inactive: "danger",
};

const toneOf = (value) => TONES[STATUS_TONES[value]] ?? TONES.neutral;

const dateInputValue = (value) => (value ? String(value).slice(0, 10) : "");

const apiDateValue = (value) => (value ? `${value}T00:00:00.000Z` : null);

/* ------------------------------ NORMALIZE ------------------------------ */

const firstValue = (item, ...keys) =>
  keys
    .map((key) => item?.[key])
    .find((value) => value !== undefined && value !== null) ?? "";

const parseListResponse = (response) => {
  const root = response?.data ?? response;
  const payload = root?.data ?? root?.Data ?? root;
  const list = Array.isArray(payload) ? payload : payload?.data ?? payload?.Data ?? [];

  return {
    list: Array.isArray(list) ? list : [],
    totalRecords: Number(root?.totalRecords ?? payload?.totalRecords ?? list.length),
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
  const activeValue = firstValue(item, "jQ_is_active", "JQ_is_active", "isActive");
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
    organizationName: firstValue(
      item,
      "employerName",
      "organizationName",
      "EM_organization_name",
      "EM_name",
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
      firstValue(item, "appliedCount", "applicants", "applicantCount", "JQ_applicants") || 0,
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

/* ------------------------------ COMPONENT ------------------------------ */

const JobRequirementList = () => {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [query, setQuery] = useState({
    search: "",
    status: "All",
    category: "All",
  });

  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [statusDialog, setStatusDialog] = useState(null);
  const [jobStatuses, setJobStatuses] = useState([]);
  const [statusForm, setStatusForm] = useState({
    jobStatusId: "",
    deadline: "",
  });
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");

  /* --------------------------- FETCH --------------------------- */

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        pageNo: page,
        pageSize,
      };
      const response = await jobRequirementApi.getAll(params);
      const result = parseListResponse(response);

      setJobs(
        result.list.map((item, index) =>
          toListRow(item, (page - 1) * pageSize + index + 1),
        ),
      );
      setTotalRecords(result.totalRecords);
      setTotalPages(result.totalPages);
    } catch (err) {
      setJobs([]);
      setTotalRecords(0);
      setTotalPages(0);
      setError(
        getApiErrorMessage(err) || "Unable to load job requirement records.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query.category]);

  useEffect(() => {
    load();
  }, [load]);

  /* --------------------------- STATS --------------------------- */

  const stats = useMemo(
    () => [
      {
        title: "Job requirements posted",
        value: jobs.length,
        note: "All time",
        icon: BriefcaseBusiness,
        from: "#6366f1",
        to: "#8b5cf6",
        color: "#6366f1",
        color2: "#8b5cf6",
      },
      {
        title: "Open jobs",
        value: jobs.filter((j) => j.isActive).length,
        note: "Active requirements",
        icon: BadgeCheck,
        from: "#10b981",
        to: "#059669",
        color: "#10b981",
        color2: "#34d399",
      },
      {
        title: "Total vacancies",
        value: jobs.reduce((s, j) => s + Number(j.vacancies || 0), 0),
        note: "Across all jobs",
        icon: UserPlus,
        from: "#f59e0b",
        to: "#ef4444",
        color: "#f59e0b",
        color2: "#fb923c",
      },
      {
        title: "Total applicants",
        value: jobs.reduce((s, j) => s + Number(j.applicants || 0), 0),
        note: "Interested across all jobs",
        icon: Users,
        from: "#0ea5e9",
        to: "#2563eb",
        color: "#0ea5e9",
        color2: "#38bdf8",
      },
    ],
    [jobs],
  );

  /* ------------------------- TOGGLE STATUS ------------------------- */

  const handleToggle = async (row) => {
    await jobRequirementApi.toggleActive(row.id, !row.isActive);
    await load();
  };

  /* ---------------------------- QUERY HELPERS ---------------------------- */

  const patchFilter = (patch) => {
    setQuery((q) => ({ ...q, ...patch }));
    setPage(1);
  };

  /* ---------------------------- FILTERED ROWS ---------------------------- */

  const filteredRows = useMemo(() => {
    const q = query.search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (
        q &&
        !["organizationName", "mobile", "position", "department", "location"].some(
          (k) => String(j[k] ?? "").toLowerCase().includes(q),
        )
      )
        return false;
      if (query.status !== "All" && (query.status === "Active") !== j.isActive) return false;
      if (query.category !== "All" && j.employmentType !== query.category)
        return false;
      return true;
    });
  }, [jobs, query]);

  const count = totalRecords;
  const totalPagesLocal = Math.max(1, totalPages || Math.ceil(count / pageSize));
  const currentPage = Math.min(page, totalPagesLocal);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filteredRows;

  const pageNumbers = useMemo(() => {
    const win = 5;
    let from = Math.max(1, currentPage - Math.floor(win / 2));
    const to = Math.min(totalPagesLocal, from + win - 1);
    from = Math.max(1, to - win + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, totalPagesLocal]);

  /* ---------------------------- TOAST ---------------------------- */

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------------------------- STATUS TOGGLE ---------------------------- */

  const askToggle = (row) => {
    const next = row.isActive ? "Inactive" : "Active";
    setConfirm({ row, next });
  };

  const confirmToggle = async () => {
    if (!confirm) return;
    const { row, next } = confirm;
    setBusy(true);
    try {
      await handleToggle(row);
      setToast({
        id: Date.now(),
        tone: next === "Active" ? "ok" : "warn",
        msg: `${row.position || "Job"} is now ${next.toLowerCase()}`,
      });
    } catch (err) {
      setToast({
        id: Date.now(),
        tone: "err",
        msg: err?.message || "Could not update status",
      });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const openStatusDialog = async (row) => {
    setStatusDialog(row);
    setStatusError("");
    setStatusForm({
      jobStatusId: String(row.requirementStatusId || ""),
      deadline: dateInputValue(row.deadline),
    });

    if (jobStatuses.length > 0) return;

    setStatusLoading(true);
    try {
      const response = await jobStatusApi.getAllList();
      const payload = response?.data?.data ?? response?.data?.Data ?? [];
      setJobStatuses(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setStatusError(getApiErrorMessage(err) || "Unable to load job statuses.");
    } finally {
      setStatusLoading(false);
    }
  };

  const closeStatusDialog = () => {
    if (!statusSaving) setStatusDialog(null);
  };

  const submitStatusUpdate = async (event) => {
    event.preventDefault();
    if (!statusDialog || statusSaving) return;

    if (!statusForm.jobStatusId || !statusForm.deadline) {
      setStatusError("Job requirement status and deadline are required.");
      return;
    }

    setStatusSaving(true);
    setStatusError("");
    try {
      await jobRequirementApi.updateStatusAndDeadline(statusDialog.id, {
        jQ_job_status_id: Number(statusForm.jobStatusId),
        jQ_deadline: apiDateValue(statusForm.deadline),
      });
      setStatusDialog(null);
      setToast({
        id: Date.now(),
        tone: "ok",
        msg: "Requirement status and deadline updated successfully.",
      });
      await load();
    } catch (err) {
      setStatusError(
        getApiErrorMessage(err) ||
          "Unable to update the requirement status and deadline.",
      );
    } finally {
      setStatusSaving(false);
    }
  };

  /* ---------------------------- STYLES ---------------------------- */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";
  const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] disabled:cursor-not-allowed disabled:border-[#e2e8ee] disabled:text-[#b8c4d3] disabled:hover:bg-white disabled:hover:text-[#b8c4d3]`;
  const td = "border-t border-[#e2e8ee] px-3.5 py-2.5 text-[15px] text-slate-900";
  const btnPrimary =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#16834f] to-[#2fb877] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834f] focus-visible:ring-offset-2";

  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-left text-[15px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)]";

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

          <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto">
            <div className="relative min-w-[280px] flex-1 xl:flex-none">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
              />
              <input
                type="search"
                aria-label="Search job requirements..."
                placeholder="Search organization, position, location"
                value={query.search}
                onChange={(e) => patchFilter({ search: e.target.value })}
                className="h-9 w-full rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] pl-9 pr-3 text-[13px] text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
              />
            </div>

            <div className="relative min-w-[200px] flex-1 xl:flex-none">
              <select
                aria-label="Status"
                value={query.status}
                onChange={(e) => patchFilter({ status: e.target.value })}
                className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] px-3 pr-9 text-[15px] font-medium text-[#34445a] outline-none transition hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
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

            {EMPLOYMENT_TYPES.length > 0 && (
              <div className="relative min-w-[200px] flex-1 xl:flex-none">
                <select
                  aria-label="Employment Type"
                  value={query.category}
                  onChange={(e) => patchFilter({ category: e.target.value })}
                  className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] px-3 pr-9 text-[15px] font-medium text-[#34445a] outline-none transition hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
                >
                  <option value="All">Employment Type: All</option>
                  {EMPLOYMENT_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
                />
              </div>
            )}

            <button
              type="button"
              title="Add"
              onClick={() => navigate("/admin/job-requirements/create")}
              className={btnPrimary}
            >
              <Plus
                size={15}
                strokeWidth={2.2}
                className="transition-transform group-hover:scale-110"
              />
              <span className="hidden sm:inline">Add</span>
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
            <button type="button" onClick={load} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* TABLE */}
<div className="mt-4 overflow-hidden rounded-lg border border-[#cbe1f4]">
  <div
    className="common-scrollbar max-h-[55vh] overflow-auto"
    style={{ scrollbarGutter: "stable" }}
  >
    <table className="w-full min-w-[1400px] table-fixed border-separate border-spacing-0 text-[15px]">
      <colgroup>
        <col style={{ width: "60px" }} />
        <col style={{ width: "200px" }} />
        <col style={{ width: "170px" }} />
        <col style={{ width: "120px" }} />
        <col style={{ width: "140px" }} />
        <col style={{ width: "140px" }} />
        <col style={{ width: "100px" }} />
        <col style={{ width: "110px" }} />
        <col style={{ width: "130px" }} />
      </colgroup>

      <thead>
        <tr>
          <th scope="col" className={`${thClass} sticky top-0 z-20`}>
            Sr.No
          </th>
          <th scope="col" className={`${thClass} sticky top-0 z-20`}>
            Organization
          </th>
          <th scope="col" className={`${thClass} sticky top-0 z-20`}>
            Position
          </th>
          <th scope="col" className={`${thClass} sticky top-0 z-20`}>
            Status
          </th>
          <th scope="col" className={`${thClass} sticky top-0 z-20`}>
            Requirement Status
          </th>
          <th scope="col" className={`${thClass} sticky top-0 z-20`}>
            Job Category
          </th>
          <th scope="col" className={`${thClass} sticky top-0 z-20`}>
            Vacancies
          </th>
          <th scope="col" className={`${thClass} sticky top-0 z-20`}>
            Applicants
          </th>
          
          <th
            scope="col"
            className={`${thClass} sticky right-0 top-0 z-30 !border-l !border-l-white/30 shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.25)]`}
          >
            Actions
          </th>
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <tr>
            <td colSpan={9} className="px-4 py-12 text-center">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#e8f1f6] border-t-[#2c6b8a]"
                />
                <p className="mt-3 text-[15px] text-[#6b7a88]">Loading...</p>
              </div>
            </td>
          </tr>
        ) : pageRows.length === 0 ? (
          <tr>
            <td
              colSpan={9}
              className="border-t border-[#e2e8ee] px-4 py-12 text-center"
            >
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                <Inbox size={22} />
              </div>
              <p className="mt-3 text-[15px] text-[#1e2b36]">
                No job requirements yet
              </p>
            </td>
          </tr>
        ) : (
          pageRows.map((row, index) => {
            const rowBg =
              index % 2 === 0
                 "bg-white group-hover:bg-[#e8f1f6]"
                
            return (
              <tr
                key={row.id ?? index}
                style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
                className="js-row group transition-colors"
              >
                {/* Sr.No */}
                <td className={`${td} tabular-nums ${rowBg}`}>
                  {start + index + 1}
                </td>

                {/* Organization */}
                <td className={`${td} whitespace-nowrap ${rowBg}`}>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-slate-900">
                      {row.organizationName || "-"}
                    </span>
                    {row.mobile && (
                      <span className="truncate text-[12px] text-[#6b7a88]">
                        {row.mobile}
                      </span>
                    )}
                  </span>
                </td>

                {/* Position */}
                <td className={`${td} whitespace-nowrap ${rowBg}`}>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-slate-900">
                      {row.position || "-"}
                    </span>
                    {row.department && (
                      <span className="truncate text-[12px] text-[#6b7a88]">
                        {row.department}
                      </span>
                    )}
                  </span>
                </td>
                
                {/* Status */}
                <td className={`${td} whitespace-nowrap text-center ${rowBg}`}>
                  <div className="w-full min-w-0 truncate">
                    <span
                      className={`${BADGE_BASE} ${toneOf(row.status).badge}`}
                    >
                      {row.status || "-"}
                    </span>
                  </div>
                </td>

                {/* Requirement Status */}
                <td className={`${td} whitespace-nowrap text-center ${rowBg}`}>
                  <span
                    className={`${BADGE_BASE} ${
                      toneOf(row.requirementStatus).badge
                    }`}
                  >
                    {row.requirementStatus || "-"}
                  </span>
                </td>

                {/* Job Category */}
                <td className={`${td} whitespace-nowrap ${rowBg}`}>
                  {row.employmentType ? (
                    <span className="block truncate text-[15px]">
                      {row.jobCategory}
                    </span>
                  ) : (
                    <span className="text-[#9aa5b1]">-</span>
                  )}
                </td>

                {/* Vacancies */}
                <td
                  className={`${td} whitespace-nowrap text-center tabular-nums ${rowBg}`}
                >
                  <strong className="font-semibold">
                    {row.vacancies ?? 0}
                  </strong>
                </td>

                {/* Applicants */}
                <td
                  className={`${td} whitespace-nowrap text-center tabular-nums ${rowBg}`}
                >
                  <Link
                    to={`/admin/job-applicant/${row.id}`}
                    className="font-semibold text-sky-700 hover:underline"
                  >
                    {Number(row.applicants || 0)}
                  </Link>
                </td>


                {/* Actions — sticky right */}
                <td
                  className={`${td} sticky right-0 z-10 text-center  bg-white `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      title={`View ${row.position || "Job"}`}
                      aria-label={`View ${row.position || "Job"}`}
                      onClick={() =>
                        navigate(`/admin/job-requirements/${row.id}`)
                      }
                      className="grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                    >
                      <ChevronsRight size={14} strokeWidth={2.2} />
                    </button>

                    <button
                      type="button"
                      title="Update requirement status and deadline"
                      aria-label="Update requirement status and deadline"
                      onClick={() => openStatusDialog(row)}
                      className="grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#7c4dca] to-[#a878e8] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                    >
                      <Flag  size={14} strokeWidth={2.2} />
                    </button>

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
                      onClick={() => askToggle(row)}
                      className={`relative h-6 w-[42px] shrink-0 cursor-pointer rounded-full p-0.5 shadow-inner transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 ${
                        row.isActive
                          ? "bg-gradient-to-r from-[#16834f] to-[#2fc77e]"
                          : "bg-gradient-to-r from-[#c8323f] to-[#ed626b]"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-full bg-white shadow-md transition-transform duration-300 ${
                          row.isActive ? "translate-x-[18px]" : "translate-x-0"
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
                  </div>
                </td>
              </tr>
            );
          })
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
              of <strong className="font-semibold text-[#53677f]">{count}</strong>{" "}
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

        {statusDialog && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
              onClick={closeStatusDialog}
              aria-hidden="true"
            />
            <form
              onSubmit={submitStatusUpdate}
              className="relative w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-[#2c6b8a] to-[#4a9bb3]" />
              <div className="flex items-center justify-between border-b border-[#e2e8ee] px-6 py-4">
                <div>
                  <h2 className="text-[18px] font-bold text-[#1e2b36]">
                    Update Requirement Status
                  </h2>
                  <p className="mt-1 text-[13px] text-[#6b7a88]">
                    {statusDialog.position || "Job requirement"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeStatusDialog}
                  disabled={statusSaving}
                  aria-label="Close"
                  className="grid h-8 w-8 place-items-center rounded-lg text-[#9aa5b1] hover:bg-slate-100 disabled:opacity-50"
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              {statusError && (
                <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {statusError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Job Requirement Status
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
                        key={item.jS_job_status_id}
                        value={item.jS_job_status_id}
                      >
                        {item.jS_name}
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
                    disabled={statusSaving}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2.5 border-t border-[#e2e8ee] bg-[#f9fbfc] px-6 py-3.5">
                <button
                  type="button"
                  onClick={closeStatusDialog}
                  disabled={statusSaving}
                  className="h-10 rounded-[10px] border border-[#dce3eb] bg-white px-5 text-[13.5px] font-semibold text-[#34445a] hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusLoading || statusSaving}
                  className="h-10 rounded-[10px] bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-5 text-[13.5px] font-semibold text-white shadow-md hover:brightness-105 disabled:opacity-60"
                >
                  {statusSaving ? "Saving..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* DIALOG */}
        {confirm &&
          (() => {
            const tone = toneOf(confirm.next);
            const { core, ring, Icon } = tone;
            return (
              <div className="fixed inset-0 z-50 grid place-items-center p-4">
                <div
                  className="js-fade absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
                  onClick={() => setConfirm(null)}
                  aria-hidden="true"
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="list-dialog-title"
                  className="js-pop relative w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl"
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${core}`} />
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    aria-label="Close"
                    className="absolute right-3 top-4 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-[#9aa5b1] hover:bg-slate-100"
                  >
                    <CloseIcon size={16} />
                  </button>

                  <div className="px-6 pb-5 pt-6 text-center">
                    <div className="relative mx-auto mb-4 grid h-16 w-16 place-items-center">
                      <span className={`js-halo absolute inset-0 rounded-full ${ring}`} />
                      <span
                        className={`relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${core} text-white shadow-lg`}
                      >
                        <Icon size={22} />
                      </span>
                    </div>
                    <h2 id="list-dialog-title" className="text-[18px] font-bold text-[#1e2b36]">
                      Set job to {confirm.next}?
                    </h2>
                    <p className="mx-auto mt-1.5 max-w-[320px] text-[13.5px] leading-relaxed text-[#6b7a88]">
                      This job will be marked as {confirm.next.toLowerCase()}.
                    </p>
                    <div className="mt-4 rounded-xl border border-[#e2e8ee] bg-[#f9fbfc] p-3 text-left">
                      <p className="truncate text-[14px] font-semibold text-[#1e2b36]">
                        {confirm.row.position || "Job"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 border-t border-[#e2e8ee] bg-[#f9fbfc] px-6 py-3.5">
                    <button
                      type="button"
                      onClick={() => setConfirm(null)}
                      disabled={busy}
                      className="h-10 flex-1 cursor-pointer rounded-[10px] border border-[#dce3eb] bg-white text-[13.5px] font-semibold text-[#34445a] hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      autoFocus
                      onClick={confirmToggle}
                      disabled={busy}
                      className={`h-10 flex-1 cursor-pointer rounded-[10px] bg-gradient-to-r ${core} text-[13.5px] font-semibold text-white shadow-md hover:brightness-105 active:scale-[0.98] disabled:opacity-60`}
                    >
                      {busy ? "Saving..." : `Yes, set ${confirm.next.toLowerCase()}`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* TOAST */}
        {toast && (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="js-toast fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#1e2b36] px-4 py-3 text-[15px] font-medium text-white shadow-2xl"
          >
            <span
              className={`grid h-5 w-5 place-items-center rounded-full ${
                toast.tone === "ok"
                  ? "bg-emerald-500"
                  : toast.tone === "warn"
                    ? "bg-amber-500"
                    : "bg-rose-500"
              }`}
            >
              ✓
            </span>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobRequirementList;
