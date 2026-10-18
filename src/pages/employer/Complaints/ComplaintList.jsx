import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronsRight,
  Search,
  Plus,
  RefreshCw,
  MessageSquareText,
} from "lucide-react";

import { getComplaintsByUserId } from "../../../api/complaintApi";
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

const getValue = (item, keys, fallback = "") => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) {
      if (typeof item[key] === "object") continue;
      if (String(item[key]).trim() !== "") return item[key];
    }
  }

  return fallback;
};

const mapComplaint = (item) => ({
  id: getValue(item, [
    "cP_complaint_id",
    "CP_ComplaintId",
    "complaintId",
    "id",
  ]),
  requestNo: getValue(item, ["cP_request_no", "requestNo"], "-"),
  fullName: getValue(
    item,
    ["cP_name", "cP_full_name", "cP_complainer_name", "fullName", "name"],
    "-",
  ),
  contactNo: getValue(
    item,
    ["cP_contact", "cP_contact_no", "cP_mobile", "contactNo", "contact"],
    "-",
  ),
  email: getValue(item, ["cP_email", "cP_email_id", "email"], "-"),
  complaintCategory: getValue(
    item,
    [
      "complaintCategoryName",
      "categoryName",
      "cP_complaint_category_name",
      "complaintCategory",
      "category",
    ],
    "-",
  ),
  createdAt: formatDate(
    getValue(item, ["cP_created_at", "cP_created_date", "createdAt"], ""),
  ),
  raw: item,
});

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.title ||
  error?.message ||
  "Unable to load complaints. Please try again.";

const ComplaintList = () => {
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestSequence = useRef(0);

  const fetchComplaints = useCallback(
    async () => {
      if (userId === undefined || userId === null || userId === "") {
        setComplaints([]);
        setTotalRecords(0);
        setTotalPages(1);
        setError("Unable to identify the logged-in user. Please log in again.");
        return;
      }

      const sequence = ++requestSequence.current;

      setLoading(true);
      setError("");

      try {
        const response = await getComplaintsByUserId(userId, page, pageSize);

        // Ignore stale responses when the page or size has changed.
        if (sequence !== requestSequence.current) return;

        if (response?.success === false) {
          throw new Error(response?.message || "Unable to load complaints.");
        }

        // Actual response:
        // { success, message, data: { pageNo, pageSize, totalRecords, totalPages, data: [...] } }
        const result = response?.data;
        const rows = Array.isArray(result?.data) ? result.data : [];

        setComplaints(rows.map(mapComplaint));
        setTotalRecords(Number(result?.totalRecords) || 0);
        setTotalPages(Math.max(1, Number(result?.totalPages) || 1));
      } catch (err) {
        if (sequence !== requestSequence.current) return;

        console.error("Failed to fetch complaints:", err);

        setComplaints([]);
        setTotalRecords(0);
        setTotalPages(1);
        setError(getErrorMessage(err));
      } finally {
        if (sequence === requestSequence.current) setLoading(false);
      }
    },
    [userId, page, pageSize],
  );

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return complaints;

    return complaints.filter((item) =>
      [item.fullName, item.contactNo, item.email, item.complaintCategory]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [complaints, search]);

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

  const refresh = () => fetchComplaints();

  const paginationButton =
    "grid h-8 min-w-8 place-items-center rounded-lg border px-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="min-h-full bg-[#f7f9fb] text-[#1e2b36]">
      <div className="mx-auto max-w-[1500px] rounded-xl border border-[#e2e8ee] bg-white p-4 shadow-sm sm:p-5">
        {/* Header */}
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#2c6b8a]">
              Complaints / Grievances
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative w-[300px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, contact or email"
                className="h-10 w-full rounded-lg border border-[#c9d5dd] pl-9 pr-3 text-sm outline-none focus:border-[#2c6b8a] focus:ring-2 focus:ring-[#2c6b8a]/20"
              />
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
              onClick={() => navigate("/employer/complaint-add")}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2c6b8a] px-3 text-sm font-semibold text-white hover:bg-[#245a75]"
            >
              <Plus size={16} />
              Add Complaint
            </button>
          </div>
        </div>

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

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-[#cbe1f4]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] text-left text-white">
                {[
                  "Sr.No",
                  "Full Name",
                  "Contact No.",
                  "Email",
                  "Complaint Category",
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
                  <td colSpan={7} className="px-4 py-12 text-center text-[#60738a]">
                    <RefreshCw
                      size={22}
                      className="mx-auto mb-2 animate-spin text-[#2c6b8a]"
                    />
                    Loading complaints...
                  </td>
                </tr>
              ) : filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <MessageSquareText
                      size={28}
                      className="mx-auto mb-3 text-[#2c6b8a]"
                    />
                    <p className="font-semibold text-[#34445a]">
                      {search
                        ? "No complaints match your search."
                        : "No complaints found."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((item, index) => (
                  <tr
                    key={item.id ?? `${item.email}-${index}`}
                    className="border-t border-[#e2e8ee] even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                  >
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                      {start + index}
                    </td>
                    <td className="px-3 py-3 font-medium">{item.fullName}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {item.contactNo}
                    </td>
                    <td className="px-3 py-3">{item.email}</td>
                    <td className="px-3 py-3">{item.complaintCategory}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {item.createdAt}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/employer/complaints/${item.id}`, {
                              state: { complaint: item.raw },
                            })
                          }
                          title="View complaint"
                          aria-label={`View complaint from ${item.fullName}`}
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
            aria-label="Complaint pagination"
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

export default ComplaintList;