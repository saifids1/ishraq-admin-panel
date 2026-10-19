import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Star,
  ChevronsRight,
  Plus,
  RefreshCw,
  MessageSquareText,
} from "lucide-react";

import { getFeedbackByUserId } from "../../../api/feedbackApi";
import { getCurrentUserId } from "../../../utils/authUtils";

const PAGE_SIZES = [10, 25, 50, 100];

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}-${month}-${date.getFullYear()}`;
};

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
            // status: item.statusName || "-",
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

  const filteredFeedback = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return feedback;

    return feedback.filter((item) =>
      [
        item.name,
        item.contact,
        item.userType,
        item.requestNo,
        item.status,
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
    let to = Math.min(totalPages, from + count - 1);

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

  const paginationButton =
    "grid h-8 min-w-8 place-items-center rounded-lg border px-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="min-h-full bg-[#f7f9fb] text-[#1e2b36]">
      <div className="mx-auto max-w-[1500px] rounded-xl border border-[#e2e8ee] bg-white p-4 shadow-sm sm:p-5">
        {/* Header */}
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#2c6b8a]">
              Feedback List
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 ">
            {/* Search */}
            <div className="flex w-[300px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, contact or request number"
                  className="h-10 w-full rounded-lg border border-[#c9d5dd] pl-9 pr-3 text-sm outline-none focus:border-[#2c6b8a] focus:ring-2 focus:ring-[#2c6b8a]/20"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c9d5dd] px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => navigate("/employer/feedback-add")}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2c6b8a] px-3 text-sm font-semibold text-white hover:bg-[#245a75]"
            >
              <Plus size={16} />
              Add Feedback
            </button>
          </div>
        </div>

        {/* <hr className="border-[#e2e8ee]" /> */}

        {error && (
          <div
            role="alert"
            className="mb-4 flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
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

        {/* Feedback table */}
        <div className="overflow-x-auto rounded-lg border border-[#cbe1f4]">
          <table className="w-full  border-collapse text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] text-left text-white">
                {[
                  "Sr.No",
                  "Request No.",
                  "Organization Name",
                  // "Contact",
                  // "You Are",
                  "Rating",
                  "Overall Experience",
                  // "Status",
                  "Submit Date",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="whitespace-nowrap px-3 py-3 font-bold"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center text-[#60738a]"
                  >
                    <RefreshCw
                      size={22}
                      className="mx-auto mb-2 animate-spin text-[#2c6b8a]"
                    />
                    Loading feedback...
                  </td>
                </tr>
              ) : filteredFeedback.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <MessageSquareText
                      size={28}
                      className="mx-auto mb-3 text-[#2c6b8a]"
                    />
                    <p className="font-semibold text-[#34445a]">
                      {search
                        ? "No feedback matches your search."
                        : "No feedback found."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredFeedback.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-t border-[#e2e8ee] even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                  >
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-sm font-semibold text-black">
                      {start + index}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-black">
                      {item.requestNo}
                    </td>

                    <td className="px-3 py-3 text-sm font-semibold text-black">{item.name}</td>

                    {/* <td className="px-3 py-3">{item.contact}</td> */}

                    {/* <td className="px-3 py-3">{item.userType}</td> */}

                    <td className="px-3 py-3">
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

                    <td className="max-w-[220px] px-3 py-3 text-sm font-semibold text-black">
                      <span className="line-clamp-2" title={item.experience}>
                        {item.experience}
                      </span>
                    </td>

                    {/* <td className="px-3 py-3">
                      <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
                        {item.status}
                      </span>
                    </td> */}

                    <td className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-black">
                      {item.createdAt}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/employer/feedback/${item.id}`, {
                              state: { feedback: item },
                            })
                          }
                          title="View feedback"
                          aria-label={`View feedback ${item.requestNo}`}
                          className="grid h-8 w-8 place-items-center rounded-md bg-[#2c9ba8] text-white transition hover:bg-[#238491]"
                        >
                          <ChevronsRight size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-col gap-3 border-t border-[#e2e8ee] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#60738a]">
            <span>
              Showing <strong>{start}</strong> to <strong>{end}</strong> of{" "}
              <strong>{totalRecords}</strong>
            </span>

            <label className="flex items-center gap-2">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={changePageSize}
                className="h-8 rounded-lg border border-[#dce3eb] bg-white px-2 text-sm outline-none focus:border-[#2c6b8a]"
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
              onClick={() => setPage((current) => current - 1)}
              disabled={page <= 1 || loading}
              className={`${paginationButton} border-[#dce3eb] bg-white hover:bg-[#e8f1f6]`}
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
                className={`${paginationButton} ${
                  number === page
                    ? "border-[#2c6b8a] bg-[#2c6b8a] font-semibold text-white"
                    : "border-[#dce3eb] bg-white hover:bg-[#e8f1f6]"
                }`}
              >
                {number}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= totalPages || loading}
              className={`${paginationButton} border-[#dce3eb] bg-white hover:bg-[#e8f1f6]`}
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default FeedbackList;
