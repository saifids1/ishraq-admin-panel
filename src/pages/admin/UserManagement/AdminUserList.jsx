// src/pages/admin/users/AdminUserList.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Search as SearchIcon,
  Inbox,
  Plus,
  RefreshCw,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";
import StatusModal from "../../../components/common/StatusModal";
import { useStatusToast } from "../../../components/common/StatusModalProvider";
import {
  getUsers,
  updateUserStatus,
  getApiErrorMessage,
} from "../../../api/Services/userManagementService";
import { getAdminStatusRecordLabel } from "../../../utils/adminStatusConfirmation";

/* ------------------------------ CONSTANTS ------------------------------ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

const ADD_USER_ROUTE = "/admin/user/add";
const VIEW_USER_ROUTE = (id) => `/admin/user/view/${id}`;

const COLUMNS = [
  { key: "srNo", label: "Sr.No", width: 60 },
  { key: "adminId", label: "Admin ID", width: 150 },
  { key: "fullName", label: "Full Name", width: 180 },
  { key: "email", label: "Email", width: 220 },
  { key: "roles", label: "Roles", width: 240 },
  { key: "status", label: "Status", width: 120 },
  { key: "mobile", label: "Mobile", width: 130 },
  { key: "designation", label: "Designation", width: 160 },
  { key: "actions", label: "Actions", width: 110, sticky: true },
];

const TABLE_MIN_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);
const COL_SPAN_ALL = COLUMNS.length;

const TONES = {
  success: { badge: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20" },
  danger: { badge: "bg-rose-600 ring-rose-700 shadow-rose-600/20" },
  neutral: { badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20" },
};

const STATUS_TONES = { Active: "success", Inactive: "danger" };

const BADGE_BASE =
  "inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

const toneOf = (value) => TONES[STATUS_TONES[value]] ?? TONES.neutral;

const ROLE_LABELS = {
  JobseekerAdmin: "Jobseeker Admin",
  EmployerAdmin: "Employer Admin",
  JobRequirementAdmin: "Job Requirement Admin",
  JDByAdmin: "JD by Admin",
  CareerEnquiriesAdmin: "Career Enquiries Admin",
  ComplaintsGrievanceAdmin: "Complaints / Grievance Admin",
  ContactUsEnquiryAdmin: "Contact Us Enquiry Admin",
  FeedbackAdmin: "Feedback Admin",
  MasterDataAdmin: "Master Data Admin",
  ManageBlogAdmin: "Manage Blog Admin",
};

const roleLabel = (r) => ROLE_LABELS[r] ?? r;

/* ------------------------------ NORMALIZE ------------------------------ */

const toListRow = (item, srNo) => ({
  ...item,
  id: item.id,
  adminId: item.adminId ?? "",
  fullName: item.fullName ?? "",
  email: item.email ?? "",
  mobile: item.phoneNumber ?? "",
  designation: item.designation ?? "",
  roles: Array.isArray(item.roles) ? item.roles : [],
  status: item.isActive ? "Active" : "Inactive",
  srNo,
});

/* ------------------------------ COMPONENT ------------------------------ */

