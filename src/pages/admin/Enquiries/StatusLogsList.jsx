import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Inbox, RefreshCw, History, ChevronsLeft } from "lucide-react";
import { adminEnquiryService } from "../../../api/Services/adminEnquiryService";

/* ------------------------------ HELPERS ------------------------------ */

const formatDateTime = (value) => {
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
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${dd}-${mm}-${yyyy}, ${timePart}`;
};

/* ------------------------------ CONSTANTS ------------------------------ */

const TABLE_MIN_WIDTH = 720;

const REQUEST_STATUS_LABELS = {
  1: "NEW",
  2: "OPEN",
  3: "IN-PROGRESS",
  4: "HOLD",
  5: "CLOSED",
};

const NEUTRAL_BADGE = "bg-slate-500 ring-slate-600 shadow-slate-500/20";

const REQUEST_STATUS_TONES = {
  new: {
    badge: "bg-yellow-400 text-yellow-950 ring-yellow-500 shadow-yellow-400/50",
  },
  open: { badge: "bg-blue-600 ring-blue-700 shadow-blue-600/20" },
  inprogress: { badge: "bg-orange-500 ring-orange-600 shadow-orange-500/20" },
  hold: { badge: "bg-red-600 ring-red-700 shadow-red-600/20" },
  closed: { badge: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20" },
};

const BADGE_BASE =
  "inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

const normalizeRequestStatus = (value) => {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (raw === "new") return "new";
  if (["open", "opened"].includes(raw)) return "open";
  if (["inprogress", "inprocess", "processing", "ongoing"].includes(raw))
    return "inprogress";
  if (["hold", "onhold", "paused", "pending"].includes(raw)) return "hold";
  if (["closed", "close", "completed", "done", "resolved"].includes(raw))
    return "closed";
  return null;
};

const requestToneOf = (value) => {
  const key = normalizeRequestStatus(value);
  if (!key) return { badge: NEUTRAL_BADGE };
  return { badge: REQUEST_STATUS_TONES[key].badge };
};

/* --------------------------- COLUMN DEFINITION --------------------------- */

const TABLE_COLUMNS = [
  { key: "srNo", label: "Sr.No", width: "55px", minWidth: "50px" },
  { key: "changedAt", label: "Changed At", width: "180px", minWidth: "140px" },
  { key: "fromStatus", label: "From Status", width: "150px", minWidth: "110px" },
  { key: "toStatus", label: "To Status", width: "150px", minWidth: "110px" },
  { key: "changedByName", label: "Changed By", width: "180px", minWidth: "140px" },
];

const TABLE_COL_COUNT = TABLE_COLUMNS.length;

const cfg = {
  title: "Status Logs",
  entityName: "Status log",
};

/* ------------------------------ NORMALIZE ------------------------------ */

const readField = (item, ...keys) => {
  for (const key of keys) {
    if (!key) continue;
    if (item?.[key] !== undefined && item?.[key] !== null) return item[key];
    const actualKey = Object.keys(item || {}).find(
      (k) => k.toLowerCase() === key.toLowerCase(),
    );
    if (actualKey) return item[actualKey];
  }
  return undefined;
};

const toLogRow = (item, srNo) => {
  const fromStatusId =
    readField(item, "fromStatusId", "previousStatusId", "oldStatusId") ?? null;
  const toStatusId =
    readField(item, "toStatusId", "newStatusId", "currentStatusId") ?? null;

  const fromStatusName =
    readField(item, "fromStatusName", "previousStatusName", "oldStatusName") ??
    (fromStatusId != null && REQUEST_STATUS_LABELS[Number(fromStatusId)]) ??
    "-";
  const toStatusName =
    readField(item, "toStatusName", "newStatusName", "currentStatusName") ??
    (toStatusId != null && REQUEST_STATUS_LABELS[Number(toStatusId)]) ??
    "-";

  return {
    ...item,
    id: readField(item, "logId", "statusLogId", "feedbackLogId", "id") ?? srNo,
    changedAt: readField(
      item,
      "changedAt",
      "createdAt",
      "statusChangedAt",
      "logCreatedAt",
    ),
    fromStatusName: String(fromStatusName || "-"),
    toStatusName: String(toStatusName || "-"),
    changedByName: readField(
      item,
      "changedByName",
      "updatedByName",
      "userName",
      "modifiedByName",
    ),
    srNo,
  };
};

/* ------------------------------ COMPONENT ------------------------------ */

const StatusLogsList = ({ formType = "feedback" }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  /* --------------------------- FETCH --------------------------- */

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const logs = await adminEnquiryService.getStatusLogs(formType, id);
      setRows(logs.map((item, index) => toLogRow(item, index + 1)));
    } catch (err) {
      setRows([]);
      setError(err?.message || "Unable to load status logs.");
    } finally {
      setLoading(false);
    }
  }, [formType, id]);

  useEffect(() => {
    load();
  }, [load]);

  /* --------------------------- REFRESH --------------------------- */

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load, refreshing]);

  /* --------------------------- STYLES --------------------------- */

  const td =
    "border-t border-[#e2e8ee] px-2 py-2 text-[13px] text-slate-900 sm:px-3.5 sm:py-2.5 sm:text-[15px]";

  const btnRefresh =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-2 py-2 text-left text-[12px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)] sm:px-4 sm:py-1.5 sm:text-[15px]";

  /* --------------------------- RENDER --------------------------- */

  return (
    <div className="w-full min-w-0">
      <div className="mx-auto w-full min-w-0 max-w-[1400px] rounded-[14px] border border-[#e2e8ee] bg-white p-2.5 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:p-4 lg:px-5">
        {/* HEADER */}
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              title="Back"
              aria-label="Back"
              className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f]"
            >
              <ChevronsLeft size={18} strokeWidth={2} />
            </button>

            <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <History size={20} className="shrink-0 text-[#2c6b8a] sm:hidden" />
              <History size={22} className="hidden shrink-0 text-[#2c6b8a] sm:block" />
              <h1 className="m-0 truncate text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
                {cfg.title}
              </h1>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center md:w-auto">
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
          </div>
        </div>

        <div
          aria-hidden="true"
          className="my-3.5 h-px bg-gradient-to-r from-[#2c6b8a]/45 via-[#e2e8ee] to-transparent"
        />

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

        {/* TABLE — single scroll container, sticky thead */}
        <div className="common-scrollbar mt-4 w-full min-w-0 overflow-auto rounded-lg border border-[#cbe1f4]">
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
                  <th key={c.key} scope="col" className={`${thClass} sticky top-0 z-30`}>
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
                      <p className="mt-3 text-[14px] text-[#6b7a88] sm:text-[15px]">
                        Loading...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={TABLE_COL_COUNT}
                    className="border-t border-[#e2e8ee] px-4 py-12 text-center"
                  >
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                      <Inbox size={22} />
                    </div>
                    <p className="mt-3 text-[14px] text-[#1e2b36] sm:text-[15px]">
                      No {cfg.entityName || "records"} yet
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const fromTone = requestToneOf(row.fromStatusName);
                  const toTone = requestToneOf(row.toStatusName);
                  return (
                    <tr
                      key={row.id ?? index}
                      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
                      className="js-row group transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                    >
                      <td className={`${td} tabular-nums`}>{index + 1}</td>

                      <td className={`${td} whitespace-nowrap tabular-nums`}>
                        <span className="text-[12px] sm:text-[14px]">
                          {formatDateTime(row.changedAt)}
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span
                          className={`${BADGE_BASE} !h-6 !min-w-[80px] !px-2 !text-[12px] sm:!h-7 sm:!min-w-[96px] sm:!text-[14px] ${fromTone.badge}`}
                        >
                          {row.fromStatusName || "-"}
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span
                          className={`${BADGE_BASE} !h-6 !min-w-[80px] !px-2 !text-[12px] sm:!h-7 sm:!min-w-[96px] sm:!text-[14px] ${toTone.badge}`}
                        >
                          {row.toStatusName || "-"}
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span className="block truncate text-[12px] sm:text-[14px]">
                          {row.changedByName ?? "-"}
                        </span>
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
  );
};

export default StatusLogsList;