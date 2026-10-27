import { useStatusToast } from "../../../components/common/StatusModalProvider";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronsLeft,
  ChevronsRight,
  Inbox,
  Search as SearchIcon,
  RefreshCw,
} from "lucide-react";
import * as jobRequirementApi from "../../../api/jobRequirementApi";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

/* ------------------------------ HELPERS ------------------------------ */

const formatDate = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const s = String(value).trim();
  if (s.startsWith("0001-01-01")) return "-";

  let d;
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (plain) {
    d = new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));
  } else {
    d = value instanceof Date ? value : new Date(s);
  }
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

/* ------------------------------ CONSTANTS ------------------------------ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

/* Visible table columns — Applied Date now sits right after Jobseeker No. */
const TABLE_COLUMNS = [
  { key: "srNo", label: "Sr.No", width: "60px", minWidth: "50px" },
  { key: "applyId", label: "Application ID", width: "170px", minWidth: "130px" },
  { key: "name", label: "Applicant Name", width: "200px", minWidth: "150px" },
  { key: "jobseekerNo", label: "Jobseeker No.", width: "180px", minWidth: "140px" },
  { key: "appliedAt", label: "Applied Date", width: "130px", minWidth: "100px" },
  { key: "mobile", label: "Mobile Number", width: "140px", minWidth: "110px" },
  { key: "email", label: "Email", width: "230px", minWidth: "170px" },
  { key: "qualification", label: "Qualification", width: "150px", minWidth: "110px" },
  { key: "speciality", label: "Speciality", width: "150px", minWidth: "110px" },
  { key: "experience", label: "Experience", width: "110px", minWidth: "85px" },
  { key: "currentDesignation", label: "Current Designation", width: "170px", minWidth: "130px" },
  { key: "currentEmployer", label: "Current Employer", width: "170px", minWidth: "130px" },
  { key: "preferredLocation", label: "Preferred Location", width: "170px", minWidth: "130px" },
  // { key: "actions", label: "Action", width: "100px" },
];

const TABLE_COL_COUNT = TABLE_COLUMNS.length;
const TABLE_MIN_WIDTH = 2000;

/* ------------------------------ COMPONENT ------------------------------ */

