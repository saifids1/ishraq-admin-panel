import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronsRight,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search as SearchIcon,
} from "lucide-react";

import { getComplaintsByUserId } from "../../../api/complaintApi";
import { getCurrentUserId2 } from "../../../utils/authUtils";

/* ------------------------------ CONSTANTS ------------------------------ */

const PAGE_SIZES = [10, 25, 50, 100];
const TABLE_MIN_WIDTH = 1250;

const TABLE_COLUMNS = [
  { key: "srNo", width: "70px" },
  { key: "referenceNo", width: "170px" },
  { key: "fullName", width: "200px" },
  // { key: "complaintCategory", width: "190px" },
  { key: "details", width: "280px" },
  { key: "createdAt", width: "130px" },
  { key: "status", width: "120px" },
  { key: "actions", width: "110px" },
];

const BADGE_BASE =
  "inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

const STATUS_BADGE = {
  new: "bg-yellow-400 text-yellow-950 ring-yellow-500 shadow-yellow-400/30",
  open: "bg-blue-600 text-white ring-blue-700 shadow-blue-600/20",
  "in-progress":
    "bg-orange-500 text-white ring-orange-600 shadow-orange-500/20",
  hold: "bg-red-600 text-white ring-red-700 shadow-red-600/20",
  closed: "bg-emerald-600 text-white ring-emerald-700 shadow-emerald-600/20",
};

const statusBadgeClass = (value) =>
  STATUS_BADGE[
    String(value ?? "")
      .trim()
      .toLowerCase()
  ] ?? "bg-slate-500 ring-slate-600 shadow-slate-500/20";

// Deduplicate concurrent requests across component remounts.
// This also handles React StrictMode's development effect replay.
const inFlightRequests = new Map();

const requestOnce = (key, request) => {
  const existingRequest = inFlightRequests.get(key);

  if (existingRequest) {
    return existingRequest;
  }

  const promise = Promise.resolve()
    .then(request)
    .finally(() => {
      if (inFlightRequests.get(key) === promise) {
        inFlightRequests.delete(key);
      }
    });

  inFlightRequests.set(key, promise);
  return promise;
};

/* ------------------------------ HELPERS ------------------------------ */

