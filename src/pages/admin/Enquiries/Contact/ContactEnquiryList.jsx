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
  Download,
} from "lucide-react";
import { ENQUIRY_CONFIGS } from "../../../../config/enquiryConfig";
import { adminEnquiryService } from "../../../../api/Services/adminEnquiryService";

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
  return `${dd}-${mm}-${yyyy(d)}`;
};
const yyyy = (d) => d.getFullYear();

/* ------------------------------ CONSTANTS ------------------------------ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

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

const STATUS_TONES = { Active: "success", Inactive: "danger" };
const toneOf = (v) => TONES[STATUS_TONES[v]] ?? TONES.neutral;

/* ------------------------------ NORMALIZE ------------------------------ */

const toListRow = (item, cfg, srNo) => ({
  ...item,
  id: item[cfg.idField],
  status: item[cfg.activeField] ? "Active" : "Inactive",
  srNo,
});

/* ------------------------------ COMPONENT ------------------------------ */

const ContactEnquiryList = ({ formType = "contact" }) => {
  const navigate = useNavigate();
  const cfg = ENQUIRY_CONFIGS[formType];

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [query, setQuery] = useState({ search: "", status: "All", category: "All" });

  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [exporting, setExporting] = useState(false);

  /* --------------------------- FETCH --------------------------- */

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminEnquiryService.list(formType, page, pageSize);
      const list = result.data ?? [];
      setRows(list.map((item, i) => toListRow(item, cfg, (page - 1) * pageSize + i + 1)));
      setTotalRecords(result.totalRecords ?? list.length);
      setTotalPages(result.totalPages ?? Math.max(1, Math.ceil((result.totalRecords ?? list.length) / pageSize)));
    } catch (err) {
      setRows([]);
      setTotalRecords(0);
      setTotalPages(0);
      setError(err?.message || "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }, [formType, cfg, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  /* --------------------------- CATEGORIES --------------------------- */

  const categories = useMemo(() => {
    if (!cfg.categoryField) return [];
    return [...new Set(rows.map((r) => r[cfg.categoryField]).filter(Boolean))].sort();
  }, [rows, cfg]);

  /* --------------------------- FILTERED ROWS --------------------------- */

  const filteredRows = useMemo(() => {
    const q = query.search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !cfg.listColumns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q))) return false;
      if (query.status !== "All" && r.status !== query.status) return false;
      if (query.category !== "All" && cfg.categoryField && r[cfg.categoryField] !== query.category) return false;
      return true;
    });
  }, [rows, query, cfg]);

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

  /* --------------------------- STATUS TOGGLE --------------------------- */

  const askToggle = (row) => {
    const next = row.status === "Active" ? "Inactive" : "Active";
    setConfirm({ row, next });
  };

  const confirmToggle = async () => {
    if (!confirm) return;
    const { row, next } = confirm;
    setBusy(true);
    try {
      await adminEnquiryService.setActive(formType, row.id, next === "Active");
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, [cfg.activeField]: next === "Active", status: next }
            : r,
        ),
      );
      setToast({
        id: Date.now(),
        tone: next === "Active" ? "ok" : "warn",
        msg: `${row[cfg.titleField] || "Record"} is now ${next.toLowerCase()}`,
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

  /* --------------------------- EXPORT --------------------------- */

  const handleExport = async () => {
    if (!cfg.exportFileName) return;
    setExporting(true);
    try {
      const toExportRow = (row, index) => ({
        "Sr.No": (page - 1) * pageSize + index + 1,
        ...Object.fromEntries(
          cfg.listColumns.map((c) => [
            c.label,
            c.format ? c.format(row[c.key], row) : row[c.key] ?? "",
          ]),
        ),
        Status: row.status,
      });

      // Lazy import so we don't force xlsx on every page load.
      const XLSX = await import("xlsx");
      const data = rows.map(toExportRow);
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, cfg.title || "Sheet1");
      XLSX.writeFile(wb, `${cfg.exportFileName}.xlsx`);
      setToast({ id: Date.now(), tone: "ok", msg: "Export ready" });
    } catch (err) {
      setToast({ id: Date.now(), tone: "err", msg: err?.message || "Export failed" });
    } finally {
      setExporting(false);
    }
  };

  /* --------------------------- STYLES --------------------------- */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";
  const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] disabled:cursor-not-allowed disabled:border-[#e2e8ee] disabled:text-[#b8c4d3] disabled:hover:bg-white disabled:hover:text-[#b8c4d3]`;
  const td = "border-t border-[#e2e8ee] px-3.5 py-2.5 text-[15px] text-slate-900";
  const btnPrimary =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#16834f] to-[#2fb877] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834f] focus-visible:ring-offset-2 disabled:opacity-60 disabled:hover:translate-y-0";
  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-left text-[15px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)]";

  /* --------------------------- RENDER --------------------------- */

  return (
    <div className="mx-auto max-w-[1400px] rounded-[14px] border border-[#e2e8ee] bg-white p-4 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:px-5">
      {/* HEADER */}
      <div className="mb-2 flex flex-col items-start justify-between gap-3 xl:flex-row xl:items-center">
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
          {cfg.title}
        </h1>

        <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto">
          <div className="relative min-w-[280px] flex-1 xl:flex-none">
            <SearchIcon
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
            />
            <input
              type="search"
              aria-label={cfg.searchPlaceholder || "Search..."}
              placeholder={cfg.searchPlaceholder || "Search..."}
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

          {cfg.categoryField && (
            <div className="relative min-w-[200px] flex-1 xl:flex-none">
              <select
                aria-label={cfg.categoryLabel || "Category"}
                value={query.category}
                onChange={(e) => patchFilter({ category: e.target.value })}
                className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] px-3 pr-9 text-[15px] font-medium text-[#34445a] outline-none transition hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
              >
                <option value="All">{cfg.categoryLabel || "Category"}: All</option>
                {categories.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
              />
            </div>
          )}

          {cfg.exportFileName && (
            <button
              type="button"
              title="Export"
              onClick={handleExport}
              disabled={exporting || loading}
              className="group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#dce3eb] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <Download size={15} strokeWidth={2.2} className="transition-transform group-hover:scale-110" />
              <span className="hidden sm:inline">{exporting ? "Exporting..." : "Export"}</span>
            </button>
          )}
        </div>
      </div>
      <div aria-hidden="true" className="my-3.5 h-px bg-gradient-to-r from-[#2c6b8a]/45 via-[#e2e8ee] to-transparent" />

      {/* ERROR */}
      {error && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* TABLE â€” sticky header, body-only scroll */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[#cbe1f4]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed border-collapse text-[15px]">
            <colgroup>
              <col style={{ width: "60px" }} />
              {cfg.listColumns.map((c) => (
                <col key={c.key} style={{ width: c.width || "auto" }} />
              ))}
              <col style={{ width: "130px" }} />
              <col style={{ width: "160px" }} />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr>
                <th scope="col" className={thClass}>Sr.No</th>
                {cfg.listColumns.map((c) => (
                  <th key={c.key} scope="col" className={thClass}>{c.label}</th>
                ))}
                <th scope="col" className={thClass}>Status</th>
                <th scope="col" className={thClass}>Actions</th>
              </tr>
            </thead>
          </table>
        </div>

        <div className="common-scrollbar max-h-[55vh] overflow-y-auto overflow-x-auto" style={{ scrollbarGutter: "stable" }}>
          <table className="w-full min-w-[860px] table-fixed border-collapse text-[15px]">
            <colgroup>
              <col style={{ width: "60px" }} />
              {cfg.listColumns.map((c) => (
                <col key={c.key} style={{ width: c.width || "auto" }} />
              ))}
              <col style={{ width: "130px" }} />
              <col style={{ width: "160px" }} />
            </colgroup>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={cfg.listColumns.length + 3} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <span aria-hidden="true" className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#e8f1f6] border-t-[#2c6b8a]" />
                      <p className="mt-3 text-[15px] text-[#6b7a88]">Loading...</p>
                    </div>
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={cfg.listColumns.length + 3} className="border-t border-[#e2e8ee] px-4 py-12 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                      <Inbox size={22} />
                    </div>
                    <p className="mt-3 text-[15px] text-[#1e2b36]">No {cfg.entityName || "records"} yet</p>
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

                    {cfg.listColumns.map((c) => {
                      const value = c.format ? c.format(row[c.key], row) : row[c.key];
                      return (
                        <td key={c.key} className={`${td} whitespace-nowrap`}>
                          <div className="w-full min-w-0 truncate">{value ?? "-"}</div>
                        </td>
                      );
                    })}

                    <td className={`${td} whitespace-nowrap`}>
                      <span className={`${BADGE_BASE} ${toneOf(row.status).badge}`}>
                        {row.status || "-"}
                      </span>
                    </td>

                    <td className={`${td} justify-center text-center`}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          title={`View ${row[cfg.titleField] || "Record"}`}
                          aria-label={`View ${row[cfg.titleField] || "Record"}`}
                          onClick={() => navigate(`${cfg.detailPath}/${row.id}`)}
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
                              ? `Deactivate ${row[cfg.titleField] || "Record"}`
                              : `Activate ${row[cfg.titleField] || "Record"}`
                          }
                          title={row.status === "Active" ? "Active. Click to deactivate" : "Not active. Click to activate"}
                          onClick={() => askToggle(row)}
                          className={`relative h-6 w-[42px] shrink-0 cursor-pointer rounded-full p-0.5 shadow-inner transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 ${
                            row.status === "Active"
                              ? "bg-gradient-to-r from-[#16834f] to-[#2fc77e]"
                              : "bg-gradient-to-r from-[#c8323f] to-[#ed626b]"
                          }`}
                        >
                          <span
                            className={`grid h-5 w-5 place-items-center rounded-full bg-white shadow-md transition-transform duration-300 ${
                              row.status === "Active" ? "translate-x-[18px]" : "translate-x-0"
                            }`}
                          >
                            {row.status === "Active" ? (
                              <UserRoundCheck size={13} strokeWidth={2.7} className="text-emerald-700" />
                            ) : (
                              <UserRoundX size={13} strokeWidth={2.7} className="text-rose-700" />
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
            <strong className="font-semibold text-[#53677f]">{count ? start + 1 : 0}</strong>{" "}
            to{" "}
            <strong className="font-semibold text-[#53677f]">{Math.min(start + pageSize, count)}</strong>{" "}
            of <strong className="font-semibold text-[#53677f]">{count}</strong> entries
          </span>
          <label className="flex items-center gap-1.5">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="h-8 cursor-pointer rounded-lg border border-[#dce3eb] bg-white px-2 text-[13px] text-[#34445a] hover:border-[#2c6b8a] focus:border-[#2c6b8a] focus:outline-none focus:ring-2 focus:ring-[#2c6b8a]/30"
            >
              {DEFAULT_PAGE_SIZES.map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
          </label>
        </div>

        <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className={navBtn}>Previous</button>
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
          <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPagesLocal} className={navBtn}>Next</button>
        </nav>
      </div>

      {/* CONFIRM DIALOG */}
      {confirm &&
        (() => {
          const tone = toneOf(confirm.next);
          const { core, ring, Icon } = tone;
          return (
            <div className="fixed inset-0 z-50 grid place-items-center p-4">
              <div className="js-fade absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={() => setConfirm(null)} aria-hidden="true" />
              <div role="dialog" aria-modal="true" aria-labelledby="list-dialog-title" className="js-pop relative w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className={`h-1.5 w-full bg-gradient-to-r ${core}`} />
                <button type="button" onClick={() => setConfirm(null)} aria-label="Close" className="absolute right-3 top-4 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-[#9aa5b1] hover:bg-slate-100">
                  <CloseIcon size={16} />
                </button>

                <div className="px-6 pb-5 pt-6 text-center">
                  <div className="relative mx-auto mb-4 grid h-16 w-16 place-items-center">
                    <span className={`js-halo absolute inset-0 rounded-full ${ring}`} />
                    <span className={`relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${core} text-white shadow-lg`}>
                      <Icon size={22} />
                    </span>
                  </div>
                  <h2 id="list-dialog-title" className="text-[18px] font-bold text-[#1e2b36]">
                    Set record to {confirm.next}?
                  </h2>
                  <p className="mx-auto mt-1.5 max-w-[320px] text-[13.5px] leading-relaxed text-[#6b7a88]">
                    This record will be marked as {confirm.next.toLowerCase()}.
                  </p>
                  <div className="mt-4 rounded-xl border border-[#e2e8ee] bg-[#f9fbfc] p-3 text-left">
                    <p className="truncate text-[14px] font-semibold text-[#1e2b36]">
                      {confirm.row[cfg.titleField] || "Record"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 border-t border-[#e2e8ee] bg-[#f9fbfc] px-6 py-3.5">
                  <button type="button" onClick={() => setConfirm(null)} disabled={busy} className="h-10 flex-1 cursor-pointer rounded-[10px] border border-[#dce3eb] bg-white text-[13.5px] font-semibold text-[#34445a] hover:bg-slate-50 disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="button" autoFocus onClick={confirmToggle} disabled={busy} className={`h-10 flex-1 cursor-pointer rounded-[10px] bg-gradient-to-r ${core} text-[13.5px] font-semibold text-white shadow-md hover:brightness-105 active:scale-[0.98] disabled:opacity-60`}>
                    {busy ? "Saving..." : `Yes, set ${confirm.next.toLowerCase()}`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* TOAST */}
      {toast && (
        <div key={toast.id} role="status" aria-live="polite" className="js-toast fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#1e2b36] px-4 py-3 text-[15px] font-medium text-white shadow-2xl">
          <span className={`grid h-5 w-5 place-items-center rounded-full ${toast.tone === "ok" ? "bg-emerald-500" : toast.tone === "warn" ? "bg-amber-500" : "bg-rose-500"}`}>
            âœ“
          </span>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default ContactEnquiryList;


