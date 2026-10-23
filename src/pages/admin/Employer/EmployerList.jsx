import StatusModal from "../../../components/common/StatusModal";
import { useStatusToast } from "../../../components/common/StatusModalProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Search as SearchIcon,
  X as CloseIcon,
  Inbox,
  ShieldCheck,
  ShieldAlert,
  UserRoundCheck,
  UserRoundX,
  ChevronsRight,
  Plus,
  Building2,
  BadgeCheck,
  Briefcase,
  RefreshCw,
} from "lucide-react";
import { StatCardGrid } from "../../../components/common/Dashboardkit";
import employerApi from "../../../api/Services/adminemployeelistApi";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

/* ------------------------------ HELPERS ------------------------------ */

const ORG_TYPE_STYLE = {
  Hospital: "bg-sky-600 text-white ring-sky-700",
  Hospitals: "bg-sky-600 text-white ring-sky-700",
  "Diagnostic Lab": "bg-teal-600 text-white ring-teal-700",
  "Home Care": "bg-amber-500 text-white ring-amber-600",
  "Nursing Home": "bg-indigo-600 text-white ring-indigo-700",
  Pharmacy: "bg-violet-600 text-white ring-violet-700",
};

/* ------------------------------ CONSTANTS ------------------------------ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const TABLE_MIN_WIDTH = 1450;

const COLUMNS = [
  { key: "srNo", width: "60px" },
  { key: "companyName", width: "230px" },
  { key: "contactPerson", width: "200px" },
  { key: "orgType", width: "170px" },
  { key: "status", width: "130px" },
  { key: "jobs", width: "130px" },
  { key: "email", width: "220px" },
  { key: "mobile", width: "150px" },
  { key: "actions", width: "160px" },
];

/* ------------------------------ TONES ----------------------------- */

const TONES = {
  success: {
    badge: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20",
    core: "from-[#16834f] to-[#2fc77e]",
    ring: "bg-emerald-100",
    Icon: ShieldCheck,
  },
  danger: {
    badge: "bg-rose-600 ring-rose-700 shadow-rose-600/20",
    core: "from-[#c8323f] to-[#ed626b]",
    ring: "bg-rose-100",
    Icon: ShieldAlert,
  },
  warning: {
    badge: "bg-amber-500 ring-amber-600 shadow-amber-500/20",
    core: "from-[#d97706] to-[#fbbf24]",
    ring: "bg-amber-100",
    Icon: ShieldAlert,
  },
  neutral: {
    badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20",
    core: "from-[#64748b] to-[#94a3b8]",
    ring: "bg-slate-100",
    Icon: ShieldAlert,
  },
};

const BADGE_BASE =
  "inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

const STATUS_TONES = {
  Active: "success",
  Inactive: "danger",
};

const toneOf = (value) => TONES[STATUS_TONES[value]] ?? TONES.neutral;

/* ------------------------------ NORMALIZE ------------------------------ */

const toListRow = (item, srNo) => ({
  ...item,
  id: item["eM_employer_id"],
  companyName: item["eM_organization_name"],
  contactPerson: item["eM_contact_person"],
  designation: item["eM_designation"],
  email: item["email"],
  mobile: item["mobile"],
  city: item["cityName"],
  state: item["stateName"],
  country: item["countryName"],
  orgType: item["instituteTypeName"],
  registrationNumber: item["eM_request_no"],
  status: item["eM_is_active"] ? "Active" : "Inactive",
  verified: item["eM_consent_given"] ?? false,
  jobs: [],
  createdAt: item["eM_created_at"],
  updatedAt: item["eM_updated_at"],
  srNo,
});