const getValue = (item, keys, fallback = "") => {
  if (!item || typeof item !== "object") return fallback;

  for (const key of keys) {
    const value = item[key];

    if (
      value !== undefined &&
      value !== null &&
      typeof value !== "object" &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  // Support differences in PascalCase/camelCase property names.
  const existingKeys = Object.keys(item);

  for (const key of keys) {
    const matchedKey = existingKeys.find(
      (existing) => existing.toLowerCase() === key.toLowerCase(),
    );

    if (!matchedKey) continue;

    const value = item[matchedKey];

    if (
      value !== undefined &&
      value !== null &&
      typeof value !== "object" &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return fallback;
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}-${month}-${date.getFullYear()}`;
};

// Map the actual complaint API response to the UI model.
const mapComplaint = (item) => ({
  id: getValue(
    item,
    ["cP_complaint_id", "CP_ComplaintId", "complaintId", "id"],
    null,
  ),

  referenceNo: getValue(
    item,
    ["cP_reference_no", "CP_ReferenceNo", "cP_request_no", "requestNo"],
    "-",
  ),

  fullName: getValue(
    item,
    ["cP_full_name", "cP_name", "cP_complainer_name", "fullName", "name"],
    "-",
  ),

  contactNo: getValue(
    item,
    ["cP_mobile", "cP_contact", "cP_contact_no", "contactNo", "contact"],
    "-",
  ),

  email: getValue(item, ["cP_email", "cP_email_id", "email"], "-"),

  userType: getValue(item, ["userTypeName", "cP_user_type_name"], "-"),

  complaintCategory: getValue(
    item,
    [
      "complaintCategoryName",
      "cP_complaint_category_name",
      "complaintCategory",
      "categoryName",
    ],
    "-",
  ),

  details: getValue(item, ["cP_details", "complaintDetails", "details"], "-"),

  status: getValue(item, ["statusName", "cP_status_name"], "-"),

  createdAt: formatDate(
    getValue(item, ["cP_created_at", "cP_created_date", "createdAt"], ""),
  ),

  raw: item,
});

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  return (
    responseData?.message ||
    responseData?.Message ||
    responseData?.title ||
    error?.message ||
    "Unable to load complaints. Please try again."
  );
};

// Normalize either an Axios response or an already-unwrapped API response.
const normalizeResponse = (response) => {
  if (response?.data?.success !== undefined) {
    return response.data;
  }

  return response;
};

/* ------------------------------ COMPONENT ------------------------------ */

const ComplaintList = () => {
  const navigate = useNavigate();

  // Read the current user once for this mounted page.
  const userId = getCurrentUserId2();

  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Prevent stale responses from overwriting newer page results.
  const requestSequence = useRef(0);

  // Horizontal scroll sync between header and body.
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);

  const fetchComplaints = useCallback(async () => {
    if (userId === undefined || userId === null || userId === "") {
      setComplaints([]);
      setTotalRecords(0);
      setTotalPages(1);
      setLoading(false);
      setError("Unable to identify the logged-in user. Please log in again.");
      return;
    }

    const requestId = ++requestSequence.current;

    setLoading(true);
    setError("");

    const requestKey = ["complaints", String(userId), page, pageSize].join(":");

    try {
      const response = await requestOnce(requestKey, () =>
        getComplaintsByUserId(userId, page, pageSize),
      );

      // Ignore responses belonging to an outdated request.
      if (requestId !== requestSequence.current) return;

      const body = normalizeResponse(response);

      if (body?.success === false) {
        throw new Error(body.message || "Unable to load complaints.");
      }

      // Expected API:
      // { success: true, data: { pageNo, pageSize, totalRecords, totalPages, data: [...] } }
      const result = body?.data;
      const rows = Array.isArray(result?.data) ? result.data : [];

      setComplaints(rows.map(mapComplaint));
      setTotalRecords(Math.max(0, Number(result?.totalRecords) || 0));
      setTotalPages(Math.max(1, Number(result?.totalPages) || 1));
    } catch (err) {
      if (requestId !== requestSequence.current) return;

      console.error("Failed to fetch complaints:", err);

      setComplaints([]);
      setTotalRecords(0);
      setTotalPages(1);
      setError(getErrorMessage(err));
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [userId, page, pageSize]);

  useEffect(() => {
    fetchComplaints();

    return () => {
      // Invalidate pending responses on cleanup or page changes.
      requestSequence.current += 1;
    };
  }, [fetchComplaints]);

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

  /* --------------------------- SEARCH (current page) --------------------------- */

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return complaints;

    return complaints.filter((item) =>
      [
        item.referenceNo,
        item.fullName,
        item.contactNo,
        item.email,
        item.userType,
        item.complaintCategory,
        item.details,
        item.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [complaints, search]);

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

  const refresh = () => {
    if (!loading) fetchComplaints();
  };

  /* ---------------------------- STYLES ---------------------------- */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";
  const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] disabled:cursor-not-allowed disabled:border-[#e2e8ee] disabled:text-[#b8c4d3] disabled:hover:bg-white disabled:hover:text-[#b8c4d3]`;
  const td =
    "border-t border-[#e2e8ee] px-3.5 py-2.5 text-[15px] font-semibold text-black";
  const btnRefresh =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
  const btnAdd =
    "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2";

  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-left text-[15px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)]";

  /* Sticky actions column: header + cells */
  const stickyActionsHead =
    "sticky right-0 z-30 whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-center text-[15px] font-semibold tracking-wide text-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.25)]";
  const stickyActionsCell =
    "sticky right-0 z-20 bg-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.15)] group-even:bg-[#f9fbfc] group-hover:bg-[#e8f1f6]";

  const headers = [
    { key: "srNo", label: "Sr.No", className: thClass },
    { key: "referenceNo", label: "Request No.", className: thClass },
    { key: "status", label: "Status", className: thClass },
    { key: "createdAt", label: "Submit Date", className: thClass },
    { key: "fullName", label: "Full Name", className: thClass },
    {
      key: "complaintCategory",
      label: "Complaint Category",
      className: thClass,
    },
    // { key: "details", label: "Complaint Details", className: thClass },
    { key: "actions", label: "Action", className: stickyActionsHead },
  ];

  /* --------------------------- RENDER --------------------------- */

  return (
    <div className="mx-auto max-w-[1500px] rounded-[14px] border border-[#e2e8ee] bg-white lg:p-4 p-2 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:px-5">
      {/* HEADER */}
      <div className="mb-2 flex flex-col items-start justify-between gap-3 xl:flex-row xl:items-center">
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
          Complaints / Grievances
        </h1>

        <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto xl:justify-end">
          <div className="relative min-w-[280px] flex-1 xl:flex-none">
            <SearchIcon
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
            />
            <input
              type="search"
              aria-label="Search complaints"
              placeholder="Search by reference, name, category or details"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] pl-9 pr-3 text-[13px] text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
            />
          </div>

          <button
            type="button"
            title="Refresh table"
            aria-label="Refresh table"
            onClick={refresh}
            disabled={loading}
            className={btnRefresh}
          >
            <RefreshCw
              size={15}
              strokeWidth={2.2}
              className={`transition-transform duration-500 ${
                loading ? "animate-spin" : "group-hover:rotate-90"
              }`}
            />
            <span className="hidden sm:inline">
              {loading ? "Refreshing..." : "Refresh"}
            </span>
          </button>

          <button
            type="button"
            title="Raise complaint"
            onClick={() => navigate("/jobseeker/complaint-add")}
            className={btnAdd}
          >
            <Plus size={15} strokeWidth={2.2} />
            <span>Raise Complaint</span>
          </button>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="my-3.5 h-px bg-gradient-to-r from-[#2c6b8a]/45 via-[#e2e8ee] to-transparent"
      />

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="mb-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="font-semibold underline disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      )}

      {/*
        TABLE LAYOUT
        - Fixed-height body with its own vertical scrollbar
        - Header strip stays put and scrolls horizontally in sync with body
        - Actions column is sticky right in BOTH header and body
      */}
      <div className="mt-4 h-[470px] overflow-hidden rounded-lg border border-[#cbe1f4]">
        <div className="flex h-full flex-col">
          {/* Header strip */}
          <div ref={headerScrollRef} className="shrink-0 overflow-hidden">
            <table
              className="w-full table-fixed border-collapse text-[15px]"
              style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
            >
              <colgroup>
                {TABLE_COLUMNS.map((c) => (
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
                {TABLE_COLUMNS.map((c) => (
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
                          Loading complaints...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredComplaints.length === 0 ? (
                  <tr>
                    <td
                      colSpan={headers.length}
                      className="border-t border-[#e2e8ee] px-4 py-12 text-center"
                    >
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                        <MessageSquareText size={22} />
                      </div>
                      <p className="mt-3 text-[15px] text-[#1e2b36]">
                        {search.trim()
                          ? "No complaints match your search."
                          : "No complaints found."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((item, index) => (
                    <tr
                      key={item.id ?? `${item.referenceNo}-${index}`}
                      style={{
                        animationDelay: `${Math.min(index, 12) * 35}ms`,
                      }}
                      className="js-row group transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                    >
                      <td className={`${td} tabular-nums`}>{start + index}</td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span
                          className="block truncate font-medium text-slate-900"
                          title={item.referenceNo}
                        >
                          {item.referenceNo}
                        </span>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <span
                          title={item.status}
                          className={`${BADGE_BASE} ${statusBadgeClass(item.status)}`}
                        >
                          {item.status || "-"}
                        </span>
                      </td>
                      <td className={`${td} whitespace-nowrap tabular-nums`}>
                        {item.createdAt}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <span
                          className="block truncate font-medium text-slate-900"
                          title={item.fullName}
                        >
                          {item.fullName}
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span
                          className="block truncate"
                          title={item.complaintCategory}
                        >
                          {item.complaintCategory}
                        </span>
                      </td>

                      <td className={`${td} ${stickyActionsCell} text-center`}>
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/jobseeker/complaints/${item.id}`, {
                                state: { complaint: item.raw },
                              })
                            }
                            title="View complaint"
                            aria-label={`View complaint ${item.referenceNo}`}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                          >
                            <ChevronsRight size={14} strokeWidth={2.2} />
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
            <strong className="font-semibold text-[#53677f]">{start}</strong> to{" "}
            <strong className="font-semibold text-[#53677f]">{end}</strong> of{" "}
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
              disabled={loading}
              className="h-8 cursor-pointer rounded-lg border border-[#dce3eb] bg-white px-2 text-[13px] text-[#34445a] hover:border-[#2c6b8a] focus:border-[#2c6b8a] focus:outline-none focus:ring-2 focus:ring-[#2c6b8a]/30 disabled:cursor-not-allowed disabled:opacity-60"
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
          aria-label="Complaint pagination"
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
              } disabled:cursor-not-allowed disabled:opacity-60`}
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
  );
};

export default ComplaintList;
