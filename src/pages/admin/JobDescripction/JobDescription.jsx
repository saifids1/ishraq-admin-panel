import { useStatusToast } from "../../../components/common/StatusModalProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Search as SearchIcon,
  Inbox,
  Plus,
  BriefcaseBusiness,
  UserPlus,
  Users,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  UserRoundCheck,
  UserRoundX,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { StatCardGrid } from "../../../components/common/Dashboardkit";

import {
  getAllJDByAdmin,
  updateJDByAdminActiveStatus,
} from "../../../api/Services/jdfornonregistercompanyApi";

import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

/* ================================
   CONSTANTS
================================ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const TABLE_MIN_WIDTH = 1000;

const COLUMNS = [
  { key: "srNo", width: "65px" },
  { key: "jobId", width: "170px" },
  { key: "status", width: "120px" },
  { key: "organization", width: "200px" },
  { key: "position", width: "190px" },
  { key: "jobCategory", width: "170px" },
  { key: "actions", width: "120px" },
];

const COL_SPAN_ALL = COLUMNS.length;

/* ================================
   NORMALIZE API RESPONSE
================================ */

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

// Convert API active status into boolean.
const normalizeStatus = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    return ["true", "1", "active", "yes"].includes(
      value.toLowerCase().trim()
    );
  }

  return null;
};

// The controller requires an integer ID.
// Never use the generated IR-JDBYADMIN reference as the route ID.
const getNumericId = (item) => {
  const rawId = firstValue(
    item,
    "id",
    "Id",
    "jdbA_RecordId",
    "jdByAdminId",
    "jdByAdminID"
  );

  const numericId = Number(rawId);

  if (Number.isInteger(numericId) && numericId > 0) {
    return numericId;
  }

  // Only use jdbA_Id if it is actually numeric.
  const referenceId = Number(item?.jdbA_Id);

  if (
    item?.jdbA_Id !== "" &&
    item?.jdbA_Id !== null &&
    item?.jdbA_Id !== undefined &&
    Number.isInteger(referenceId) &&
    referenceId > 0
  ) {
    return referenceId;
  }

  return null;
};

/* ================================
   MAP API DATA
================================ */

const toListRow = (item) => {
  const activeValue = firstValue(
    item,
    "isActive",
    "IsActive",
    "jdbA_IsActive",
    "active"
  );

  return {
    id: getNumericId(item),

    // Generated reference ID
    jobId: firstValue(item, "jdbA_Id", "JdbA_Id"),

    // Actual API fields
    instituteTypeId: firstValue(item, "instituteTypeId", "InstituteTypeId"),

    organizationName: firstValue(
      item,
      "organizationName",
      "OrganizationName",
      "orgName",
      "instituteTypeName",
      "InstituteTypeName"
    ),

    position: firstValue(item, "roleName", "RoleName"),

    roleId: firstValue(item, "roleId", "RoleId"),

    jobCategory: firstValue(item, "categoryName", "CategoryName"),

    categoryId: firstValue(item, "categoryId", "CategoryId"),

    description: firstValue(item, "description", "Description"),

    createdAt: firstValue(item, "createdAt", "CreatedAt"),

    createdBy: firstValue(item, "createdBy", "CreatedBy"),

    updatedAt: firstValue(item, "updatedAt", "UpdatedAt"),

    updatedBy: firstValue(item, "updatedBy", "UpdatedBy"),

    vacancies: firstValue(
      item,
      "vacancies",
      "numberOfVacancies",
      "jQ_vacancies"
    ),

    applicants:
      firstValue(item, "appliedCount", "applicants", "applicantCount") || 0,

    isActive: activeValue === "" ? null : normalizeStatus(activeValue),
  };
};

/* ================================
   DATE FORMAT
================================ */

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ================================
   COMPONENT
