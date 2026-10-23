import StatusModal from "../../../../components/common/StatusModal";
import { useStatusToast } from "../../../../components/common/StatusModalProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
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
  Download,
  Check as CheckIcon,
  AlertTriangle as AlertIcon,
  X as XIcon,
  RefreshCw,
} from "lucide-react";
import { adminEnquiryService } from "../../../../api/Services/adminEnquiryService";
import { getCurrentUserId2 } from "../../../../utils/authUtils";

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

const readField = (item, key) => {
  if (!key) return undefined;
  return (
    item?.[key] ??
    item?.[key.charAt(0).toLowerCase() + key.slice(1)] ??
    item?.[key.charAt(0).toUpperCase() + key.slice(1)]
  );
};

/* ------------------------------ CONSTANTS ------------------------------ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const TABLE_MIN_WIDTH = 860;

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

/* ---------- REQUEST STATUS ---------- */

const REQUEST_STATUS_LABELS = {
  1: "In Progress",
  2: "On Hold",
  3: "Closed",
};

const REQUEST_STATUS_TONES = {
  new: { badge: "bg-sky-600 ring-sky-700 shadow-sky-600/20", icon: Clock3 },
  inprogress: {
    badge: "bg-indigo-600 ring-indigo-700 shadow-indigo-600/20",
    icon: Loader2,
  },
  hold: {
    badge: "bg-amber-500 ring-amber-600 shadow-amber-500/20",
    icon: PauseCircle,
  },
  closed: {
    badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20",
    icon: CheckCircle2,
  },
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
  if (!key) return { badge: TONES.neutral.badge, icon: ShieldAlert, key: null };
  return { ...REQUEST_STATUS_TONES[key], key };
};

const requestStatusOf = (item) => {
  const statusId =
    readField(item, "statusId") ??
    readField(item, "CE_status_id") ??
    readField(item, "cE_status_id") ??
    readField(item, "FB_status_id") ??
    readField(item, "enquiry_status_id");
  const statusName =
    readField(item, "statusName") ??
    readField(item, "FB_status_name") ??
    readField(item, "status") ??
    readField(item, "enquiry_status");
  if (statusName) return String(statusName);
  if (statusId != null && REQUEST_STATUS_LABELS[Number(statusId)])
    return REQUEST_STATUS_LABELS[Number(statusId)];
  return "-";
};

const requestStatusIdOf = (item) => {
  const knownStatusId =
    readField(item, "requestStatusId") ??
    readField(item, "statusId") ??
    readField(item, "FB_status_id") ??
    readField(item, "enquiry_status_id");
  if (knownStatusId != null) return knownStatusId;

  const statusIdEntry = Object.entries(item ?? {}).find(([key, value]) => {
    const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
    return (
      /^(?:[a-z]{2})?(?:request|enquiry)?statusid$/.test(normalizedKey) &&
      value != null &&
      String(value).trim() !== "" &&
      Number.isFinite(Number(value))
    );
  });
  return statusIdEntry?.[1];
};

/* --------------------------- COLUMN DEFINITION --------------------------- */

const TABLE_COLUMNS = [
  { key: "srNo", label: "Sr.No", width: "60px" },
  { key: "requestId", label: "Request ID", width: "170px" },
  { key: "name", label: "Name", width: "200px" },
  { key: "contact", label: "Contact", width: "180px" },
  { key: "userType", label: "User Type", width: "140px" },
  { key: "statusName", label: "Request Status", width: "150px" },
  // { key: "status", label: "Status", width: "140px" },
  { key: "rating", label: "Rating", width: "110px" },
  { key: "submittedAt", label: "Submitted", width: "130px" },
  { key: "actions", label: "Actions", width: "130px" },
];

const TABLE_COL_COUNT = TABLE_COLUMNS.length;

const cfg = {
  title: "Feedback",
  entityName: "Feedback",
  idField: "FB_feedback_id",
  activeField: "FB_is_active",
  titleField: "FB_name",
  searchPlaceholder: "Search by name, contact or comments",
  detailPath: "/admin/feedback",
  exportFileName: "ishraq-feedback",
};