const parseListResponse = (response, pageSize) => {
  const inner = response?.data?.data;

  if (Array.isArray(inner)) {
    return {
      list: inner,
      totalRecords: inner.length,
      totalPages: Math.max(1, Math.ceil(inner.length / pageSize)),
    };
  }

  const list = inner?.data ?? [];
  const totalRecords = inner?.totalRecords ?? list.length;
  const totalPages =
    inner?.totalPages ?? Math.max(1, Math.ceil(totalRecords / pageSize));

  return { list, totalRecords, totalPages };
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
  const [totalPages, setTotalPages] = useState(0);

  const [query, setQuery] = useState({
    search: "",
    status: "All",
  });

  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useStatusToast();

  /* refs for horizontal scroll sync */
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);

  /* --------------------------- FETCH --------------------------- */

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await employerApi.getAll({ pageNo: page, pageSize });
      const { list, totalRecords: total, totalPages: pages } =
        parseListResponse(response, pageSize);

      setRows(
        list.map((item, index) =>
          toListRow(item, (page - 1) * pageSize + index + 1),
        ),
      );
      setTotalRecords(total);
      setTotalPages(pages);
    } catch (err) {
      setRows([]);
      setTotalRecords(0);
      setTotalPages(0);
      setError(getApiErrorMessage(err) || "Unable to load employer records.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

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

  /* --------------------------- REFRESH --------------------------- */

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
    } catch (err) {
      setToast({
        id: Date.now(),
        tone: "err",
        msg: err?.message || "Could not refresh",
      });
    } finally {
      setRefreshing(false);
    }
  }, [load, refreshing, setToast]);

  /* --------------------------- STATS --------------------------- */

  const stats = useMemo(() => {
    const allJobs = rows.flatMap((e) => e.jobs ?? []);
    return [
      {
        title: "Total employers",
        value: totalRecords,
        note: "All time",
        icon: Building2,
        color: "#6366f1",
        color2: "#8b5cf6",
        from: "#6366f1",
        to: "#8b5cf6",
      },
      {
        title: "Active employers",
        value: rows.filter((e) => e.status === "Active").length,
        note: "Can log in and post jobs",
        icon: BadgeCheck,
        color: "#10b981",
        color2: "#34d399",
        from: "#10b981",
        to: "#059669",
      },
      {
        title: "Verified",
        value: rows.filter((e) => e.verified).length,
        note: "Registration checked",
        icon: ShieldCheck,
        color: "#0ea5e9",
        color2: "#38bdf8",
        from: "#0ea5e9",
        to: "#2563eb",
      },
      {
        title: "Open jobs",
        value: allJobs.filter((j) => j.status === "Open").length,
        note: `Across ${allJobs.length} postings`,
        icon: Briefcase,
        color: "#f59e0b",
        color2: "#fb923c",
        from: "#f59e0b",
        to: "#ef4444",
      },
    ];
  }, [rows, totalRecords]);

  /* ------------------------- TOGGLE STATUS ------------------------- */

  const handleToggle = async (row, isActive) => {
    try {
      await employerApi.toggleActive(row.id, isActive);

      const response = await employerApi.getAll({ pageNo: page, pageSize });
      const { list, totalRecords: total, totalPages: pages } =
        parseListResponse(response, pageSize);

      setRows(
        list.map((item, index) =>
          toListRow(item, (page - 1) * pageSize + index + 1),
        ),
      );
      setTotalRecords(total);
      setTotalPages(pages);
    } catch (err) {
      const status = err?.status ?? err?.response?.status;
      if (status === 405) {
        console.error(
          "[EmployerList] 405 Method Not Allowed — the endpoint /api/Employer/{id}/active-status did not accept the HTTP verb.",
          "Response Allow header:",
          err?.response?.headers?.allow,
        );
      }
      setError(getApiErrorMessage(err) || "Unable to update status.");
      throw err;
    }
  };

  /* ---------------------------- QUERY HELPERS ---------------------------- */

  const patchFilter = (patch) => setQuery((q) => ({ ...q, ...patch }));

  /* ---------------------------- FILTERED ROWS ---------------------------- */

  const filteredRows = useMemo(() => {
    const q = query.search.trim().toLowerCase();
    return rows.filter((e) => {
      if (
        q &&
        ![
          "companyName",
          "contactPerson",
          "email",
          "mobile",
          "city",
          "state",
          "orgType",
        ].some((k) => String(e[k] ?? "").toLowerCase().includes(q))
      )
        return false;
      if (query.status !== "All" && e.status !== query.status) return false;
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

  /* ---------------------------- TOAST ---------------------------- */

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

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
    "border-t border-[#e2e8ee] px-3.5 py-2.5 text-[15px] text-slate-900";
  const btnPrimary =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#16834f] to-[#2fb877] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834f] focus-visible:ring-offset-2";
  const btnRefresh =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-left text-[15px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)]";

  /* Sticky actions column — header + cells */
  const stickyActionsHead =
    "sticky right-0 z-30 whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-center text-[15px] font-semibold tracking-wide text-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.25)]";

  const stickyActionsCell =
    "sticky right-0 z-20 bg-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.15)] group-even:bg-[#f9fbfc] group-hover:bg-[#e8f1f6]";

  /* ---------------------------- RENDER ---------------------------- */

  return (
    <div>
      <StatCardGrid items={stats} />

      <div className="mx-auto max-w-[1400px] rounded-[14px] border border-[#e2e8ee] bg-white p-4 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:px-5">
        {/* HEADER */}
        <div className="mb-2 flex flex-col items-start justify-between gap-3 xl:flex-row xl:items-center">
          <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
            Employers
          </h1>

          <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto">
            <div className="relative min-w-[280px] flex-1 xl:flex-none">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
              />
              <input
                type="search"
                aria-label="Search employers..."
                placeholder="Search by organization, contact, email or city"
                value={query.search}
                onChange={(e) => patchFilter({ search: e.target.value })}
                className="h-9 w-full rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] pl-9 pr-3 text-[13px] text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
              />
            </div>

            <div className="relative min-w-[200px] flex-1 xl:flex-none">
              <select
                aria-label="Status"
                value={query.status}
                onChange={(e) => patchFilter({ status: e.target.value })}
                className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] px-3 pr-9 text-[15px] font-medium text-[#34445a] outline-none transition hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
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

            <button
              type="button"
              title="Refresh table"
              aria-label="Refresh table"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className={btnRefresh}
            >
              <RefreshCw
                size={15}
                strokeWidth={2.2}
                className={`transition-transform duration-500 ${
                  refreshing ? "animate-spin" : "group-hover:rotate-90"
                }`}
              />
              <span className="hidden sm:inline">
                {refreshing ? "Refreshing..." : "Refresh"}
              </span>
            </button>

            <button
              type="button"
              title="Add"
              onClick={() => navigate("/admin/settings/master/employer/add")}
              className={btnPrimary}
            >
              <Plus
                size={15}
                strokeWidth={2.2}
                className="transition-transform group-hover:scale-110"
              />
              <span className="hidden sm:inline">Add</span>
            </button>
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
            <button
              type="button"
              onClick={load}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/*
          TABLE LAYOUT
          - Outer wrapper: 370px fixed, rounded border
          - Header strip: fixed, no vertical scrollbar, horizontal-scroll
            synced from body via ref
          - Body: vertical scrollbar only here (scrollbarGutter reserves space)
          - Actions column: sticky right in BOTH header and body
        */}
        <div className="mt-4 h-[370px] overflow-hidden rounded-lg border border-[#cbe1f4]">
          <div className="flex h-full flex-col">
            {/* Header strip — fixed, no vertical scrollbar */}
            <div
              ref={headerScrollRef}
              className="shrink-0 overflow-hidden"
            >
              <table
                className="w-full table-fixed border-collapse text-[15px]"
                style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
              >
                <colgroup>
                  {COLUMNS.map((c) => (
                    <col key={c.key} style={{ width: c.width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col" className={thClass}>
                      Sr.No
                    </th>
                    <th scope="col" className={thClass}>
                      Organization Name
                    </th>
                    <th scope="col" className={thClass}>
                      Contact Person
                    </th>
                    <th scope="col" className={thClass}>
                      Organization Type
                    </th>
                    <th scope="col" className={thClass}>
                      Status
                    </th>
                    <th scope="col" className={thClass}>
                      Jobs
                    </th>
                    <th scope="col" className={thClass}>
                      Email
                    </th>
                    <th scope="col" className={thClass}>
                      Contact Number
                    </th>
                    <th scope="col" className={stickyActionsHead}>
                      Actions
                    </th>
                  </tr>
                </thead>
              </table>
            </div>

            {/* Body — vertical scrollbar lives here only */}
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
                  {COLUMNS.map((c) => (
                    <col key={c.key} style={{ width: c.width }} />
                  ))}
                </colgroup>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            aria-hidden="true"
                            className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#e8f1f6] border-t-[#2c6b8a]"
                          />
                          <p className="mt-3 text-[15px] text-[#6b7a88]">
                            Loading...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="border-t border-[#e2e8ee] px-4 py-12 text-center"
                      >
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                          <Inbox size={22} />
                        </div>
                        <p className="mt-3 text-[15px] text-[#1e2b36]">
                          No employers yet
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
                          {start + index + 1}
                        </td>

                        <td className={`${td} whitespace-nowrap`}>
                          <span className="flex flex-col min-w-0">
                            <span className="font-medium text-slate-900 truncate">
                              {row.companyName || "-"}
                            </span>
                            {[row.city, row.state].filter(Boolean).length >
                              0 && (
                              <span className="text-[12px] text-[#6b7a88] truncate">
                                {[row.city, row.state]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            )}
                          </span>
                        </td>

                        <td className={`${td} whitespace-nowrap`}>
                          <span className="flex flex-col min-w-0">
                            <span className="font-medium text-slate-900 truncate">
                              {row.contactPerson || "-"}
                            </span>
                            {row.designation && (
                              <span className="text-[12px] text-[#6b7a88] truncate">
                                {row.designation}
                              </span>
                            )}
                          </span>
                        </td>

                        <td className={`${td} whitespace-nowrap`}>
                          <span
                            title={row.orgType}
                            className={`inline-flex h-7 w-[140px] items-center justify-center rounded-md px-2.5 text-[15px] ring-1 ring-inset whitespace-nowrap shadow-sm ${
                              ORG_TYPE_STYLE[row.orgType] ||
                              "bg-gray-600 text-white ring-gray-700"
                            }`}
                          >
                            <span className="truncate">
                              {row.orgType || "-"}
                            </span>
                          </span>
                        </td>

                        <td className={`${td} whitespace-nowrap`}>
                          <div className="w-full min-w-0 truncate">
                            <span
                              className={`${BADGE_BASE} ${
                                toneOf(row.status).badge
                              }`}
                            >
                              {row.status || "-"}
                            </span>
                          </div>
                        </td>

                        <td className={`${td} whitespace-nowrap`}>
                          <span className="tabular-nums">
                            <strong className="font-semibold">
                              {
                                (row.jobs ?? []).filter(
                                  (j) => j.status === "Open",
                                ).length
                              }
                            </strong>
                            <span className="text-[#6b7a88]">
                              {" "}
                              open / {(row.jobs ?? []).length}
                            </span>
                          </span>
                        </td>

                        <td className={`${td} whitespace-nowrap`}>
                          {row.email ? (
                            <span
                              className="text-[15px] truncate block"
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
                            <span className="text-[15px] tabular-nums">
                              {row.mobile}
                            </span>
                          ) : (
                            <span className="text-[#9aa5b1]">-</span>
                          )}
                        </td>

                        <td
                          className={`${td} ${stickyActionsCell} text-center`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              title={`View ${
                                row.companyName || "Employer"
                              }`}
                              aria-label={`View ${
                                row.companyName || "Employer"
                              }`}
                              onClick={() =>
                                navigate(`/admin/Employers/${row.id}`)
                              }
                              className="grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                            >
                              <ChevronsRight size={14} strokeWidth={2.2} />
                            </button>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={row.status === "Active"}
                              aria-label={
                                row.status === "Active"
                                  ? `Deactivate ${
                                      row.companyName || "Employer"
                                    }`
                                  : `Activate ${
                                      row.companyName || "Employer"
                                    }`
                              }
                              title={
                                row.status === "Active"
                                  ? "Active. Click to deactivate"
                                  : "Not active. Click to activate"
                              }
                              onClick={() => askToggle(row)}
                              className={`relative h-6 w-[42px] shrink-0 cursor-pointer rounded-full p-0.5 shadow-inner transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 ${
                                row.status === "Active"
                                  ? "bg-gradient-to-r from-[#16834f] to-[#2fc77e]"
                                  : "bg-gradient-to-r from-[#c8323f] to-[#ed626b]"
                              }`}
                            >
                              <span
                                className={`grid h-5 w-5 place-items-center rounded-full bg-white shadow-md transition-transform duration-300 ${
                                  row.status === "Active"
                                    ? "translate-x-[18px]"
                                    : "translate-x-0"
                                }`}
                              >
                                {row.status === "Active" ? (
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
              <strong className="font-semibold text-[#53677f]">
                {count ? start + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="font-semibold text-[#53677f]">
                {Math.min(start + pageSize, count)}
              </strong>{" "}
              of{" "}
              <strong className="font-semibold text-[#53677f]">
                {count}
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

        {/* DIALOG */}
        {confirm && (
         <StatusModal
  isOpen
  type="confirm"
  title={`Set status to ${confirm.next}?`}
  message={
    <>
      Are you sure you want to set{" "}
      <strong className="font-semibold text-slate-900">
        {confirm.row.companyName ||
          confirm.row.name ||
          confirm.row.fullName ||
          confirm.row.organizationName ||
          "this record"}
      </strong>{" "}
      to {confirm.next.toLowerCase()}?
    </>
  }
  showCancel
  busy={busy}
  confirmText={`Yes, set ${confirm.next.toLowerCase()}`}
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
            className="js-toast fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#1e2b36] px-4 py-3 text-[15px] font-medium text-white shadow-2xl"
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