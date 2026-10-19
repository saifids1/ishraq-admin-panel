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
  Clock3,
  Loader2,
  PauseCircle,
  CheckCircle2,
} from "lucide-react";
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
  return `${dd}-${mm}-${d.getFullYear()}`;
};

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
  "inline-flex h-7 w-[110px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

const STATUS_TONES = { Active: "success", Inactive: "danger" };
const toneOf = (v) => TONES[STATUS_TONES[v]] ?? TONES.neutral;

/* ---------- REQUEST STATUS (same palette as CareerEnquiryList) ---------- */

const REQUEST_STATUS_LABELS = {
  1: "In Progress",
  2: "On Hold",
  3: "Closed",
};

const REQUEST_STATUS_TONES = {
  new: { badge: "bg-sky-600 ring-sky-700 shadow-sky-600/20" },
  inprogress: { badge: "bg-indigo-600 ring-indigo-700 shadow-indigo-600/20" },
  hold: { badge: "bg-amber-500 ring-amber-600 shadow-amber-500/20" },
  closed: { badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20" },
};

const normalizeRequestStatus = (value) => {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (raw === "new") return "new";
  if (["inprogress", "inprocess", "processing", "ongoing"].includes(raw))
    return "inprogress";
  if (["hold", "onhold", "paused", "pending"].includes(raw)) return "hold";
  if (["closed", "close", "completed", "done", "resolved"].includes(raw))
    return "closed";
  return null;
};

const requestToneOf = (value) => {
  const key = normalizeRequestStatus(value);
  if (!key) return { badge: TONES.neutral.badge, key: null };
  return { ...REQUEST_STATUS_TONES[key], key };
};

const requestStatusOf = (item) => {
  const statusId =
    item?.statusId ??
    item?.CN_status_id ??
    item?.cN_status_id ??
    item?.enquiry_status_id;
  const statusName =
    item?.statusName ?? item?.status ?? item?.enquiry_status;
  if (statusName) return String(statusName);
  if (statusId != null && REQUEST_STATUS_LABELS[Number(statusId)])
    return REQUEST_STATUS_LABELS[Number(statusId)];
  return "-";
};

/* --------------------------- COLUMN DEFINITION --------------------------- */
/* Used for search only. */
const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "mobile", label: "Mobile" },
  { key: "subject", label: "Subject" },
  { key: "message", label: "Message" },
  { key: "createdAt", label: "Submitted", format: formatDate },
];

/* Visible table columns — matches CareerEnquiryList's shape.
   Order: Sr.No → Request ID → Name → Email → Mobile → Subject
          → Request Status → Status → Actions */
const TABLE_COLUMNS = [
  { key: "srNo",        label: "Sr.No",          width: "60px"  },
  { key: "requestId",   label: "Request ID",     width: "160px" },
  { key: "name",        label: "Name",           width: "200px" },
  { key: "email",       label: "Email",          width: "220px" },
  { key: "mobile",      label: "Mobile",         width: "130px" },
  { key: "subject",     label: "Subject",        width: "200px" },
  { key: "statusName",  label: "Request Status", width: "150px" },
  { key: "status",      label: "Status",         width: "140px" },
  { key: "actions",     label: "Actions",        width: "130px" },
];

const TABLE_COL_COUNT = TABLE_COLUMNS.length;

const cfg = {
  title: "Contact Enquiries",
  entityName: "Contact enquiry",
  idField: "CN_contact_enquiry_id",
  activeField: "CN_is_active",
  titleField: "CN_full_name",
  searchPlaceholder: "Search by name, email, mobile or subject",
  categoryField: null,
  detailPath: "/admin/contact",
  listColumns: [
    { key: "requestId", label: "Request ID" },
    { key: "CN_full_name", label: "Name" },
    { key: "CN_email", label: "Email" },
    { key: "CN_mobile", label: "Mobile" },
    { key: "UserTypeName", label: "You are" },
    { key: "CN_subject", label: "Subject" },
    { key: "CN_created_at", label: "Submitted", format: formatDate },
  ],
};

