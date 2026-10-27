import StatusModal from "../../../components/common/StatusModal";
import { useStatusToast } from "../../../components/common/StatusModalProvider";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Search as SearchIcon,
  Inbox,
  ShieldAlert,
  ChevronsRight,
  Plus,
  Building2,
  Building,
  BriefcaseBusiness,
  RefreshCw,
} from "lucide-react";
import { StatCardGrid } from "../../../components/common/Dashboardkit";
import employerApi from "../../../api/Services/adminemployeelistApi";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";
import { getAdminStatusRecordLabel } from "../../../utils/adminStatusConfirmation";

/* ------------------------------ CONSTANTS ------------------------------ */

const INDUSTRY_STYLE = {
  Hospital: "bg-sky-600 text-white ring-sky-700",
  Clinic: "bg-indigo-600 text-white ring-indigo-700",
  Pharmacy: "bg-violet-600 text-white ring-violet-700",
  Diagnostics: "bg-teal-600 text-white ring-teal-700",
  "Home Care": "bg-amber-500 text-white ring-amber-600",
  "Medical College": "bg-cyan-600 text-white ring-cyan-700",
  Corporate: "bg-slate-600 text-white ring-slate-700",
  Other: "bg-gray-600 text-white ring-gray-700",
};

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const TABLE_MIN_WIDTH = 1180;

const COLUMNS = [
  { key: "srNo", width: "55px", minWidth: "50px" },
  { key: "employerId", width: "160px", minWidth: "130px" },
  { key: "companyName", width: "190px", minWidth: "140px" },
  { key: "industry", width: "150px", minWidth: "110px" },
  { key: "status", width: "105px", minWidth: "90px" },
  { key: "jobCount", width: "100px", minWidth: "85px" },
  { key: "email", width: "190px", minWidth: "150px" },
  { key: "mobile", width: "125px", minWidth: "100px" },
  { key: "actions", width: "90px", minWidth: "90px", sticky: true },
];

const COL_SPAN_ALL = COLUMNS.length;

