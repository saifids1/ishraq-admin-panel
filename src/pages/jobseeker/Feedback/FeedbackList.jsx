import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronsRight,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search as SearchIcon,
  Star,
} from "lucide-react";

import { getFeedbackByUserId } from "../../../api/feedbackApi";
import { getCurrentUserId } from "../../../utils/authUtils";

/* ------------------------------ CONSTANTS ------------------------------ */

const PAGE_SIZES = [10, 25, 50, 100];
const TABLE_MIN_WIDTH = 1000;

const TABLE_COLUMNS = [
  { key: "srNo", label: "Sr.No", width: "70px" },
  { key: "requestNo", label: "Request No.", width: "170px" },
  { key: "name", label: "Full Name", width: "200px" },
  { key: "rating", label: "Rating", width: "190px" },
  { key: "experience", label: "Overall Experience", width: "300px" },
  { key: "createdAt", label: "Submit Date", width: "140px" },
  { key: "actions", label: "Action", width: "110px" },
];

const TABLE_COL_COUNT = TABLE_COLUMNS.length;

/* ------------------------------ HELPERS ------------------------------ */

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}-${month}-${date.getFullYear()}`;
};

/* ------------------------------ COMPONENT ------------------------------ */

const FeedbackList = () => {
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  const [feedback, setFeedback] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Share an in-flight request between repeated effects for the same page.
  // This also avoids duplicate concurrent requests in React Strict Mode.
  const requestsRef = useRef(new Map());
  const requestKey = `${userId ?? ""}-${page}-${pageSize}`;

  /* refs for horizontal scroll sync */
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);

  const fetchFeedback = useCallback(
    async ({ force = false } = {}) => {
      if (userId === null || userId === undefined || userId === "") {
        setFeedback([]);
        setTotalRecords(0);
        setTotalPages(1);
        setError("Unable to identify the logged-in user. Please log in again.");
        return;
      }

      const key = `${userId}-${page}-${pageSize}`;

      setLoading(true);
      setError("");

      let request = requestsRef.current.get(key);

      if (force || !request) {
        request = getFeedbackByUserId(userId, page, pageSize);
        requestsRef.current.set(key, request);
      }

      try {
        const response = await request;

        if (response?.success === false) {
          throw new Error(response.message || "Unable to retrieve feedback.");
        }

        // Actual response:
        // { success, message, data: { pageNo, pageSize,
        //   totalRecords, totalPages, data: [...] } }
        const result = response?.data;
        const records = Array.isArray(result?.data) ? result.data : [];

        setFeedback(
          records.map((item) => ({
            id: item.fB_feedback_id,
            requestNo: item.fB_request_no || "-",
            name: item.fB_name || "-",
            contact: item.fB_contact || "-",
            userType: item.userTypeName || "-",
            rating: Math.min(5, Math.max(0, Number(item.fB_rating) || 0)),
            experience: item.fB_overall_experience || "-",
            usefulText: item.fB_useful_text || "-",
            improveText: item.fB_improve_text || "-",
            suggestions: item.fB_suggestions || "-",
            createdAt: formatDate(item.fB_created_at),
            active: item.fB_is_active,
          })),
        );

        setTotalRecords(Number(result?.totalRecords) || 0);
        setTotalPages(Math.max(1, Number(result?.totalPages) || 1));
      } catch (err) {
        console.error("Failed to fetch feedback:", err);

        setFeedback([]);
        setTotalRecords(0);
        setTotalPages(1);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load feedback. Please try again.",
        );
      } finally {
        // Only remove the cached promise if it is still this request.
        if (requestsRef.current.get(key) === request) {
          requestsRef.current.delete(key);
        }

        setLoading(false);
      }
    },
    [userId, page, pageSize],
  );

  useEffect(() => {
    fetchFeedback();
  }, [requestKey, fetchFeedback]);

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

  // Search filters the feedback on the current page only.
  const filteredFeedback = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return feedback;

    return feedback.filter((item) =>
      [
        item.name,
        item.contact,
        item.userType,
        item.requestNo,
        item.experience,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [feedback, search]);

  const pageNumbers = useMemo(() => {
    const count = 5;
    let from = Math.max(1, page - Math.floor(count / 2));
    const to = Math.min(totalPages, from + count - 1);

    from = Math.max(1, to - count + 1);

    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [page, totalPages]);

  const start = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRecords);

  const changePageSize = (event) => {
    setPageSize(Number(event.target.value));
    setPage(1);
  };

  const refresh = () => fetchFeedback({ force: true });

  /* --------------------------- STYLES --------------------------- */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";
  const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] disabled:cursor-not-allowed disabled:border-[#e2e8ee] disabled:text-[#b8c4d3] disabled:hover:bg-white disabled:hover:text-[#b8c4d3]`;
  const td =
    "border-t border-[#e2e8ee] px-3.5 py-2.5 text-[15px] font-semibold text-black";
  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-left text-[15px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)]";

  const btnRefresh =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

  const btnAdd =
    "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2";

  /* Sticky actions column — header + cells */
  const stickyActionsHead =
    "sticky right-0 z-30 whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-center text-[15px] font-semibold tracking-wide text-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.25)]";
  const stickyActionsCell =
    "sticky right-0 z-20 bg-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.15)] group-even:bg-[#f9fbfc] group-hover:bg-[#e8f1f6]";

  /* --------------------------- RENDER --------------------------- */

  return (
    <div className="mx-auto max-w-[1500px] rounded-[14px] border border-[#e2e8ee] bg-white p-4 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:px-5">
      {/* HEADER */}
      <div className="mb-2 flex flex-col items-start justify-between gap-3 xl:flex-row xl:items-center">
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
          Feedback List
        </h1>

        <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto">
          <div className="relative min-w-[320px] flex-1 xl:flex-none">
            <SearchIcon
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
            />
            <input
              type="search"
              aria-label="Search feedback"
              placeholder="Search by name, contact or request number"
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
            onClick={() => navigate("/jobseeker/feedback-add")}
            className={btnAdd}
          >
            <Plus size={15} strokeWidth={2.2} />
            <span>Add Feedback</span>
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
          className="mb-3 flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* TABLE */}
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
                  {TABLE_COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={
                        c.key === "actions" ? stickyActionsHead : thClass
                      }
                    >
                      {c.label}
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
                      colSpan={TABLE_COL_COUNT}
                      className="px-4 py-12 text-center"
                    >
                      <div className="flex flex-col items-center">
                        <span
                          aria-hidden="true"
                          className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#e8f1f6] border-t-[#2c6b8a]"
                        />
                        <p className="mt-3 text-[15px] text-[#6b7a88]">
                          Loading feedback...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredFeedback.length === 0 ? (
                  <tr>
                    <td
                      colSpan={TABLE_COL_COUNT}
                      className="border-t border-[#e2e8ee] px-4 py-12 text-center"
                    >
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                        <MessageSquareText size={22} />
                      </div>
                      <p className="mt-3 text-[15px] text-[#1e2b36]">
                        {search.trim()
                          ? "No feedback matches your search."
                          : "No feedback found."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredFeedback.map((item, index) => (
                    <tr
                      key={item.id}
                      style={{
                        animationDelay: `${Math.min(index, 12) * 35}ms`,
                      }}
                      className="js-row group transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                    >
                      <td className={`${td} tabular-nums`}>{start + index}</td>

                      <td className={`${td} whitespace-nowrap`}>
                        <div className="w-full min-w-0 truncate">
                          {item.requestNo}
                        </div>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <div className="w-full min-w-0 truncate">
                          {item.name}
                        </div>
                      </td>

                      <td className={td}>
                        <div
                          className="flex items-center gap-0.5"
                          aria-label={`${item.rating} out of 5 stars`}
                        >
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={15}
                              fill={star <= item.rating ? "#f59e0b" : "none"}
                              className={
                                star <= item.rating
                                  ? "text-amber-500"
                                  : "text-slate-300"
                              }
                            />
                          ))}
                          <span className="ml-1 text-xs text-slate-600">
                            ({item.rating}/5)
                          </span>
                        </div>
                      </td>

                      <td className={td}>
                        <div
                          className="w-full min-w-0 truncate"
                          title={item.experience}
                        >
                          {item.experience}
                        </div>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        {item.createdAt}
                      </td>

                      <td className={`${td} ${stickyActionsCell} text-center`}>
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/jobseeker/feedback/${item.id}`, {
                                state: { feedback: item },
                              })
                            }
                            title="View feedback"
                            aria-label={`View feedback ${item.requestNo}`}
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
              onChange={changePageSize}
              disabled={loading}
              className="h-8 cursor-pointer rounded-lg border border-[#dce3eb] bg-white px-2 text-[13px] text-[#34445a] hover:border-[#2c6b8a] focus:border-[#2c6b8a] focus:outline-none focus:ring-2 focus:ring-[#2c6b8a]/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <nav
          aria-label="Feedback pagination"
          className="flex flex-wrap items-center gap-1"
        >
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
            className={navBtn}
          >
            Previous
          </button>

          {pageNumbers.map((number) => (
            <button
              key={number}
              type="button"
              onClick={() => setPage(number)}
              disabled={loading}
              aria-current={number === page ? "page" : undefined}
              className={`${pageBtn} ${
                number === page
                  ? "bg-gradient-to-br from-[#2c6b8a] to-[#3b86a6] font-semibold text-white shadow-[0_2px_6px_rgba(44,107,138,0.45)] ring-2 ring-[#2c6b8a]/25"
                  : "border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a]"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {number}
            </button>
          ))}

          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={page >= totalPages || loading}
            className={navBtn}
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  );
};

export default FeedbackList;