const JobApplicantList = () => {
  const { jobdescId } = useParams();
  const navigate = useNavigate();

  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [query, setQuery] = useState({ search: "" });

  const [toast, setToast] = useStatusToast();

  /* --------------------------- FETCH --------------------------- */

  const load = useCallback(async () => {
    if (!jobdescId) {
      setError("Job requirement ID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await jobRequirementApi.getApplications(jobdescId, {
        pageNo: page,
        pageSize,
      });

      const root = response?.data ?? response;
      const payload = root?.data ?? root?.Data ?? root;
      const list = Array.isArray(payload)
        ? payload
        : (payload?.data ?? payload?.Data ?? []);

      const rows = list.map((app, i) => {
        const jobseeker = app?.jobseeker ?? {};
        const city = jobseeker?.city ?? {};
        return {
          id: app?.aP_application_id ?? app?.application_id ?? app?.id,
          jobdescId: app?.aP_job_requirement_id ?? jobdescId,
          srNo: (page - 1) * pageSize + i + 1,
          applyId: app?.apply_Id ?? "-",
          name: jobseeker?.jB_full_name ?? "-",
          jobseekerNo: jobseeker?.jB_jobseeker_no ?? "-",
          appliedAt: app?.aP_created_at ?? null,
          mobile: jobseeker?.jB_mobile ?? "-",
          email: jobseeker?.jB_email ?? "-",
          qualification: jobseeker?.jB_highest_qualification ?? "-",
          speciality: jobseeker?.jB_speciality ?? "-",
          experience:
            jobseeker?.jB_total_experience !== null &&
            jobseeker?.jB_total_experience !== undefined
              ? String(jobseeker.jB_total_experience)
              : "-",
          currentDesignation: jobseeker?.jB_current_designation ?? "-",
          currentEmployer: jobseeker?.jB_current_employer ?? "-",
          preferredLocation:
            city?.ctM_CityName ??
            jobseeker?.preferredLocation ??
            jobseeker?.jB_preferred_location ??
            "-",
        };
      });

      setApplicants(rows);
      setTotalRecords(
        Number(
          root?.totalRecords ??
            payload?.totalRecords ??
            root?.totalCount ??
            list.length,
        ),
      );
      setTotalPages(Number(root?.totalPages ?? payload?.totalPages ?? 0) || 1);
    } catch (err) {
      setApplicants([]);
      setTotalRecords(0);
      setTotalPages(0);
      setError(getApiErrorMessage(err) || "Unable to load applicant records.");
    } finally {
      setLoading(false);
    }
  }, [jobdescId, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  /* --------------------------- REFRESH (silent) --------------------------- */

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load, refreshing]);

  /* --------------------------- FILTERED ROWS --------------------------- */

  const filteredRows = useMemo(() => {
    const q = query.search.trim().toLowerCase();
    if (!q) return applicants;
    return applicants.filter((a) =>
      [
        a.applyId,
        a.name,
        a.jobseekerNo,
        a.mobile,
        a.email,
        a.qualification,
        a.speciality,
        String(a.experience ?? ""),
        a.currentDesignation,
        a.currentEmployer,
        a.preferredLocation,
        formatDate(a.appliedAt),
      ].some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [applicants, query]);

  const count = totalRecords;
  const totalPagesLocal = Math.max(
    totalPages || Math.ceil(count / pageSize),
    1,
  );
  const currentPage = Math.min(page, totalPagesLocal);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filteredRows;

  useEffect(() => {
    if (page > totalPagesLocal) setPage(totalPagesLocal);
  }, [page, totalPagesLocal]);

  const pageNumbers = useMemo(() => {
    const win = 5;
    let from = Math.max(1, currentPage - Math.floor(win / 2));
    const to = Math.min(totalPagesLocal, from + win - 1);
    from = Math.max(1, to - win + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, totalPagesLocal]);

  /* --------------------------- PATCH FILTER --------------------------- */

  const patchFilter = (patch) => {
    setQuery((q) => ({ ...q, ...patch }));
    setPage(1);
  };

  /* --------------------------- TOAST --------------------------- */

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  /* --------------------------- STYLES --------------------------- */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";
  const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] disabled:cursor-not-allowed disabled:border-[#e2e8ee] disabled:text-[#b8c4d3] disabled:hover:bg-white disabled:hover:text-[#b8c4d3]`;
  const td =
    "border-t border-[#e2e8ee] px-2 py-2 text-[13px] text-slate-900 sm:px-3.5 sm:py-2.5 sm:text-[15px]";
  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-2 py-2 text-left text-[12px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)] sm:px-4 sm:py-1.5 sm:text-[15px]";

  const btnRefresh =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

  /* --------------------------- RENDER --------------------------- */

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] rounded-[14px] border border-[#e2e8ee] bg-white p-2.5 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:p-4 lg:px-5">
      {/* HEADER */}
      <div className="mb-2 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            title="Back"
            aria-label="Back"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f]"
          >
            <ChevronsLeft size={18} strokeWidth={2} />
          </button>

          <h2 className="truncate text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
            Job Applicants
          </h2>
        </div>

        <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center md:w-auto">
          <div className="relative w-full sm:flex-1 md:w-[240px] md:flex-none">
            <SearchIcon
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
            />
            <input
              type="search"
              aria-label="Search applicants"
              placeholder="Search by name, email, application id..."
              value={query.search}
              onChange={(e) => patchFilter({ search: e.target.value })}
              className="h-9 w-full rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] pl-9 pr-3 text-[13px] text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
            />
          </div>

          {/* Refresh */}
          <button
            type="button"
            title="Refresh table"
            aria-label="Refresh table"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className={`${btnRefresh} w-full sm:w-auto`}
          >
            <RefreshCw
              size={15}
              strokeWidth={2.2}
              className={`transition-transform duration-500 ${
                refreshing ? "animate-spin" : "group-hover:rotate-90"
              }`}
            />
            <span className="inline">
              {refreshing ? "Refreshing..." : "Refresh"}
            </span>
          </button>

          {/* <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#dce3eb] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
          >
            <ChevronsLeft size={15} strokeWidth={2.2} />
            <span>Back</span>
          </button> */}
        </div>
      </div>
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

      {/* TABLE */}
      <div className="common-scrollbar mt-4 h-[470px] w-full min-w-0 overflow-auto rounded-lg border border-[#cbe1f4]">
        <table
          className="w-full table-fixed border-collapse text-[13px] sm:text-[15px]"
          style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
        >
          <colgroup>
            {TABLE_COLUMNS.map((c) => (
              <col key={c.key} style={{ width: c.width, minWidth: c.minWidth }} />
            ))}
          </colgroup>

          <thead className="sticky top-0 z-30">
            <tr>
              {TABLE_COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`${thClass} sticky top-0 z-30 ${
                    c.key === "actions" ? "sticky right-0 top-0 z-30" : ""
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

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
                    <p className="mt-3 text-[14px] text-[#6b7a88] sm:text-[15px]">
                      Loading...
                    </p>
                  </div>
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={TABLE_COL_COUNT}
                  className="border-t border-[#e2e8ee] px-4 py-12 text-center"
                >
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                    <Inbox size={22} />
                  </div>
                  <p className="mt-3 text-[14px] text-[#1e2b36] sm:text-[15px]">
                    {query.search
                      ? "No applicants match your search."
                      : "No applicants have applied for this job yet."}
                  </p>
                </td>
              </tr>
            ) : (
              pageRows.map((row, index) => (
                <tr
                  key={row.id ?? index}
                  style={{
                    animationDelay: `${Math.min(index, 12) * 35}ms`,
                  }}
                  className="js-row group transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                >
                  <td className={`${td} tabular-nums`}>
                    {row.srNo ?? start + index + 1}
                  </td>

                  <td className={`${td} whitespace-nowrap`}>
                    <div className="w-full min-w-0 truncate">
                      {row.applyId ?? "-"}
                    </div>
                  </td>

                  <td className={`${td} whitespace-nowrap`}>
                    <div className="w-full min-w-0 truncate">
                      {row.name ?? "-"}
                    </div>
                  </td>

                  <td className={`${td} whitespace-nowrap`}>
                    <div className="w-full min-w-0 truncate">
                      {row.jobseekerNo ?? "-"}
                    </div>
                  </td>

                  <td className={`${td} whitespace-nowrap text-center`}>
                    <div className="w-full min-w-0 truncate">
                      {formatDate(row.appliedAt)}
                    </div>
                  </td>

                  <td className={`${td} whitespace-nowrap`}>
                    <div className="w-full min-w-0 truncate">
                      {row.mobile ?? "-"}
                    </div>
                  </td>

                  <td className={`${td} whitespace-nowrap`}>
                    <div className="w-full min-w-0 truncate">
                      {row.email ?? "-"}
                    </div>
                  </td>

                  <td className={`${td} whitespace-nowrap`}>
                    <div className="w-full min-w-0 truncate">
                      {row.qualification ?? "-"}
                    </div>
                  </td>

                  <td className={`${td} whitespace-nowrap`}>
                    <div className="w-full min-w-0 truncate">
                      {row.speciality ?? "-"}
                    </div>
                  </td>

                  <td className={`${td} whitespace-nowrap text-center`}>
                    <div className="w-full min-w-0 truncate tabular-nums">
                      {row.experience ?? "-"}
                    </div>
                  </td>

                  <td className={`${td} whitespace-nowrap`}>
                    <div className="w-full min-w-0 truncate">
                      {row.currentDesignation ?? "-"}
                    </div>
                  </td>

                  <td className={`${td} whitespace-nowrap`}>
                    <div className="w-full min-w-0 truncate">
                      {row.currentEmployer ?? "-"}
                    </div>
                  </td>

                  <td className={`${td} whitespace-nowrap`}>
                    <div className="w-full min-w-0 truncate">
                      {row.preferredLocation ?? "-"}
                    </div>
                  </td>

                  {/* <td
                    className={`${td} sticky right-0 z-20 justify-center bg-white text-center group-hover:bg-[#e8f1f6]`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        title={`View ${row.name || "Applicant"}`}
                        aria-label={`View ${row.name || "Applicant"}`}
                        onClick={() =>
                          navigate(`/admin/jobseekers/${row.id}`)
                        }
                        className="grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                      >
                        <ChevronsRight size={14} strokeWidth={2.2} />
                      </button>
                    </div>
                  </td> */}
                </tr>
              ))
            )}
          </tbody>
        </table>
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
              {Math.min(start + pageRows.length, count)}
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

      {/* TOAST */}
      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="js-toast fixed bottom-3 left-3 right-3 z-[60] flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#1e2b36] px-4 py-3 text-[14px] font-medium text-white shadow-2xl sm:bottom-5 sm:left-auto sm:right-5 sm:text-[15px]"
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
  );
};

export default JobApplicantList;