const TOAST_ICON = {
  ok: { bg: "bg-emerald-500", Icon: CheckIcon },
  warn: { bg: "bg-amber-500", Icon: AlertIcon },
  err: { bg: "bg-rose-500", Icon: XIcon },
};

/* ------------------------------ NORMALIZE ------------------------------ */

const toListRow = (item, cfg, srNo) => {
  const activeValue = readField(item, cfg.activeField);
  const isActive = [true, 1, "1", "true", "True"].includes(activeValue);

  return {
    ...item,
    id: readField(item, cfg.idField),
    requestId:
      readField(item, "FB_request_no") ?? readField(item, "FB_reference_no"),
    name: readField(item, "FB_name"),
    contact: readField(item, "FB_contact"),
    userType:
      readField(item, "UserTypeName") ?? readField(item, "user_type_name"),
    rating: readField(item, "FB_rating"),
    submittedAt: readField(item, "FB_created_at"),
    status: isActive ? "Active" : "Inactive",
    statusName: requestStatusOf(item),
    srNo,
  };
};

/* ------------------------------ COMPONENT ------------------------------ */

const FeedbackList = ({ formType = "feedback" }) => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [query, setQuery] = useState({
    search: "",
  });

  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useStatusToast();

  /* refs for horizontal scroll sync */
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const statusPushedRef = useRef(new Set());
  const statusUpdateInProgressRef = useRef(new Set());

  /* --------------------------- FETCH --------------------------- */

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminEnquiryService.list(
        formType,
        page,
        pageSize,
        query.search.trim() || undefined,
      );
      const list = result.data ?? [];
      const total = result.totalRecords ?? list.length;
      const pages =
        result.totalPages ?? Math.max(1, Math.ceil(total / pageSize));

      setRows(
        list.map((item, i) =>
          toListRow(item, cfg, (page - 1) * pageSize + i + 1),
        ),
      );
      setTotalRecords(total);
      setTotalPages(pages);
    } catch (err) {
      setRows([]);
      setTotalRecords(0);
      setTotalPages(0);
      setError(err?.message || "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }, [formType, cfg, page, pageSize, query.search]);

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

  /* --------------------------- REFRESH (silent) --------------------------- */

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

  const handleView = useCallback(
    async (row) => {
      const enquiryId = row.id;
      if (Number(requestStatusIdOf(row)) === 1 && enquiryId != null) {
        if (statusUpdateInProgressRef.current.has(enquiryId)) return;
        if (statusPushedRef.current.has(enquiryId)) {
          navigate(`${cfg.detailPath}/${enquiryId}`);
          return;
        }

        const userId = Number(getCurrentUserId2());
        if (!Number.isInteger(userId) || userId <= 0) {
          setToast({
            id: Date.now(),
            tone: "err",
            msg: "Unable to identify the current user. Please sign in again.",
          });
          return;
        }

        statusUpdateInProgressRef.current.add(enquiryId);
        try {
          await adminEnquiryService.updateEnquiryStatus(formType, enquiryId, {
            statusId: 2,
            userId,
            changedAt: new Date().toISOString(),
          });
          statusPushedRef.current.add(enquiryId);
        } catch (err) {
          setToast({
            id: Date.now(),
            tone: "err",
            msg: err?.message || "Could not update enquiry status",
          });
          return;
        } finally {
          statusUpdateInProgressRef.current.delete(enquiryId);
        }
      }

      navigate(`${cfg.detailPath}/${enquiryId}`);
    },
    [formType, navigate, setToast],
  );

  /* --------------------------- SERVER-SIDE PAGINATION --------------------------- */

  const count = totalRecords;
  const totalPagesLocal = Math.max(1, totalPages);
  const currentPage = Math.min(page, totalPagesLocal);
  const start = (currentPage - 1) * pageSize;
  const searchText = query.search.trim().toLowerCase();
  const pageRows = searchText
    ? rows.filter((row) =>
        Object.values(row).some(
          (value) =>
            (typeof value === "string" || typeof value === "number") &&
            String(value).toLowerCase().includes(searchText),
        ),
      )
    : rows;

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

  const btnRefresh =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

  const btnExport =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#dce3eb] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:opacity-60 disabled:hover:translate-y-0";

  /* Sticky actions column — header + cells */
  const stickyActionsHead =
    "sticky right-0 z-30 whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-center text-[15px] font-semibold tracking-wide text-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.25)]";

  const stickyActionsCell =
    "sticky right-0 z-20 bg-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.15)] group-even:bg-[#f9fbfc] group-hover:bg-[#e8f1f6]";

  /* --------------------------- RENDER --------------------------- */

  return (
    <div className="mx-auto max-w-[1400px] rounded-[14px] border border-[#e2e8ee] bg-white p-4 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:px-5">
      {/* HEADER — only Search + Refresh + Export */}
      <div className="mb-2 flex flex-col items-start justify-between gap-3 xl:flex-row xl:items-center">
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
          {cfg.title}
        </h1>

        <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto">
          <div className="relative min-w-[320px] flex-1 xl:flex-none">
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

          {/* Refresh — silent */}
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
                            {row.contact ?? "-"}
                          </div>
                        </td>
                        <td className={`${td} whitespace-nowrap`}>
                          <div className="w-full min-w-0 truncate">
                            {row.userType ?? "-"}
                          </div>
                        </td>
                        <td className={`${td} whitespace-nowrap text-center`}>
                          <div className="w-full min-w-0 truncate">
                            {row.rating ?? "-"}
                          </div>
                        </td>
                        <td className={`${td} whitespace-nowrap text-center`}>
                          <div className="w-full min-w-0 truncate">
                            {formatDate(row.submittedAt)}
                          </div>
                        </td>

                        <td className={`${td} whitespace-nowrap text-center`}>
                          <div className="w-full min-w-0 truncate">
                            <span
                              className={`${BADGE_BASE} ${reqTone.badge} gap-1`}
                            >
                              {row.statusName || "-"}
                            </span>
                          </div>
                        </td>

                        {/* <td className={`${td} whitespace-nowrap text-center`}>
                          <div className="w-full min-w-0 truncate">
                            <span
                              className={`${BADGE_BASE} ${
                                toneOf(row.status).badge
                              }`}
                            >
                              {row.status || "-"}
                            </span>
                          </div>
                        </td> */}

                        <td
                          className={`${td} ${stickyActionsCell} text-center`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              title={`View ${
                                row[cfg.titleField] || "Record"
                              }`}
                              aria-label={`View ${
                                row[cfg.titleField] || "Record"
                              }`}
                              onClick={() => handleView(row)}
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
                                      row[cfg.titleField] || "Record"
                                    }`
                                  : `Activate ${
                                      row[cfg.titleField] || "Record"
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PAGINATION — server-side */}
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
      {confirm && (
        <StatusModal
          isOpen
          type="confirm"
          title={`Set status to ${confirm.next}?`}
          message={`Are you sure you want to set ${
            confirm.row[cfg.titleField] || "this record"
          } to ${confirm.next.toLowerCase()}?`}
          showCancel
          busy={busy}
          confirmText={`Yes, set ${confirm.next.toLowerCase()}`}
          onCancel={() => setConfirm(null)}
          onConfirm={confirmToggle}
        />
      )}

      {/* TOAST */}
      {toast &&
        (() => {
          const { bg, Icon } = TOAST_ICON[toast.tone] ?? TOAST_ICON.ok;
          return (
            <div
              key={toast.id}
              role="status"
              aria-live="polite"
              className="js-toast fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#1e2b36] px-4 py-3 text-[15px] font-medium text-white shadow-2xl"
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full ${bg}`}
              >
                <Icon size={12} strokeWidth={3} />
              </span>
              {toast.msg}
            </div>
          );
        })()}
    </div>
  );
};

export default FeedbackList;