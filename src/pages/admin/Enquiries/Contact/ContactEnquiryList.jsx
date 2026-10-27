import StatusModal from "../../../../components/common/StatusModal";
import { useStatusToast } from "../../../../components/common/StatusModalProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  Inbox,
  ShieldCheck,
  ShieldAlert,
  ChevronsRight,
  Clock3,
  Loader2,
  PauseCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { adminEnquiryService } from "../../../../api/Services/adminEnquiryService";
import { getAdminStatusRecordLabel } from "../../../../utils/adminStatusConfirmation";
import formatAdminEnquiryDateTime from "../../../../utils/formatAdminEnquiryDateTime";
import { getCurrentUserId2 } from "../../../../utils/authUtils";

/* ------------------------------ CONSTANTS ------------------------------ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const TABLE_MIN_WIDTH = 1310;

const TONES = {
  success: { badge: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20" },
  danger: { badge: "bg-rose-600 ring-rose-700 shadow-rose-600/20" },
  warning: { badge: "bg-amber-500 ring-amber-600 shadow-amber-500/20" },
  neutral: { badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20" },
};

const BADGE_BASE =
  "inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

/* ---------- REQUEST STATUS ---------- */

const REQUEST_STATUS_LABELS = {
  1: "NEW",
  2: "OPEN",
  3: "IN-PROGRESS",
  4: "HOLD",
  5: "CLOSED",
};

const REQUEST_STATUS_TONES = {
  new: {
    badge: "bg-yellow-400 text-yellow-950 ring-yellow-500 shadow-yellow-400/50",
  },
  open: { badge: "bg-blue-600 ring-blue-700 shadow-blue-600/20" },
  inprogress: { badge: "bg-orange-500 ring-orange-600 shadow-orange-500/20" },
  hold: { badge: "bg-red-600 ring-red-700 shadow-red-600/20" },
  closed: { badge: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20" },
};

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

const requestStatusIdOf = (item) => {
  const knownStatusId =
    item?.requestStatusId ??
    item?.statusId ??
    item?.CN_status_id ??
    item?.cN_status_id ??
    item?.enquiry_status_id;
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

const isNewStatus = (item, statusName) => {
  const id = Number(requestStatusIdOf(item));
  if (Number.isFinite(id) && id === 1) return true;
  return normalizeRequestStatus(statusName) === "new";
};

/* --------------------------- COLUMN DEFINITION --------------------------- */

/* Used for search only. */
const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "mobile", label: "Mobile" },
  { key: "subject", label: "Subject" },
  { key: "message", label: "Message" },
  {
    key: "createdAt",
    label: "Submitted",
    format: formatAdminEnquiryDateTime,
  },
];

