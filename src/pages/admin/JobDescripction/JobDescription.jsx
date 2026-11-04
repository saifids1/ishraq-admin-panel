import { useStatusToast } from "../../../components/common/StatusModalProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Search as SearchIcon,
  Inbox,
  Plus,
  RefreshCw,
  ChevronsRight,
  FileText,
  BookOpen,
  User,
  ShieldAlert,
} from "lucide-react";

import {
  getJDByAdminPagination,
  updateJDByAdminActiveStatus,
} from "../../../api/Services/jdfornonregistercompanyApi";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { StatCardGrid } from "../../../components/common/Dashboardkit";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

/* ================================
   CONSTANTS
================================ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;
const TABLE_MIN_WIDTH = 1050; // Increased slightly to accommodate wider Job ID

const COLUMNS = [
  { key: "srNo", width: "65px" },
  { key: "jobId", width: "210px" }, // Increased to fit IR-JDBYADMIN-311026-001 fully
  { key: "status", width: "120px" },
  { key: "organization", width: "200px" },
  { key: "position", width: "190px" },
  { key: "jobCategory", width: "180px" },
  { key: "actions", width: "120px" },
];

const COL_SPAN_ALL = COLUMNS.length;

// Match Blog List Tones & Badges
const TONES = {
  success: { badge: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20" },
  danger: { badge: "bg-rose-600 ring-rose-700 shadow-rose-600/20" },
  warning: { badge: "bg-amber-500 ring-amber-600 shadow-amber-500/20" },
  neutral: { badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20" },
};

const STATUS_TONES = { Published: "success", Draft: "warning", Archived: "danger" };

const BADGE_BASE =
  "inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

const toneOf = (value) => TONES[STATUS_TONES[value]] ?? TONES.neutral;

/* ================================
   NORMALIZE API RESPONSE
================================ */

const normalizeStatus = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["true", "1", "active", "yes"].includes(value.toLowerCase().trim());
  }
  return null;
};

const toListRow = (item) => {
  const isActive = normalizeStatus(item?.isActive);
  const statusString = isActive === true ? "Published" : isActive === false ? "Archived" : "Draft";

  return {
    id:
      Number.isInteger(Number(item?.id)) && Number(item?.id) > 0
        ? Number(item.id)
        : null,
    jobId: item?.jdbA_Id ?? "",
    organizationName: item?.instituteTypeName ?? "",
    position: item?.roleName ?? "",
    jobCategory: item?.categoryName ?? "",
    isActive: isActive,
    status: statusString,
  };
};

/* ================================
   COMPONENT
================================ */

