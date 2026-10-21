import StatusModal from "../../../../components/common/StatusModal";
import { useStatusToast } from "../../../../components/common/StatusModalProvider";
import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import jobRoleApi from "../../../../api/Services/jobRoleApi";
import { getApiErrorMessage } from "../../../../api/utils/apiHelpers";

/* ------------------------------ HELPERS ------------------------------ */

/**
 * Format any date value into dd-mm-yyyy.
 * Returns "-" for invalid / missing / .NET default values.
 */
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
  const yyyy = d.getFullYear();

  return `${dd}-${mm}-${yyyy}`;
};

/* ------------------------------ CONSTANTS ------------------------------ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

const LIST_COLUMNS = [
  { key: "jR_name",       label: "Job Role",   format: (v) => v ?? "-" },
  { key: "jR_created_at", label: "Created At", format: (v) => formatDate(v) },
  { key: "jR_updated_at", label: "Updated At", format: (v) => formatDate(v) },
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
  id: item["jR_job_role_id"],
  name: item["jR_name"],
  status: item["jR_is_active"] ? "Active" : "Inactive",
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

const JobRoleList = () => {
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
  const [toast, setToast] = useStatusToast();

  /* --------------------------- FETCH --------------------------- */

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await jobRoleApi.getAll({ pageNo: page, pageSize });
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
      setError(getApiErrorMessage(err) || "Unable to load job role records.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  /* ------------------------- TOGGLE STATUS ------------------------- */

  const handleToggle = async (row) => {
    try {
      await jobRoleApi.toggleActive(row.id);
      const response = await jobRoleApi.getAll({ pageNo: page, pageSize });
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
      setError(getApiErrorMessage(err) || "Unable to update status.");
    }
  };

  /* ---------------------------- QUERY HELPERS ---------------------------- */

  const patchFilter = (patch) => setQuery((q) => ({ ...q, ...patch }));

  /* ---------------------------- FILTERED ROWS ---------------------------- */

  const filteredRows = useMemo(() => {
    const q = query.search.trim().toLowerCase();
    return rows.filter((r) => {
      if (
        q &&
        !LIST_COLUMNS.some((c) =>
          String(r[c.key] ?? "").toLowerCase().includes(q),
        )
      )
        return false;
      if (query.status !== "All" && r.status !== query.status) return false;
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
      await handleToggle(row);
      setToast({
        id: Date.now(),
        tone: next === "Active" ? "ok" : "warn",
        msg: `${row["jR_name"] || "Job Role"} is now ${next.toLowerCase()}`,
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
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
          Job Roles
        </h1>

        <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto">
          <div className="relative min-w-[280px] flex-1 xl:flex-none">
            <SearchIcon
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
            />
            <input
              type="search"
              aria-label="Search job roles..."
              placeholder="Search job roles..."
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
            title="Add"
            onClick={() => navigate("/admin/settings/master/jobRole/add")}
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
          <button type="button" onClick={load} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* TABLE — header stays fixed; only body scrolls */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[#cbe1f4]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed border-collapse text-[15px]">
            <colgroup>
              <col style={{ width: "60px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "160px" }} />
            </colgroup>

            <thead className="sticky top-0 z-10">
              <tr>
                <th scope="col" className={thClass}>Sr.No</th>
                <th scope="col" className={thClass}>Job Role</th>
                <th scope="col" className={thClass}>Created At</th>
                <th scope="col" className={thClass}>Updated At</th>
                <th scope="col" className={thClass}>Status</th>
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
          <table className="w-full min-w-[860px] table-fixed border-collapse text-[15px]">
            <colgroup>
              <col style={{ width: "60px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "160px" }} />
            </colgroup>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
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
                  <td colSpan={6} className="border-t border-[#e2e8ee] px-4 py-12 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                      <Inbox size={22} />
                    </div>
                    <p className="mt-3 text-[15px] text-[#1e2b36]">
                      No job roles yet
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

                    {/* Job Role */}
                    <td className={`${td} whitespace-nowrap`}>
                      <div className="w-full min-w-0 truncate">
                        {row["jR_name"] ?? "-"}
                      </div>
                    </td>

                    {/* Created At */}
                    <td className={`${td} whitespace-nowrap`}>
                      <div className="w-full min-w-0 truncate">
                        {formatDate(row["jR_created_at"])}
                      </div>
                    </td>

                    {/* Updated At */}
                    <td className={`${td} whitespace-nowrap`}>
                      <div className="w-full min-w-0 truncate">
                        {formatDate(row["jR_updated_at"])}
                      </div>
                    </td>

                    {/* Status */}
                    <td className={`${td} whitespace-nowrap`}>
                      <div className="w-full min-w-0 truncate">
                        <span className={`${BADGE_BASE} ${toneOf(row.status).badge}`}>
                          {row.status || "-"}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className={`${td} justify-center text-center`}>
                      <div className="flex items-center justify-center text-center gap-2">
                        <button
                          type="button"
                          title={`View ${row["jR_name"] || "Job Role"}`}
                          aria-label={`View ${row["jR_name"] || "Job Role"}`}
                          onClick={() => navigate(`/admin/settings/master/jobRole/${row.id}/view` )}
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
                              ? `Deactivate ${row["jR_name"] || "Job Role"}`
                              : `Activate ${row["jR_name"] || "Job Role"}`
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

      {/* DIALOG */}
      {confirm && (
        <StatusModal
          isOpen
          type="confirm"
          title={`Set status to ${confirm.next}?`}
          message={`Are you sure you want to set ${confirm.row.name ?? confirm.row.fullName ?? confirm.row.organizationName ?? confirm.row.companyName ?? confirm.row.jobCategory ?? confirm.row["ctM_CityName"] ?? confirm.row["ctM_CountryName"] ?? "this record"} to ${confirm.next.toLowerCase()}?`}
          showCancel
          busy={busy}
          confirmText={`Yes, set ${confirm.next.toLowerCase()}`}
          onCancel={() => setConfirm(null)}
          onConfirm={confirmToggle}
        />
      )}

      {/* TOAST */}{/* TOAST */}
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
  );
};

export default JobRoleList;