const AdminUserList = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [query, setQuery] = useState({ search: "", status: "All" });

  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useStatusToast();

  // Track which row's roles are expanded (by row id).
  const [expandedRoles, setExpandedRoles] = useState(() => new Set());

  const toggleRoles = (id) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* --------------------------- SCROLL SYNC REFS --------------------------- */

  const headerRef = useRef(null);
  const bodyRef = useRef(null);

  const handleBodyScroll = useCallback((e) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, []);

  /* --------------------------- FETCH --------------------------- */

  const fetchPage = useCallback(async (pageNo, size) => {
    const res = await getUsers({ pageNo, pageSize: size });
    const list = Array.isArray(res?.data) ? res.data : [];
    const total = res?.totalRecords ?? list.length;
    return {
      rows: list.map((item, index) =>
        toListRow(item, (pageNo - 1) * size + index + 1),
      ),
      total,
      pages: res?.totalPages ?? Math.max(1, Math.ceil(total / size)),
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { rows: nextRows, total, pages } = await fetchPage(page, pageSize);
      setRows(nextRows);
      setTotalRecords(total);
      setTotalPages(pages);
    } catch (err) {
      setRows([]);
      setTotalRecords(0);
      setTotalPages(0);
      setError(getApiErrorMessage(err) || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [fetchPage, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  /* --------------------------- REFRESH --------------------------- */

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError("");
    setQuery({ search: "", status: "All" });
    setPage(1);
    setExpandedRoles(new Set());
    try {
      const { rows: nextRows, total, pages } = await fetchPage(1, pageSize);
      setRows(nextRows);
      setTotalRecords(total);
      setTotalPages(pages);
    } catch (err) {
      setRows([]);
      setTotalRecords(0);
      setTotalPages(0);
      setError(getApiErrorMessage(err) || "Unable to load users.");
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage, pageSize, refreshing]);

  /* --------------------------- FILTER (current page) --------------------------- */

  const filteredRows = useMemo(() => {
    const q = query.search.trim().toLowerCase();
    return rows.filter((u) => {
      if (
        q &&
        !["adminId", "fullName", "email", "mobile", "designation"].some((k) =>
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

  /* --------------------------- PAGINATION --------------------------- */

  const currentPage = Math.min(page, Math.max(1, totalPages));
  const start = (currentPage - 1) * pageSize;

  const pageNumbers = useMemo(() => {
    const win = 5;
    let from = Math.max(1, currentPage - Math.floor(win / 2));
    const to = Math.min(totalPages, from + win - 1);
    from = Math.max(1, to - win + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, totalPages]);

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
      await updateUserStatus(row.id, next === "Active");
      const { rows: nextRows, total, pages } = await fetchPage(page, pageSize);
      setRows(nextRows);
      setTotalRecords(total);
      setTotalPages(pages);
      setToast({
        id: Date.now(),
        tone: next === "Active" ? "ok" : "warn",
        msg: `${row.fullName || "User"} is now ${next.toLowerCase()}`,
      });
    } catch (err) {
      setToast({
        id: Date.now(),
        tone: "err",
        msg: getApiErrorMessage(err) || "Could not update status",
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
  const btnPrimary =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#16834f] to-[#2fb877] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834f] focus-visible:ring-offset-2";
  const btnRefresh =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-2 py-2 text-left text-[12px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)] sm:px-4 sm:py-1.5 sm:text-[15px]";

  const stickyActionsHead =
    "sticky right-0 z-30 whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-1 py-2 text-center text-[12px] font-semibold tracking-wide text-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.35)] sm:px-2 sm:py-1.5 sm:text-[15px]";

  const stickyActionsCell =
    "sticky right-0 z-20 border-t border-[#e2e8ee] bg-white px-1 py-2 text-center text-[13px] text-slate-900 shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.18)] group-even:bg-[#f9fbfc] group-hover:bg-[#e8f1f6] sm:px-2 sm:py-2.5 sm:text-[15px]";

  const colgroup = (
    <colgroup>
      {COLUMNS.map((c) => (
        <col key={c.key} style={{ width: `${c.width}px` }} />
      ))}
    </colgroup>
  );

  /* --------------------------- ROLES CELL --------------------------- */

  // Renders the Roles cell. For 0 roles -> "-", 1 role -> plain text,
  // 2+ roles -> first role + "⋯" button that expands all roles in the same row.
  const RolesCell = ({ row }) => {
    const labels = row.roles.map(roleLabel);
    const expanded = expandedRoles.has(row.id);

    if (labels.length === 0) {
      return <span className="text-[#9aa5b1]">-</span>;
    }

    if (labels.length === 1) {
      return (
        <span className="block truncate text-[12px] sm:text-[14px]" title={labels[0]}>
          {labels[0]}
        </span>
      );
    }

    const [firstRole, ...rest] = labels;
    const total = labels.length;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          {!expanded && (
            <span
              className="block min-w-0 truncate text-[12px] sm:text-[14px]"
              title={labels.join(", ")}
            >
              {firstRole}
            </span>
          )}
          {expanded && (
            <span className="text-[12px] font-medium text-[#2c6b8a] sm:text-[14px]">
              All roles ({total})
            </span>
          )}

          <button
            type="button"
            onClick={() => toggleRoles(row.id)}
            aria-expanded={expanded}
            aria-label={
              expanded
                ? `Hide ${total} roles for ${row.fullName || "user"}`
                : `Show all ${total} roles for ${row.fullName || "user"}`
            }
            title={expanded ? "Hide roles" : `Show all ${total} roles`}
            className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-md border border-[#cbe1f4] bg-white px-1.5 py-0.5 text-[11px] font-semibold text-[#2c6b8a] shadow-sm transition hover:border-[#2c6b8a] hover:bg-[#e8f1f6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
          >
            {!expanded && (
              <>
                <MoreHorizontal size={12} strokeWidth={2.5} />
                <span>+{rest.length}</span>
              </>
            )}
            {expanded && <ChevronDown size={12} strokeWidth={2.5} />}
          </button>
        </div>

        {expanded && (
          <ul className="flex flex-col gap-0.5 border-t border-dashed border-[#cbe1f4] pt-1">
            {rest.map((role) => (
              <li
                key={role}
                className="truncate text-[11px] text-slate-700 sm:text-[13px]"
                title={role}
              >
                • {role}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  /* --------------------------- RENDER --------------------------- */

  return (
    <div className="w-full min-w-0">
      <div className="mx-auto w-full min-w-0 max-w-[1400px] rounded-[14px] border border-[#e2e8ee] bg-white p-2.5 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:p-4 lg:px-5">
        {/* HEADER */}
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
            Admin Users
          </h1>

          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center md:w-auto">
            <div className="relative w-full sm:flex-1 md:w-[240px] md:flex-none">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
              />
              <input
                type="search"
                aria-label="Search users"
                placeholder="Search by name, email or mobile"
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
                <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
              </button>

              <button
                type="button"
                title="Add user"
                onClick={() => navigate(ADD_USER_ROUTE)}
                className={`${btnPrimary} flex-1 sm:flex-none`}
              >
                <Plus
                  size={15}
                  strokeWidth={2.2}
                  className="transition-transform group-hover:scale-110"
                />
                <span>Add</span>
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
        <div className="mt-4 w-full min-w-0">
          <div
            ref={headerRef}
            className="overflow-hidden rounded-t-lg border border-b-0 border-[#cbe1f4]"
          >
            <table
              className="w-full table-fixed border-collapse text-[13px] sm:text-[15px]"
              style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
            >
              {colgroup}
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={c.sticky ? stickyActionsHead : thClass}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>

          <div
            ref={bodyRef}
            onScroll={handleBodyScroll}
            className="common-scrollbar h-[470px] w-full min-w-0 overflow-auto rounded-b-lg border border-[#cbe1f4] border-t-0"
          >
            <table
              className="w-full table-fixed border-collapse text-[13px] sm:text-[15px]"
              style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
            >
              {colgroup}
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
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COL_SPAN_ALL}
                      className="border-t border-[#e2e8ee] px-4 py-12 text-center"
                    >
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                        <Inbox size={22} />
                      </div>
                      <p className="mt-3 text-[14px] text-[#1e2b36] sm:text-[15px]">
                        No users found
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr
                      key={row.id ?? index}
                      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
                      className="js-row group transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                    >
                      <td className={`${td} tabular-nums align-top`}>{row.srNo}</td>

                      <td className={`${td} whitespace-nowrap align-top`}>
                        <span className="block truncate font-medium text-slate-900">
                          {row.adminId || "-"}
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap align-top`}>
                        <span className="block truncate font-medium text-slate-900">
                          {row.fullName || "-"}
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap align-top`}>
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

                      {/* ROLES — expandable */}
                      <td className={`${td} align-top`}>
                        <RolesCell row={row} />
                      </td>

                      <td className={`${td} whitespace-nowrap align-top`}>
                        <span
                          className={`${BADGE_BASE} !h-6 !min-w-[80px] !px-2 !text-[12px] sm:!h-7 sm:!min-w-[96px] sm:!text-[14px] ${
                            toneOf(row.status).badge
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className={`${td} whitespace-nowrap align-top`}>
                        {row.mobile ? (
                          <span className="text-[12px] tabular-nums sm:text-[14px]">
                            {row.mobile}
                          </span>
                        ) : (
                          <span className="text-[#9aa5b1]">-</span>
                        )}
                      </td>

                      <td className={`${td} whitespace-nowrap align-top`}>
                        <span
                          className="block truncate text-[12px] sm:text-[14px]"
                          title={row.designation}
                        >
                          {row.designation || "-"}
                        </span>
                      </td>

                      <td className={`${stickyActionsCell} align-top`}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title={`View ${row.fullName || "user"}`}
                            aria-label={`View ${row.fullName || "user"}`}
                            onClick={() => navigate(VIEW_USER_ROUTE(row.id))}
                            className="grid h-6 w-6 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                          >
                            <ChevronsRight size={13} strokeWidth={2.2} />
                          </button>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={row.status === "Active"}
                            aria-label={
                              row.status === "Active"
                                ? `Deactivate ${row.fullName || "user"}`
                                : `Activate ${row.fullName || "user"}`
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
                              <ChevronsRight
                                size={13}
                                strokeWidth={2.7}
                                className={
                                  row.status === "Active"
                                    ? "text-emerald-700"
                                    : "text-rose-700"
                                }
                              />
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
                {totalRecords ? start + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="font-semibold text-[#53677f]">
                {Math.min(start + pageSize, totalRecords)}
              </strong>{" "}
              of{" "}
              <strong className="font-semibold text-[#53677f]">
                {totalRecords}
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
                  setExpandedRoles(new Set());
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
              onClick={() => {
                setPage(currentPage - 1);
                setExpandedRoles(new Set());
              }}
              disabled={currentPage === 1}
              className={navBtn}
            >
              Previous
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setPage(n);
                  setExpandedRoles(new Set());
                }}
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
              onClick={() => {
                setPage(currentPage + 1);
                setExpandedRoles(new Set());
              }}
              disabled={currentPage === totalPages}
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
            message={
              <>
                Are you sure you want to change the status of{" "}
                <strong className="font-semibold text-slate-900">
                  {getAdminStatusRecordLabel(confirm.row, ["fullName"])}
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

export default AdminUserList;