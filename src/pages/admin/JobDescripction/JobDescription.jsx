import { useStatusToast } from "../../../components/common/StatusModalProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Search as SearchIcon,
  Inbox,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  UserRoundCheck,
  UserRoundX,
  ChevronsRight,
} from "lucide-react";

import {
  getJDByAdminPagination,
  updateJDByAdminActiveStatus,
} from "../../../api/Services/jdfornonregistercompanyApi";
import ConfirmDialog from "../../../components/common/ConfirmDialog";

import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

/* ================================
   CONSTANTS
================================ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;
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

// Convert API active status into boolean.
const normalizeStatus = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    return ["true", "1", "active", "yes"].includes(value.toLowerCase().trim());
  }

  return null;
};

const toListRow = (item) => ({
  id:
    Number.isInteger(Number(item?.id)) && Number(item?.id) > 0
      ? Number(item.id)
      : null,
  jobId: item?.jdbA_Id ?? "",
  organizationName: item?.instituteTypeName ?? "",
  position: item?.roleName ?? "",
  jobCategory: item?.categoryName ?? "",
  isActive: normalizeStatus(item?.isActive),
});

/* ================================
   COMPONENT
================================ */

const JobDescriptionList = () => {
  const navigate = useNavigate();
  const [toast] = useStatusToast();

  // The row waiting for confirmation before its status changes
  const [statusTarget, setStatusTarget] = useState(null);

  // Current page data
  const [rows, setRows] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Pagination and search state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Row whose status is being updated
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const headerScrollRef = useRef(null);

  // Guards against out-of-order responses overwriting newer ones
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

      // Records were removed, so move back to the last valid page
      if (page > serverTotalPages) {
        setPage(serverTotalPages);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      setRows([]);
      setTotalRecords(0);
      setTotalPages(1);

      const message =
        getApiErrorMessage(err) || "Unable to load job descriptions.";

      setError(message);

      toast?.({
        message,
        type: "error",
      });
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

    try {
      await fetchJobs();
    } finally {
      setRefreshing(false);
    }
  };

  /* ================================
     ACTIVE / INACTIVE TOGGLE
  ================================ */

  /* ================================
   ACTIVE / INACTIVE TOGGLE
================================ */

  // Step 1: the switch click opens the confirmation dialog
  const requestToggleStatus = (job) => {
    if (!job.id) {
      toast?.({
        message:
          "Numeric job ID is missing from the API response. Cannot update status.",
        type: "error",
      });
      return;
    }

    if (updatingStatusId !== null) return;

    setStatusTarget(job);
  };

  // Closes the dialog without changing anything
  const closeStatusDialog = () => {
    if (updatingStatusId === null) setStatusTarget(null);
  };

  // Step 2: the user confirms, so the API call runs
  const confirmToggleStatus = async () => {
    const job = statusTarget;
    if (!job || updatingStatusId !== null) return;

    // Unknown status is treated as a request to activate
    const nextStatus = job.isActive !== true;

    setUpdatingStatusId(job.id);

    try {
      const response = await updateJDByAdminActiveStatus(job.id, nextStatus);

      // Update the row only after a successful response
      setRows((previous) =>
        previous.map((item) =>
          item.id === job.id ? { ...item, isActive: nextStatus } : item,
        ),
      );

      setStatusTarget(null);

      toast?.({
        message:
          response?.message ||
          (nextStatus
            ? "Job description activated successfully."
            : "Job description deactivated successfully."),
        type: "success",
      });
    } catch (err) {
      setStatusTarget(null);

      toast?.({
        message: getApiErrorMessage(err) || "Unable to update job status.",
        type: "error",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  /* ================================
     PAGINATION HELPERS
  ================================ */

  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  const pageRows = useMemo(
    () =>
      rows.map((row, index) => ({
        ...row,
        srNo: start + index + 1,
      })),
    [rows, start],
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
              onClick={fetchJobs}
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
                  <tr>
                    <td
                      colSpan={COL_SPAN_ALL}
                      className="border-t border-[#e2e8ee] px-4 py-12 text-center"
                    >
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a]">
                        <Inbox size={22} />
                      </div>

                      <p className="mt-3 text-sm text-[#1e2b36]">
                        {search
                          ? "No job descriptions match your search"
                          : "No job descriptions yet"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => {
                    const isUpdating = updatingStatusId === row.id;
                    const isActive = row.isActive === true;

                    return (
                      <tr
                        key={row.id ?? row.jobId}
                        className="group transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                      >
                        <td className={`${td} tabular-nums`}>{row.srNo}</td>

                        <td className={`${td} whitespace-nowrap`}>
                          <span className="block truncate font-semibold text-[#2c6b8a]">
                            {row.jobId || "-"}
                          </span>
                        </td>

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

                        <td className={td}>
                          <span className="block truncate font-medium">
                            {row.organizationName || "-"}
                          </span>
                        </td>

                        <td className={td}>
                          <span className="block truncate font-semibold text-slate-800">
                            {row.position || "-"}
                          </span>
                        </td>

                        <td className={td}>
                          <span className="block truncate text-[12px] sm:text-[14px]">
                            {row.jobCategory || "-"}
                          </span>
                        </td>

                        <td className={stickyActionsCell}>
                          <div className="flex items-center justify-center gap-2">
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
                              onClick={() => requestToggleStatus(row)}
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
                {totalRecords ? start + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="font-semibold text-[#53677f]">
                {Math.min(start + pageSize, totalRecords)}
              </strong>{" "}
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
      {/* STATUS CONFIRMATION */}
      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={
          statusTarget?.isActive === true
            ? "Deactivate job description?"
            : "Activate job description?"
        }
        message={
          statusTarget?.isActive === true
            ? `${statusTarget?.jobId || "This job description"} will be marked as inactive. Do you want to continue?`
            : `${statusTarget?.jobId || "This job description"} will be marked as active. Do you want to continue?`
        }
        confirmLabel={
          statusTarget?.isActive === true ? "Yes, deactivate" : "Yes, activate"
        }
        tone={statusTarget?.isActive === true ? "danger" : "primary"}
        loading={updatingStatusId !== null}
        onConfirm={confirmToggleStatus}
        onCancel={closeStatusDialog}
      />
    </div>
  );
};

export default JobDescriptionList;