/* ------------------------------ NORMALIZE ------------------------------ */

const toListRow = (item, cfg, srNo) => ({
  ...item,
  requestId:
    item.cN_request_no ??
    item.CN_request_no ??
    item.cN_reference_no ??
    item.CN_reference_no,
  id: item.cN_contact_enquiry_id ?? item[cfg.idField],
  name: item.cN_full_name,
  email: item.cN_email,
  mobile: item.cN_mobile,
  subject: item.cN_subject,
  message: item.cN_message,
  createdAt: item.cN_created_at,
  userTypeName: item.userTypeName,
  status: item.cN_is_active ? "Active" : "Inactive",
  statusName: requestStatusOf(item),
  srNo,
});

/* ------------------------------ COMPONENT ------------------------------ */

const ContactEnquiryList = ({ formType = "contact" }) => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [query, setQuery] = useState({
    search: "",
    status: "All",
    category: "All",
  });

  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  /* --------------------------- FETCH --------------------------- */

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminEnquiryService.list(formType, page, pageSize);
      const list = result.data ?? [];
      setRows(
        list.map((item, i) =>
          toListRow(item, cfg, (page - 1) * pageSize + i + 1),
        ),
      );
    } catch (err) {
      setRows([]);
      setError(err?.message || "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }, [formType, cfg, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  /* --------------------------- CATEGORIES --------------------------- */

  const categories = useMemo(() => {
    if (!cfg.categoryField) return [];
    return [
      ...new Set(rows.map((r) => r[cfg.categoryField]).filter(Boolean)),
    ].sort();
  }, [rows, cfg]);

  /* --------------------------- FILTERED ROWS --------------------------- */

  const filteredRows = useMemo(() => {
    const q = query.search.trim().toLowerCase();
    return rows.filter((r) => {
      if (
        q &&
        !COLUMNS.some((c) =>
          String(r[c.key] ?? "")
            .toLowerCase()
            .includes(q),
        )
      )
        return false;
      if (query.status !== "All" && r.status !== query.status) return false;
      if (
        query.category !== "All" &&
        cfg.categoryField &&
        r[cfg.categoryField] !== query.category
      )
        return false;
      return true;
    });
  }, [rows, query, cfg]);

  const count = filteredRows.length;
  const totalPagesLocal = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.min(page, totalPagesLocal);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);

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

  /* --------------------------- STYLES --------------------------- */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";
  const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] disabled:cursor-not-allowed disabled:border-[#e2e8ee] disabled:text-[#b8c4d3] disabled:hover:bg-white disabled:hover:text-[#b8c4d3]`;
  const td =
    "border-t border-[#e2e8ee] px-3.5 py-2.5 text-[15px] text-slate-900";
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
                <option value="All">
                  {cfg.categoryLabel || "Category"}: All
                </option>
                {categories.map((o) => (
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
          <button
            type="button"
            onClick={load}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* TABLE */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[#cbe1f4]">
        <div
          className="common-scrollbar max-h-[55vh] overflow-auto"
          style={{ scrollbarGutter: "stable" }}
        >
          <table className="w-full min-w-[860px] table-fixed border-collapse text-[15px]">
            <colgroup>
              {TABLE_COLUMNS.map((c) => (
                <col key={c.key} style={{ width: c.width }} />
              ))}
            </colgroup>

            <thead className="sticky top-0 z-10">
              <tr>
                {TABLE_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={`${thClass} ${
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
                  <td colSpan={TABLE_COL_COUNT} className="px-4 py-12 text-center">
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
                    colSpan={TABLE_COL_COUNT}
                    className="border-t border-[#e2e8ee] px-4 py-12 text-center"
                  >
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                      <Inbox size={22} />
                    </div>
                    <p className="mt-3 text-[15px] text-[#1e2b36]">
                      No {cfg.entityName || "records"} yet
                    </p>
                  </td>
                </tr>
              ) : (
                pageRows.map((row, index) => {
                  const reqTone = requestToneOf(row.statusName);
                  return (
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
                        <div className="w-full min-w-0 truncate">
                          {row.requestId ?? "-"}
                        </div>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <div className="w-full min-w-0 truncate">
                          {row.name ?? "-"}
                        </div>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <div className="w-full min-w-0 truncate">
                          {row.email ?? "-"}
                        </div>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <div className="w-full min-w-0 truncate">
                          {row.mobile ?? "-"}
                        </div>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <div className="w-full min-w-0 truncate">
                          {row.subject ?? "-"}
                        </div>
                      </td>

                      {/* Request Status — plain badge, no icon */}
                      <td className={`${td} whitespace-nowrap text-center`}>
                        <div className="w-full min-w-0 truncate">
                          <span className={`${BADGE_BASE} ${reqTone.badge}`}>
                            {row.statusName || "-"}
                          </span>
                        </div>
                      </td>

                      {/* Status — Active / Inactive */}
                      <td className={`${td} whitespace-nowrap text-center`}>
                        <div className="w-full min-w-0 truncate">
                          <span
                            className={`${BADGE_BASE} ${toneOf(row.status).badge}`}
                          >
                            {row.status || "-"}
                          </span>
                        </div>
                      </td>

                      {/* Actions — sticky right */}
                      <td
                        className={`${td} sticky right-0 z-20 justify-center bg-white text-center group-hover:bg-[#e8f1f6]`}
                      >
                        <div className="flex items-center justify-center text-center gap-2">
                          <button
                            type="button"
                            title={`View ${row[cfg.titleField] || "Record"}`}
                            aria-label={`View ${row[cfg.titleField] || "Record"}`}
                            onClick={() =>
                              navigate(`${cfg.detailPath}/${row.id}`)
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
                                ? `Deactivate ${row[cfg.titleField] || "Record"}`
                                : `Activate ${row[cfg.titleField] || "Record"}`
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
                  );
                })
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

      {/* CONFIRM DIALOG */}
      {confirm &&
        (() => {
          const tone = toneOf(confirm.next);
          const { core, ring, Icon } = tone;
          return (
            <div className="fixed inset-0 z-50 grid place-items-center p-4">
              <div
                className="js-fade absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
                onClick={() => setConfirm(null)}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="list-dialog-title"
                className="js-pop relative w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl"
              >
                <div className={`h-1.5 w-full bg-gradient-to-r ${core}`} />
                <button
                  type="button"
                  onClick={() => setConfirm(null)}
                  aria-label="Close"
                  className="absolute right-3 top-4 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-[#9aa5b1] hover:bg-slate-100"
                >
                  <CloseIcon size={16} />
                </button>

                <div className="px-6 pb-5 pt-6 text-center">
                  <div className="relative mx-auto mb-4 grid h-16 w-16 place-items-center">
                    <span
                      className={`js-halo absolute inset-0 rounded-full ${ring}`}
                    />
                    <span
                      className={`relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${core} text-white shadow-lg`}
                    >
                      <Icon size={22} />
                    </span>
                  </div>
                  <h2
                    id="list-dialog-title"
                    className="text-[18px] font-bold text-[#1e2b36]"
                  >
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
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    disabled={busy}
                    className="h-10 flex-1 cursor-pointer rounded-[10px] border border-[#dce3eb] bg-white text-[13.5px] font-semibold text-[#34445a] hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    autoFocus
                    onClick={confirmToggle}
                    disabled={busy}
                    className={`h-10 flex-1 cursor-pointer rounded-[10px] bg-gradient-to-r ${core} text-[13.5px] font-semibold text-white shadow-md hover:brightness-105 active:scale-[0.98] disabled:opacity-60`}
                  >
                    {busy
                      ? "Saving..."
                      : `Yes, set ${confirm.next.toLowerCase()}`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

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
  );
};

export default ContactEnquiryList;