================================ */

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

  // Track the row whose status is being updated.
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const headerScrollRef = useRef(null);

  /* ================================
     SCROLL SYNC
  ================================ */

  const handleBodyScroll = useCallback((e) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, []);

  /* ================================
     FETCH ALL JOBS
  ================================ */

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getAllJDByAdmin();

      const mappedJobs = extractList(response).map(toListRow);

      setAllJobs(mappedJobs);
    } catch (err) {
      setAllJobs([]);

      const message =
        getApiErrorMessage(err) || "Unable to load job descriptions.";

      setError(message);

      toast?.({
        message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  /* ================================
     REFRESH
  ================================ */

  const handleRefresh = async () => {
    if (refreshing || loading) return;

    setRefreshing(true);

    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  /* ================================
     ACTIVE / INACTIVE TOGGLE API
  ================================ */

  const handleToggleStatus = async (job) => {
    if (!job.id) {
      toast?.({
        message:
          "Numeric job ID is missing from the API response. Cannot update status.",
        type: "error",
      });
      return;
    }

    if (updatingStatusId !== null) return;

    // Unknown status is treated as a request to activate.
    const nextStatus = job.isActive !== true;

    setUpdatingStatusId(job.id);

    try {
      const response = await updateJDByAdminActiveStatus(job.id, nextStatus);

      // Update only after successful API response.
      setAllJobs((previousJobs) =>
        previousJobs.map((item) =>
          item.id === job.id
            ? {
                ...item,
                isActive: nextStatus,
              }
            : item
        )
      );

      toast?.({
        message:
          response?.message ||
          (nextStatus
            ? "Job description activated successfully."
            : "Job description deactivated successfully."),
        type: "success",
      });
    } catch (err) {
      toast?.({
        message: getApiErrorMessage(err) || "Unable to update job status.",
        type: "error",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  /* ================================
     SEARCH
  ================================ */

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return allJobs;

    return allJobs.filter((job) =>
      [
        job.jobId,
        job.organizationName,
        job.position,
        job.jobCategory,
        job.description,
      ].some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [allJobs, search]);

  /* ================================
     PAGINATION
  ================================ */

  const count = filteredJobs.length;

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const currentPage = Math.min(page, totalPages);

  const start = (currentPage - 1) * pageSize;

  const pageRows = useMemo(
    () =>
      filteredJobs
        .slice(start, start + pageSize)
        .map((row, index) => ({
          ...row,
          srNo: start + index + 1,
        })),
    [filteredJobs, start, pageSize]
  );

  const pageNumbers = useMemo(() => {
    const win = 5;

    let from = Math.max(1, currentPage - Math.floor(win / 2));

    const to = Math.min(totalPages, from + win - 1);

    from = Math.max(1, to - win + 1);

    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, totalPages]);

  /* ================================
     STATS
  ================================ */

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
        value: allJobs.reduce((sum, job) => sum + Number(job.vacancies || 0), 0),
        note: "Across all jobs",
        icon: UserPlus,
        from: "#f59e0b",
        to: "#ef4444",
        color: "#f59e0b",
        color2: "#fb923c",
      },
      {
        title: "Total Applicants",
        value: allJobs.reduce((sum, job) => sum + Number(job.applicants || 0), 0),
        note: "Interested across all jobs",
        icon: Users,
        from: "#0ea5e9",
        to: "#2563eb",
        color: "#0ea5e9",
        color2: "#38bdf8",
      },
    ],
    [allJobs]
  );

  /* ================================
     STYLES
  ================================ */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";

  const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a]`;

  const td =
    "border-t border-[#e2e8ee] px-2 py-2 text-[13px] text-slate-900 sm:px-3.5 sm:py-2.5 sm:text-[14px]";

  const btnPrimary =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#16834f] to-[#2fb877] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";

  const btnRefresh =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a]";

  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-2 py-2 text-left text-[12px] font-semibold tracking-wide text-white sm:px-3 sm:py-2 sm:text-[14px]";

  const stickyActionsHead =
    "sticky right-0 z-30 w-[120px] min-w-[120px] whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-2 py-2 text-center text-[12px] font-semibold text-white";

  const stickyActionsCell =
    "sticky right-0 z-20 w-[120px] min-w-[120px] border-t border-[#e2e8ee] bg-white px-2 py-2 text-center group-even:bg-[#f9fbfc] group-hover:bg-[#e8f1f6]";

  /* ================================
     RENDER
  ================================ */

  return (
    <div className="w-full min-w-0">
      {/* <StatCardGrid items={stats} /> */}

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
                className="h-9 w-full rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] pl-9 pr-3 text-[13px] text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
              />
            </div>

            <button
              type="button"
              title="Refresh table"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className={`${btnRefresh} disabled:opacity-60`}
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />

              <span className="hidden sm:inline">
                {refreshing ? "Refreshing..." : "Refresh"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/jdbyadmin/add")}
              className={btnPrimary}
            >
              <Plus size={15} />
              <span>Add</span>
            </button>
          </div>
        </div>

        <div className="my-3.5 h-px bg-gradient-to-r from-[#2c6b8a]/45 via-[#e2e8ee] to-transparent" />

        {/* ERROR */}

        {error && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={load}
              className="shrink-0 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* TABLE */}

        <div className="mt-4 w-full min-w-0">
          {/* FIXED TABLE HEADER */}

          <div
            ref={headerScrollRef}
            className="overflow-hidden rounded-t-lg border border-b-0 border-[#cbe1f4]"
          >
            <table
              className="w-full table-fixed border-collapse"
              style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
            >
              <colgroup>
                {COLUMNS.map((column) => (
                  <col key={column.key} style={{ width: column.width }} />
                ))}
              </colgroup>

              <thead>
                <tr>
                  <th className={thClass}>Sr.No</th>
                  <th className={thClass}>Job ID</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Institute Type</th>
                  <th className={thClass}>Position</th>
                  <th className={thClass}>Job Category</th>
                  <th className={stickyActionsHead}>Actions</th>
                </tr>
              </thead>
            </table>
          </div>

          {/* SCROLLABLE TABLE BODY */}

          <div
            onScroll={handleBodyScroll}
            className="common-scrollbar h-[330px] w-full min-w-0 overflow-auto rounded-b-lg border border-[#cbe1f4] border-t-0"
          >
            <table
              className="w-full table-fixed border-collapse"
              style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
            >
              <colgroup>
                {COLUMNS.map((column) => (
                  <col key={column.key} style={{ width: column.width }} />
                ))}
              </colgroup>

              <tbody>
                {/* LOADING */}

                {loading ? (
                  <tr>
                    <td
                      colSpan={COL_SPAN_ALL}
                      className="px-4 py-12 text-center"
                    >
                      <div className="flex flex-col items-center">
                        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#e8f1f6] border-t-[#2c6b8a]" />

                        <p className="mt-3 text-sm text-[#6b7a88]">
                          Loading job descriptions...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  /* EMPTY */

                  <tr>
                    <td
                      colSpan={COL_SPAN_ALL}
                      className="border-t border-[#e2e8ee] px-4 py-12 text-center"
                    >
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a]">
                        <Inbox size={22} />
                      </div>

                      <p className="mt-3 text-sm text-[#1e2b36]">
                        {allJobs.length === 0
                          ? "No job descriptions yet"
                          : "No job descriptions match your search"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  /* JOB RECORDS */

                  pageRows.map((row, index) => {
                    const isUpdating = updatingStatusId === row.id;

                    const isActive = row.isActive === true;

                    return (
                      <tr
                        key={row.jobId || row.id || index}
                        className="group transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                      >
                        {/* SR NO */}

                        <td className={`${td} tabular-nums`}>{row.srNo}</td>

                        {/* JOB ID */}

                        <td className={`${td} whitespace-nowrap`}>
                          <span className="block truncate font-semibold text-[#2c6b8a]">
                            {row.jobId || "-"}
                          </span>
                        </td>

                        {/* STATUS */}

                        <td className={td}>
                          {row.isActive === null ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                              Unknown
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {isActive ? (
                                <CheckCircle2 size={13} />
                              ) : (
                                <XCircle size={13} />
                              )}

                              {isActive ? "Active" : "Inactive"}
                            </span>
                          )}
                        </td>

                        {/* INSTITUTE TYPE */}

                        <td className={td}>
                          <span className="block truncate font-medium">
                            {row.organizationName || "-"}
                          </span>
                        </td>

                        {/* POSITION */}

                        <td className={td}>
                          <span className="block truncate font-semibold text-slate-800">
                            {row.position || "-"}
                          </span>
                        </td>

                        {/* CATEGORY */}

                        <td className={td}>
                          <span className="block truncate text-[12px] sm:text-[14px]">
                            {row.jobCategory || "-"}
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td className={stickyActionsCell}>
                          <div className="flex items-center justify-center gap-2">
                            {/* VIEW */}

                            <button
                              type="button"
                              title={
                                row.id
                                  ? "View job description"
                                  : "Numeric job ID missing"
                              }
                              aria-label="View job description"
                              disabled={!row.id}
                              onClick={() =>
                                navigate(`/admin/jdbyadmin/${row.id}`)
                              }
                              className="grid h-6 w-6 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ChevronsRight size={14} strokeWidth={2.2} />
                            </button>

                            {/* ACTIVE / INACTIVE SWITCH */}

                            <button
                              type="button"
                              role="switch"
                              aria-checked={isActive}
                              aria-label={
                                isActive
                                  ? "Deactivate job description"
                                  : "Activate job description"
                              }
                              title={
                                isActive
                                  ? "Active. Click to deactivate"
                                  : "Inactive. Click to activate"
                              }
                              disabled={!row.id || updatingStatusId !== null}
                              onClick={() => handleToggleStatus(row)}
                              className={`relative h-6 w-[38px] shrink-0 cursor-pointer rounded-full p-0.5 shadow-inner transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-[42px] ${
                                isActive
                                  ? "bg-gradient-to-r from-[#16834f] to-[#2fc77e]"
                                  : "bg-gradient-to-r from-[#c8323f] to-[#ed626b]"
                              }`}
                            >
                              <span
                                className={`grid h-5 w-5 place-items-center rounded-full bg-white shadow-md transition-transform duration-300 ${
                                  isActive
                                    ? "translate-x-[14px] sm:translate-x-[18px]"
                                    : "translate-x-0"
                                }`}
                              >
                                {isUpdating ? (
                                  <RefreshCw
                                    size={12}
                                    strokeWidth={2.7}
                                    className="animate-spin text-[#2c6b8a]"
                                  />
                                ) : isActive ? (
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
                className="h-8 cursor-pointer rounded-lg border border-[#dce3eb] bg-white px-2 text-[13px] text-[#34445a] focus:border-[#2c6b8a] focus:outline-none"
              >
                {DEFAULT_PAGE_SIZES.map((size) => (
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
              className={`${navBtn} disabled:opacity-50`}
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
                    ? "bg-gradient-to-br from-[#2c6b8a] to-[#3b86a6] font-semibold text-white shadow-md"
                    : "border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a]"
                }`}
              >
                {number}
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