const TONES = {
  success: { badge: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20" },
  danger: { badge: "bg-rose-600 ring-rose-700 shadow-rose-600/20" },
  warning: { badge: "bg-amber-500 ring-amber-600 shadow-amber-500/20" },
  neutral: { badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20" },
};

const STATUS_TONES = { Active: "success", Inactive: "danger" };

const BADGE_BASE =
  "inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

const toneOf = (value) => TONES[STATUS_TONES[value]] ?? TONES.neutral;

/* ------------------------------ NORMALIZE ------------------------------ */

const toListRow = (item, srNo) => ({
  ...item,
  id: item.eM_employer_id,
  companyName: item.eM_organization_name ?? "",
  employerId: item.eM_request_no ?? "",
  email: item.email ?? "",
  mobile: item.mobile ?? "",
  city: item.cityName ?? "",
  state: item.stateName ?? "",
  industry: item.instituteTypeName ?? "",
  jobCount: item.jobCount ?? 0,
  status: item.eM_is_active ? "Active" : "Inactive",
  srNo,
});

const parseListResponse = (response, pageSize) => {
  const inner = response?.data?.data;

  if (Array.isArray(inner)) {
    return { list: inner, totalRecords: inner.length };
  }

  const list = inner?.data ?? [];
  return {
    list,
    totalRecords: inner?.totalRecords ?? list.length,
  };
};

/* ------------------------------ COMPONENT ------------------------------ */

const EmployerList = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const [query, setQuery] = useState({ search: "", status: "All" });

  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useStatusToast();

  /* --------------------------- FETCH --------------------------- */

  const fetchPage = useCallback(async (pageNo, size) => {
    const response = await employerApi.getAll({ pageNo, pageSize: size });
    const { list, totalRecords: total } = parseListResponse(response, size);
    return {
      rows: list.map((item, index) =>
        toListRow(item, (pageNo - 1) * size + index + 1),
      ),
      total,
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { rows: nextRows, total } = await fetchPage(page, pageSize);
      setRows(nextRows);
      setTotalRecords(total);
    } catch (err) {
      setRows([]);
      setTotalRecords(0);
      setError(getApiErrorMessage(err) || "Unable to load employer records.");
    } finally {
      setLoading(false);
    }
  }, [fetchPage, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  /* --------------------------- REFRESH (silent) --------------------------- */

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError("");
    setQuery({ search: "", status: "All" });
    setPage(1);
    try {
      const { rows: nextRows, total } = await fetchPage(1, pageSize);
      setRows(nextRows);
      setTotalRecords(total);
    } catch (err) {
      setRows([]);
      setTotalRecords(0);
      setError(getApiErrorMessage(err) || "Unable to load employer records.");
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage, pageSize, refreshing]);

  /* --------------------------- STATS --------------------------- */

  const stats = useMemo(
    () => [
      {
        title: "Total employers",
        value: totalRecords,
        note: "All time",
        icon: Building2,
        color: "#0ea5e9",
        color2: "#38bdf8",
        from: "#0ea5e9",
        to: "#2563eb",
      },
      {
        title: "Active employers",
        value: rows.filter((u) => u.status === "Active").length,
        note: "Can post jobs",
        icon: Building,
        color: "#6366f1",
        color2: "#8b5cf6",
        from: "#6366f1",
        to: "#8b5cf6",
      },
      {
        title: "Inactive employers",
        value: rows.filter((u) => u.status !== "Active").length,
        note: "Access suspended",
        icon: ShieldAlert,
        color: "#10b981",
        color2: "#34d399",
        from: "#10b981",
        to: "#059669",
      },
      {
        title: "With Active Jobs",
        value: rows.filter((u) => Number(u.jobCount) > 0).length,
        note: "Posting jobs",
        icon: BriefcaseBusiness,
        color: "#f59e0b",
        color2: "#fb923c",
        from: "#f59e0b",
        to: "#ef4444",
      },
    ],
    [rows, totalRecords],
  );

  /* ------------------------- TOGGLE STATUS ------------------------- */

  const handleToggle = async (row, isActive) => {
    if (row.id == null) throw new Error("Employer ID is missing.");
    await employerApi.toggleActive(row.id, isActive);
    const { rows: nextRows, total } = await fetchPage(page, pageSize);
    setRows(nextRows);
    setTotalRecords(total);
  };

  /* ---------------------------- FILTERED ROWS ---------------------------- */

  const filteredRows = useMemo(() => {
    const q = query.search.trim().toLowerCase();
    return rows.filter((u) => {
      if (
        q &&
        ![
          "employerId",
          "companyName",
          "email",
          "mobile",
          "industry",
          "city",
          "state",
        ].some((k) =>
          String(u[k] ?? "")
            .toLowerCase()
            .includes(q),
        )
      )
        return false;
      if (query.status !== "All" && u.status !== query.status) return false;
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

  /* ---------------------------- STATUS TOGGLE ---------------------------- */

  const askToggle = (row) => {
    const next = row.status === "Active" ? "Inactive" : "Active";
    setConfirm({ row, next });
  };

  const confirmToggle = async () => {
    if (!confirm) return;
    const { row, next } = confirm;
    setBusy(true);
    try {
      await handleToggle(row, next === "Active");
      setToast({
        id: Date.now(),
        tone: next === "Active" ? "ok" : "warn",
        msg: `${row.companyName || "Employer"} is now ${next.toLowerCase()}`,
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

  /* ---------------------------- STYLES ---------------------------- */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";
  const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] disabled:cursor-not-allowed disabled:border-[#e2e8ee] disabled:text-[#b8c4d3] disabled:hover:bg-white disabled:hover:text-[#b8c4d3]`;
  const td =
    "border-t border-[#e2e8ee] px-2 py-2 text-[13px] text-slate-900 sm:px-3.5 sm:py-2.5 sm:text-[15px]";
  const btnPrimary =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#16834f] to-[#2fb877] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834f] focus-visible:ring-offset-2";
  const btnRefresh =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-2 py-2 text-left text-[12px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)] sm:px-4 sm:py-1.5 sm:text-[15px]";

  const stickyActionsHead =
    "sticky right-0 z-30 w-[90px] min-w-[90px] whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-1 py-2 text-center text-[12px] font-semibold tracking-wide text-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.35)] sm:px-2 sm:py-1.5 sm:text-[15px]";

  const stickyActionsCell =
    "sticky right-0 z-20 w-[90px] min-w-[90px] border-t border-[#e2e8ee] bg-white px-1 py-2 text-center text-[13px] text-slate-900 shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.18)] group-even:bg-[#f9fbfc] group-hover:bg-[#e8f1f6] sm:px-2 sm:py-2.5 sm:text-[15px]";

  /* ---------------------------- RENDER ---------------------------- */

  return (
    <div className="w-full min-w-0">
      <StatCardGrid items={stats} />

      <div className="mx-auto w-full min-w-0 max-w-[1400px] rounded-[14px] border border-[#e2e8ee] bg-white p-2.5 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:p-4 lg:px-5">
        {/* HEADER */}
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
            Employers
          </h1>

          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center md:w-auto">
            <div className="relative w-full sm:flex-1 md:w-[240px] md:flex-none">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
              />
              <input
                type="search"
                aria-label="Search employers..."
                placeholder="Search by company, email or mobile"
                value={query.search}
                onChange={(e) =>
                  setQuery((q) => ({ ...q, search: e.target.value }))
                }
                className="h-9 w-full rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] pl-9 pr-3 text-[13px] text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
              />
            </div>

            <div className="relative w-full sm:w-[180px] sm:flex-none">
              <select
                aria-label="Status"
                value={query.status}
                onChange={(e) =>
                  setQuery((q) => ({ ...q, status: e.target.value }))
                }
                className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] px-3 pr-9 text-[14px] font-medium text-[#34445a] outline-none transition hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
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

            <div className="flex w-full items-center gap-2.5 sm:w-auto">
              <button
                type="button"
                title="Refresh table"
                aria-label="Refresh table"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className={`${btnRefresh} flex-1 sm:flex-none`}
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

              <button
                type="button"
                title="Add"
                onClick={() => navigate("/admin/settings/master/employer/add")}
                className={`${btnPrimary} flex-1 sm:flex-none`}
              >
                <Plus
                  size={15}
                  strokeWidth={2.2}
                  className="transition-transform group-hover:scale-110"
                />
                <span className="inline">Add</span>
              </button>
            </div>
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
        <div className="common-scrollbar mt-4 h-[370px] w-full min-w-0 overflow-auto rounded-lg border border-[#cbe1f4]">
          <table
            className="w-full table-fixed border-collapse text-[13px] sm:text-[15px]"
            style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
          >
            <colgroup>
              {COLUMNS.map((c) => (
                <col key={c.key} style={{ width: c.width, minWidth: c.minWidth }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-30">
              <tr>
                <th scope="col" className={`${thClass} sticky top-0 z-30`}>Sr.No</th>
                <th scope="col" className={`${thClass} sticky top-0 z-30`}>Employer ID</th>
                <th scope="col" className={`${thClass} sticky top-0 z-30`}>Company Name</th>
                <th scope="col" className={`${thClass} sticky top-0 z-30`}>Industry</th>
                <th scope="col" className={`${thClass} sticky top-0 z-30`}>Status</th>
                <th scope="col" className={`${thClass} sticky top-0 z-30`}>Jobs Posted</th>
                <th scope="col" className={`${thClass} sticky top-0 z-30`}>Email</th>
                <th scope="col" className={`${thClass} sticky top-0 z-30`}>Mobile</th>
                <th scope="col" className={`${stickyActionsHead} sticky top-0`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COL_SPAN_ALL} className="px-4 py-12 text-center">
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
                    colSpan={COL_SPAN_ALL}
                    className="border-t border-[#e2e8ee] px-4 py-12 text-center"
                  >
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                      <Inbox size={22} />
                    </div>
                    <p className="mt-3 text-[14px] text-[#1e2b36] sm:text-[15px]">
                      No employers found
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
                    <td className={`${td} tabular-nums`}>{start + index + 1}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-slate-900">
                          {row.employerId || "-"}
                        </span>
                      </span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-slate-900">
                          {row.companyName || "-"}
                        </span>
                      </span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <span
                        title={row.industry}
                        className={`inline-flex h-7 max-w-[140px] items-center justify-center truncate rounded-md px-2 text-[12px] ring-1 ring-inset shadow-sm sm:text-[14px] ${
                          INDUSTRY_STYLE[row.industry] || INDUSTRY_STYLE.Other
                        }`}
                      >
                        <span className="truncate">{row.industry || "-"}</span>
                      </span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <span
                        className={`${BADGE_BASE} !h-6 !min-w-[80px] !px-2 !text-[12px] sm:!h-7 sm:!min-w-[96px] sm:!text-[14px] ${
                          toneOf(row.status).badge
                        }`}
                      >
                        {row.status || "-"}
                      </span>
                    </td>
                    <td className={`${td} whitespace-nowrap tabular-nums`}>
                      <strong className="font-semibold">{row.jobCount ?? 0}</strong>
                      <span className="text-[#6b7a88]"> jobs</span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {row.email ? (
                        <span
                          className="block truncate text-[12px] sm:text-[14px]"
                          title={row.email}
                        >
                          {row.email}
                        </span>
                      ) : (
                        <span className="text-[#9aa5b1]">-</span>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {row.mobile ? (
                        <span className="text-[12px] tabular-nums sm:text-[14px]">
                          {row.mobile}
                        </span>
                      ) : (
                        <span className="text-[#9aa5b1]">-</span>
                      )}
                    </td>
                    <td className={stickyActionsCell}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          title={`View ${row.companyName || "Employer"}`}
                          aria-label={`View ${row.companyName || "Employer"}`}
                          onClick={() => navigate(`/admin/employers/${row.id}`)}
                          className="grid h-6 w-6 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                        >
                          <ChevronsRight size={14} strokeWidth={2.2} />
                        </button>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={row.status === "Active"}
                          aria-label={
                            row.status === "Active"
                              ? `Deactivate ${row.companyName || "Employer"}`
                              : `Activate ${row.companyName || "Employer"}`
                          }
                          title={
                            row.status === "Active"
                              ? "Active. Click to deactivate"
                              : "Not active. Click to activate"
                          }
                          onClick={() => askToggle(row)}
                          className={`relative h-6 w-[38px] shrink-0 cursor-pointer rounded-full p-0.5 shadow-inner transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 sm:w-[42px] ${
                            row.status === "Active"
                              ? "bg-gradient-to-r from-[#16834f] to-[#2fc77e]"
                              : "bg-gradient-to-r from-[#c8323f] to-[#ed626b]"
                          }`}
                        >
                          <span
                            className={`grid h-5 w-5 place-items-center rounded-full bg-white shadow-md transition-transform duration-300 ${
                              row.status === "Active"
                                ? "translate-x-[14px] sm:translate-x-[18px]"
                                : "translate-x-0"
                            }`}
                          >
                            {row.status === "Active" ? (
                              <Building size={13} strokeWidth={2.7} className="text-emerald-700" />
                            ) : (
                              <Building2 size={13} strokeWidth={2.7} className="text-rose-700" />
                            )}
                          </span>
                        </button>
                      </div>
                    </td>
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

        {/* DIALOG */}
        {confirm && (
          <StatusModal
            isOpen
            type="confirm"
            title={`Change Status to ${confirm.next}?`}
            message={
              <>
                Are you sure you want to change the status of{" "}
                <strong className="font-semibold text-slate-900">
                  {getAdminStatusRecordLabel(confirm.row, ["companyName"])}
                </strong>{" "}
                to {confirm.next}?
              </>
            }
            showCancel
            busy={busy}
            confirmText={`Yes, Change to ${confirm.next}`}
            onCancel={() => setConfirm(null)}
            onConfirm={confirmToggle}
          />
        )}

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
    </div>
  );
};

export default EmployerList;