const JobDescriptionList = () => {
  const navigate = useNavigate();
  const [toast] = useStatusToast();

  const [statusTarget, setStatusTarget] = useState(null);
  const [rows, setRows] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const headerScrollRef = useRef(null);
  const requestIdRef = useRef(0);

  /* ================================
     SCROLL SYNC
  ================================ */

  const handleBodyScroll = useCallback((e) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, []);

  /* ================================
     DEBOUNCE SEARCH
  ================================ */

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      setSearch((prev) => {
        if (prev !== trimmed) setPage(1);
        return trimmed;
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ================================
     FETCH PAGE
  ================================ */

  const fetchJobs = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");

    try {
      const result = await getJDByAdminPagination({
        pageNo: page,
        pageSize,
        search,
      });

      if (requestId !== requestIdRef.current) return;

      const items = Array.isArray(result?.data) ? result.data : [];
      const serverTotalPages = Math.max(1, result?.totalPages ?? 1);

      setRows(items.map(toListRow));
      setTotalRecords(result?.totalRecords ?? 0);
      setTotalPages(serverTotalPages);

      if (page > serverTotalPages) {
        setPage(serverTotalPages);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setRows([]);
      setTotalRecords(0);
      setTotalPages(1);
      const message = getApiErrorMessage(err) || "Unable to load job descriptions.";
      setError(message);
      toast?.({ message, type: "error" });
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [page, pageSize, search, toast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  /* ================================
     REFRESH
  ================================ */

  const handleRefresh = async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    setSearchInput("");
    setSearch("");
    setPage(1);
    try {
      await fetchJobs();
    } finally {
      setRefreshing(false);
    }
  };

  /* ================================
     ACTIVE / INACTIVE TOGGLE
  ================================ */

  const requestToggleStatus = (job) => {
    if (!job.id) {
      toast?.({ message: "Numeric job ID is missing. Cannot update status.", type: "error" });
      return;
    }
    if (updatingStatusId !== null) return;
    setStatusTarget(job);
  };

  const closeStatusDialog = () => {
    if (updatingStatusId === null) setStatusTarget(null);
  };

  const confirmToggleStatus = async () => {
    const job = statusTarget;
    if (!job || updatingStatusId !== null) return;

    const nextStatus = job.isActive !== true;
    setUpdatingStatusId(job.id);

    try {
      const response = await updateJDByAdminActiveStatus(job.id, nextStatus);

      setRows((previous) =>
        previous.map((item) =>
          item.id === job.id
            ? { ...item, isActive: nextStatus, status: nextStatus ? "Published" : "Archived" }
            : item
        )
      );

      setStatusTarget(null);
      toast?.({
        message: response?.message || (nextStatus ? "Activated successfully." : "Deactivated successfully."),
        type: "success",
      });
    } catch (err) {
      setStatusTarget(null);
      toast?.({ message: getApiErrorMessage(err) || "Unable to update job status.", type: "error" });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  /* ================================
     STATS CARDS
  ================================ */

  const stats = useMemo(
    () => [
      {
        title: "Total Jobs",
        value: totalRecords,
        note: "All time",
        icon: FileText,
        color: "#0ea5e9",
        color2: "#38bdf8",
        from: "#0ea5e9",
        to: "#2563eb",
      },
      {
        title: "Published",
        value: rows.filter((u) => u.status === "Published").length,
        note: "On this page",
        icon: BookOpen,
        color: "#6366f1",
        color2: "#8b5cf6",
        from: "#6366f1",
        to: "#8b5cf6",
      },
      {
        title: "Drafts",
        value: rows.filter((u) => u.status === "Draft").length,
        note: "On this page",
        icon: User,
        color: "#10b981",
        color2: "#34d399",
        from: "#10b981",
        to: "#059669",
      },
      {
        title: "Archived",
        value: rows.filter((u) => u.status === "Archived").length,
        note: "On this page",
        icon: ShieldAlert,
        color: "#f59e0b",
        color2: "#fb923c",
        from: "#f59e0b",
        to: "#ef4444",
      },
    ],
    [rows, totalRecords]
  );

  /* ================================
     PAGINATION HELPERS
  ================================ */

  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  const pageRows = useMemo(
    () => rows.map((row, index) => ({ ...row, srNo: start + index + 1 })),
    [rows, start]
  );

  const pageNumbers = useMemo(() => {
    const win = 5;
    let from = Math.max(1, currentPage - Math.floor(win / 2));
    const to = Math.min(totalPages, from + win - 1);
    from = Math.max(1, to - win + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, totalPages]);

  /* ================================
     STYLES
  ================================ */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";
  const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a]`;
  const td = "border-t border-[#e2e8ee] px-2 py-2 text-[13px] font-medium text-slate-900 sm:px-3.5 sm:py-2.5 sm:text-[15px]";
  
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
      <StatCardGrid items={stats} />

      <div className="mx-auto w-full min-w-0 max-w-[1400px] rounded-[14px] border border-[#e2e8ee] bg-white p-2.5 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:p-4 lg:px-5">
        
        {/* HEADER */}
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
            Job Descriptions
          </h1>

          <div className="flex w-full items-center gap-2.5 md:w-auto">
            <div className="relative w-full md:w-[280px]">
              <SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]" />
              <input
                type="search"
                aria-label="Search job descriptions"
                placeholder="Search by job ID, organization, role or category"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
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
            <button type="button" onClick={fetchJobs} className="shrink-0 font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* TABLE */}
        <div className="mt-4 w-full min-w-0">
          <div
            ref={headerScrollRef}
            className="overflow-hidden rounded-t-lg border border-b-0 border-[#cbe1f4]"
          >
            <table className="w-full table-fixed border-collapse" style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}>
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

          <div
            onScroll={handleBodyScroll}
            className="common-scrollbar h-[320px] w-full min-w-0 overflow-auto rounded-b-lg border border-[#cbe1f4] border-t-0"
          >
            <table className="w-full table-fixed border-collapse" style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}>
              <colgroup>
                {COLUMNS.map((column) => (
                  <col key={column.key} style={{ width: column.width }} />
                ))}
              </colgroup>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={COL_SPAN_ALL} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#e8f1f6] border-t-[#2c6b8a]" />
                        <p className="mt-3 text-sm text-[#6b7a88]">Loading job descriptions...</p>
                      </div>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={COL_SPAN_ALL} className="border-t border-[#e2e8ee] px-4 py-12 text-center">
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a]">
                        <Inbox size={22} />
                      </div>
                      <p className="mt-3 text-sm text-[#1e2b36]">
                        {search ? "No job descriptions match your search" : "No job descriptions yet"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => {
                    const isUpdating = updatingStatusId === row.id;
                    const isActive = row.isActive === true;

                    return (
                      <tr key={row.id ?? row.jobId} className="group transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]">
                        <td className={`${td} tabular-nums`}>{row.srNo}</td>

                        {/* JOB ID - uniform styling, nowrap */}
                        <td className={`${td} whitespace-nowrap`}>
                          <span className="block text-slate-900">
                            {row.jobId || "-"}
                          </span>
                        </td>

                        {/* STATUS BADGE */}
                        <td className={`${td} whitespace-nowrap`}>
                          <span
                            className={`${BADGE_BASE} !h-6 !min-w-[80px] !px-2 !text-[12px] sm:!h-7 sm:!min-w-[96px] sm:!text-[14px] ${toneOf(row.status).badge}`}
                          >
                            {row.status || "-"}
                          </span>
                        </td>

                        {/* INSTITUTE TYPE - uniform styling */}
                        <td className={td}>
                          <span className="block truncate text-slate-900">
                            {row.organizationName || "-"}
                          </span>
                        </td>

                        {/* POSITION - uniform styling */}
                        <td className={td}>
                          <span className="block truncate text-slate-900">
                            {row.position || "-"}
                          </span>
                        </td>

                        {/* JOB CATEGORY - uniform styling */}
                        <td className={td}>
                          <span className="block truncate text-slate-900">
                            {row.jobCategory || "-"}
                          </span>
                        </td>

                        <td className={stickyActionsCell}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              title={row.id ? "View job description" : "Numeric job ID missing"}
                              aria-label="View job description"
                              disabled={!row.id}
                              onClick={() => navigate(`/admin/jdbyadmin/${row.id}`)}
                              className="grid h-6 w-6 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ChevronsRight size={14} strokeWidth={2.2} />
                            </button>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={isActive}
                              aria-label={isActive ? "Deactivate job description" : "Activate job description"}
                              title={isActive ? "Published. Click to archive" : "Not published. Click to publish"}
                              disabled={!row.id || updatingStatusId !== null}
                              onClick={() => requestToggleStatus(row)}
                              className={`relative h-6 w-[38px] shrink-0 cursor-pointer rounded-full p-0.5 shadow-inner transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-[42px] ${
                                isActive
                                  ? "bg-gradient-to-r from-[#16834f] to-[#2fc77e]"
                                  : "bg-gradient-to-r from-[#c8323f] to-[#ed626b]"
                              }`}
                            >
                              <span
                                className={`grid h-5 w-5 place-items-center rounded-full bg-white shadow-md transition-transform duration-300 ${
                                  isActive ? "translate-x-[14px] sm:translate-x-[18px]" : "translate-x-0"
                                }`}
                              >
                                {isUpdating ? (
                                  <RefreshCw size={12} strokeWidth={2.7} className="animate-spin text-[#2c6b8a]" />
                                ) : isActive ? (
                                  <BookOpen size={13} strokeWidth={2.7} className="text-emerald-700" />
                                ) : (
                                  <FileText size={13} strokeWidth={2.7} className="text-rose-700" />
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
              Showing <strong className="font-semibold text-[#53677f]">{totalRecords ? start + 1 : 0}</strong> to{" "}
              <strong className="font-semibold text-[#53677f]">{Math.min(start + pageSize, totalRecords)}</strong> of{" "}
              <strong className="font-semibold text-[#53677f]">{totalRecords}</strong> entries
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
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
          </div>

          <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className={`${navBtn} disabled:opacity-50`}
            >
              Previous
            </button>

            {pageNumbers.map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                disabled={loading}
                aria-current={number === currentPage ? "page" : undefined}
                className={`${pageBtn} disabled:opacity-60 ${
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
              disabled={currentPage === totalPages || loading}
              className={`${navBtn} disabled:opacity-50`}
            >
              Next
            </button>
          </nav>
        </div>
      </div>

      {/* CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.isActive === true ? "Archive job description?" : "Publish job description?"}
        message={
          statusTarget?.isActive === true
            ? `${statusTarget?.jobId || "This job description"} will be marked as archived. Do you want to continue?`
            : `${statusTarget?.jobId || "This job description"} will be marked as published. Do you want to continue?`
        }
        confirmLabel={statusTarget?.isActive === true ? "Yes, Archive" : "Yes, Publish"}
        tone={statusTarget?.isActive === true ? "danger" : "primary"}
        loading={updatingStatusId !== null}
        onConfirm={confirmToggleStatus}
        onCancel={closeStatusDialog}
      />
    </div>
  );
};

export default JobDescriptionList;