/* Visible table columns. */
const TABLE_COLUMNS = [
  { key: "srNo", label: "Sr.No", width: "55px", minWidth: "50px" },
  { key: "requestId", label: "Contact Enquiry ID", width: "190px", minWidth: "130px" },
    { key: "statusName", label: "Request Status", width: "150px", minWidth: "110px" },
  { key: "createdAt", label: "Submitted", width: "160px", minWidth: "120px" },
  { key: "name", label: "Name", width: "170px", minWidth: "140px" },
  { key: "email", label: "Email", width: "220px", minWidth: "160px" },
  { key: "mobile", label: "Mobile", width: "130px", minWidth: "100px" },
  { key: "subject", label: "Subject", width: "200px", minWidth: "150px" },

  { key: "actions", label: "Actions", width: "70px", minWidth: "30px", sticky: true },
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
    { key: "requestId", label: "Contact Enquiry ID" },
    { key: "CN_full_name", label: "Name" },
    { key: "CN_email", label: "Email" },
    { key: "CN_mobile", label: "Mobile" },
    { key: "UserTypeName", label: "You are" },
    { key: "CN_subject", label: "Subject" },
    {
      key: "CN_created_at",
      label: "Submitted",
      format: formatAdminEnquiryDateTime,
    },
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
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [query, setQuery] = useState({
    search: "",
    status: "All",
    category: "All",
  });

  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useStatusToast();

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
        query.search,
      );
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
  }, [formType, page, pageSize, query.search]);

  useEffect(() => {
    load();
  }, [load]);

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
          setRows((prev) =>
            prev.map((r) =>
              r.id === enquiryId
                ? { ...r, statusId: 2, statusName: "OPEN" }
                : r,
            ),
          );
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

  /* --------------------------- FILTERED + SORTED --------------------------- */

  const isRowNew = (row) =>
    isNewStatus(row, row.statusName) ||
    Number(requestStatusIdOf(row)) === 1;

  const sortedRows = useMemo(() => {
    const q = query.search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
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

    const newRows = filtered.filter((r) => isRowNew(r));
    const otherRows = filtered.filter((r) => !isRowNew(r));
    return [...newRows, ...otherRows];
  }, [rows, query]);

  /* --------------------------- CLIENT-SIDE PAGINATION --------------------------- */

  const count = sortedRows.length;
  const totalPagesLocal = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.min(page, totalPagesLocal);
  const start = (currentPage - 1) * pageSize;
  const pageRows = sortedRows.slice(start, start + pageSize);

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
    "border-t border-[#e2e8ee] px-2 py-2 text-[13px] text-slate-900 sm:px-3.5 sm:py-2.5 sm:text-[15px]";
  const btnRefresh =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-2 py-2 text-left text-[12px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)] sm:px-4 sm:py-1.5 sm:text-[15px]";
  const stickyActionsHead =
    "sticky right-0 z-30 w-[90px] min-w-[90px] whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-1 py-2 text-center text-[12px] font-semibold tracking-wide text-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.35)] sm:px-2 sm:py-1.5 sm:text-[15px]";
  const stickyActionsCell =
    "sticky right-0 z-20 w-[90px] min-w-[90px] border-t border-[#e2e8ee] bg-white px-1 py-2 text-center text-[13px] text-slate-900 shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.18)] group-even:bg-[#f9fbfc] group-hover:bg-[#e8f1f6] sm:px-2 sm:py-2.5 sm:text-[15px]";

  /* --------------------------- RENDER --------------------------- */

  return (
    <div className="w-full min-w-0">
      <div className="mx-auto w-full min-w-0 max-w-[1400px] rounded-[14px] border border-[#e2e8ee] bg-white p-2.5 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:p-4 lg:px-5">
        {/* HEADER */}
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
            {cfg.title}
          </h1>

          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center md:w-auto">
            <div className="relative w-full sm:flex-1 md:w-[240px] md:flex-none">
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
            </div>
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

        {/* TABLE — single scroll container, sticky thead, sticky actions col */}
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
                    className={`${
                      c.key === "actions" ? stickyActionsHead : thClass
                    } sticky top-0`}
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
                      No {cfg.entityName || "records"} yet
                    </p>
                  </td>
                </tr>
              ) : (
                pageRows.map((row, index) => {
                  const reqTone = requestToneOf(row.statusName);
                  const rowIsNew = isRowNew(row);
                  return (
                    <tr
                      key={row.id ?? index}
                      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
                      className={`js-row group transition-colors ${
                        rowIsNew
                          ? "js-row-new bg-yellow-100/70 hover:bg-yellow-100"
                          : "even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                      }`}
                    >
                      <td className={`${td} tabular-nums`}>{start + index + 1}</td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-slate-900">
                            {row.requestId ?? "-"}
                          </span>
                        </span>
                      </td>
                        <td className={`${td} whitespace-nowrap`}>
                        <span
                          className={`${BADGE_BASE} !h-6 !min-w-[80px] !px-2 !text-[12px] sm:!h-7 sm:!min-w-[96px] sm:!text-[14px] ${reqTone.badge} ${
                            rowIsNew ? "js-badge-new" : ""
                          }`}
                        >
                          {row.statusName || "-"}
                        </span>
                      </td>
                      
                      <td className={`${td} whitespace-nowrap tabular-nums`}>
                        <span className="text-[12px] sm:text-[14px]">
                          {formatAdminEnquiryDateTime(row.createdAt)}
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-slate-900">
                            {row.name ?? "-"}
                          </span>
                        </span>
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

                      <td className={`${td} whitespace-nowrap`}>
                        <span className="block truncate text-[12px] sm:text-[14px]">
                          {row.subject ?? "-"}
                        </span>
                      </td>

                    


                      <td className={stickyActionsCell}>
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            title={`View ${row[cfg.titleField] || "Record"}`}
                            aria-label={`View ${row[cfg.titleField] || "Record"}`}
                            onClick={() => handleView(row)}
                            className="grid h-6 w-6 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                          >
                            <ChevronsRight size={14} strokeWidth={2.2} />
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

        {/* PAGINATION — client-side */}
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

        {/* CONFIRM DIALOG */}
        {confirm && (
          <StatusModal
            isOpen
            type="confirm"
            title={`Change Status to ${confirm.next}?`}
            message={`Are you sure you want to change the status of ${getAdminStatusRecordLabel(
              confirm.row,
              [cfg.titleField],
            )} to ${confirm.next}?`}
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

export default ContactEnquiryList;