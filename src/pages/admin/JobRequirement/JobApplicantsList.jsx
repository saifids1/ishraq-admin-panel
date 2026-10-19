import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Search as SearchIcon,
  X as CloseIcon,
  Inbox,
  ChevronsRight,
  Plus,
  ChevronsLeft,
  Mail,
  Phone,
  Paperclip,
} from "lucide-react";
import { JOB_CATEGORIES, getUsers } from "./jobseekerData";

/* ------------------------------ HELPERS ------------------------------ */

const CATEGORY_STYLE = {
  Nurse: "bg-sky-600 text-white ring-sky-700",
  Doctor: "bg-indigo-600 text-white ring-indigo-700",
  Pharmacist: "bg-violet-600 text-white ring-violet-700",
  "Lab Technician": "bg-teal-600 text-white ring-teal-700",
  Caregiver: "bg-amber-500 text-white ring-amber-600",
  "Admin / Office Staff": "bg-slate-600 text-white ring-slate-700",
  Other: "bg-gray-600 text-white ring-gray-700",
};

const AVATAR_GRADIENTS = [
  "from-[#2c6b8a] to-[#5ba6bd]",
  "from-violet-500 to-indigo-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-rose-500 to-pink-400",
  "from-sky-500 to-cyan-400",
];

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const Avatar = ({ user }) => (
  <span
    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br ${
      AVATAR_GRADIENTS[user.id % AVATAR_GRADIENTS.length]
    } text-[11px] font-bold text-white shadow-sm ring-2 ring-white`}
  >
    {initials(user.fullName)}
  </span>
);

/* ------------------------------ CONSTANTS ------------------------------ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

/* ------------------------------ NORMALIZE ------------------------------ */

const toListRow = (item, srNo) => ({
  ...item,
  id: item.id,
  fullName: item.fullName,
  email: item.email,
  mobile: item.mobile,
  jobCategory: item.jobCategory,
  experience: item.totalYearsExpirence,
  document: item.document,
  status: item.status,
  srNo,
});

/* ------------------------------ COMPONENT ------------------------------ */

const JobApplicantsList = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [query, setQuery] = useState({
    search: "",
    category: "All",
  });

  /* --------------------------- FETCH --------------------------- */

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    try {
      const list = getUsers() || [];
      setRows(list.map((item, index) => toListRow(item, index + 1)));
    } catch (err) {
      setRows([]);
      setError("Unable to load jobseekers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------------------- QUERY HELPERS ---------------------------- */

  const patchFilter = (patch) => setQuery((q) => ({ ...q, ...patch }));

  /* ---------------------------- FILTERED ROWS ---------------------------- */

  const filteredRows = useMemo(() => {
    const q = query.search.trim().toLowerCase();
    return rows.filter((u) => {
      if (
        q &&
        !["fullName", "email", "mobile", "jobCategory"].some((k) =>
          String(u[k] ?? "").toLowerCase().includes(q),
        )
      )
        return false;
      if (query.category !== "All" && u.jobCategory !== query.category)
        return false;
      return true;
    });
  }, [rows, query]);

  const count = filteredRows.length;
  const totalPagesLocal = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.min(page, totalPagesLocal);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);

  const pageNumbers = useMemo(() => {
    const win = 5;
    let from = Math.max(1, currentPage - Math.floor(win / 2));
    const to = Math.min(totalPagesLocal, from + win - 1);
    from = Math.max(1, to - win + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, totalPagesLocal]);

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
    <div className="mx-auto max-w-[1400px] rounded-[14px] border border-[#e2e8ee] bg-white p-4 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:px-5">
      {/* HEADER */}
      <div className="mb-2 flex flex-col items-start justify-between gap-3 xl:flex-row xl:items-center">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            title="Back"
            aria-label="Back"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f]"
          >
            <ChevronsLeft size={18} strokeWidth={2} />
          </button>

          <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
            Applicant List
          </h1>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto">
          <div className="relative min-w-[280px] flex-1 xl:flex-none">
            <SearchIcon
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
            />
            <input
              type="search"
              aria-label="Search jobseekers..."
              placeholder="Search by name, email or mobile"
              value={query.search}
              onChange={(e) => patchFilter({ search: e.target.value })}
              className="h-9 w-full rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] pl-9 pr-3 text-[13px] text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
            />
          </div>

          {JOB_CATEGORIES.length > 0 && (
            <div className="relative min-w-[200px] flex-1 xl:flex-none">
              <select
                aria-label="Job Category"
                value={query.category}
                onChange={(e) => patchFilter({ category: e.target.value })}
                className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] px-3 pr-9 text-[15px] font-medium text-[#34445a] outline-none transition hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
              >
                <option value="All">Job Category: All</option>
                {JOB_CATEGORIES.map((o) => (
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

      {/* TABLE — header stays fixed; only body scrolls */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[#cbe1f4]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] table-fixed border-collapse text-[15px]">
            <colgroup>
              <col style={{ width: "60px" }} />
              <col style={{ width: "280px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "140px" }} />
            </colgroup>

            <thead className="sticky top-0 z-10">
              <tr>
                <th scope="col" className={thClass}>Sr.No</th>
                <th scope="col" className={thClass}>Full Name</th>
                <th scope="col" className={thClass}>Job Category</th>
                <th scope="col" className={thClass}>Mobile</th>
                <th scope="col" className={thClass}>Experience</th>
                <th scope="col" className={thClass}>Resume</th>
                <th scope="col" className={thClass}>Actions</th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Body-only scroll container */}
        <div
          className="common-scrollbar max-h-[55vh] overflow-y-auto overflow-x-auto"
          style={{ scrollbarGutter: "stable" }}
        >
          <table className="w-full min-w-[1000px] table-fixed border-collapse text-[15px]">
            <colgroup>
              <col style={{ width: "60px" }} />
              <col style={{ width: "280px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "140px" }} />
            </colgroup>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
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
                  <td colSpan={7} className="border-t border-[#e2e8ee] px-4 py-12 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                      <Inbox size={22} />
                    </div>
                    <p className="mt-3 text-[15px] text-[#1e2b36]">
                      No applicants yet
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
                    {/* Sr.No */}
                    <td className={`${td} tabular-nums`}>
                      {start + index + 1}
                    </td>

                    {/* Full Name + Email */}
                    <td className={`${td} whitespace-nowrap`}>
                      <div className="flex items-center gap-2.5">
                        <Avatar user={row} />
                        <span className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-900 truncate">
                            {row.fullName || "-"}
                          </span>
                          {row.email ? (
                            <span className="inline-flex items-center gap-1 text-[12px] text-[#6b7a88] truncate">
                              <Mail size={12} className="shrink-0" />
                              <span className="truncate">{row.email}</span>
                            </span>
                          ) : (
                            <span className="text-[12px] text-[#9aa5b1]">-</span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Job Category */}
                    <td className={`${td} whitespace-nowrap`}>
                      <span
                        title={row.jobCategory}
                        className={`inline-flex h-7 w-[140px] items-center justify-center rounded-md px-2.5 text-[15px] ring-1 ring-inset whitespace-nowrap shadow-sm ${
                          CATEGORY_STYLE[row.jobCategory] || CATEGORY_STYLE.Other
                        }`}
                      >
                        <span className="truncate">{row.jobCategory || "-"}</span>
                      </span>
                    </td>

                    {/* Mobile */}
                    <td className={`${td} whitespace-nowrap`}>
                      {row.mobile ? (
                        <span className="inline-flex items-center gap-1 text-[15px] tabular-nums">
                          <Phone size={13} className="shrink-0" />
                          {row.mobile}
                        </span>
                      ) : (
                        <span className="text-[#9aa5b1]">-</span>
                      )}
                    </td>

                    {/* Experience */}
                    <td className={`${td} whitespace-nowrap tabular-nums`}>
                      <strong className="font-semibold">
                        {row.experience ?? 0}
                      </strong>
                      <span className="text-[#6b7a88]"> Years</span>
                    </td>

                    {/* Resume */}
                    <td className={`${td} whitespace-nowrap`}>
                      {row.document?.name ? (
                        <span className="inline-flex items-center gap-1 text-[15px] truncate">
                          <Paperclip size={13} className="shrink-0" />
                          <span className="truncate" title={row.document.name}>
                            {row.document.name}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#9aa5b1]">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className={`${td} justify-center text-center`}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          title={`View ${row.fullName || "Jobseeker"}`}
                          aria-label={`View ${row.fullName || "Jobseeker"}`}
                          onClick={() => navigate(`/admin/jobseekers/${row.id}`)}
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
    </div>
  );
};

export default JobApplicantsList;