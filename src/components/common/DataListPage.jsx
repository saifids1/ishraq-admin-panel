  import { useEffect, useMemo, useState } from "react";
  import { useLocation } from "react-router-dom";
  import { useStatusToast } from "./StatusModalProvider";
  import StatusModal from "./StatusModal";
  import * as XLSX from "xlsx";
  import {
    ChevronDown,
    ChevronUp,
    Search as SearchIcon,
    RotateCcw,
    Plus,
    Download,
    Pencil,
    X as CloseIcon,
    Check as CheckIcon,
    Inbox,
    ShieldCheck,
    ShieldAlert,
    UserRoundCheck,
    UserRoundX,
    ChevronsRight,
  } from "lucide-react";

  const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

  /* ------------------------------ TONES ----------------------------- */

  const TONES = {
    success: {
      badge: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20",
      core: "from-[#16834f] to-[#2fc77e]",
      ring: "bg-emerald-100",
      Icon: ShieldCheck,
      pulse: true,
    },
    danger: {
      badge: "bg-rose-600 ring-rose-700 shadow-rose-600/20",
      core: "from-[#c8323f] to-[#ed626b]",
      ring: "bg-rose-100",
      Icon: ShieldAlert,
      pulse: false,
    },
    warning: {
      badge: "bg-amber-500 ring-amber-600 shadow-amber-500/20",
      core: "from-[#d97706] to-[#fbbf24]",
      ring: "bg-amber-100",
      Icon: ShieldAlert,
      pulse: false,
    },
    neutral: {
      badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20",
      core: "from-[#64748b] to-[#94a3b8]",
      ring: "bg-slate-100",
      Icon: ShieldAlert,
      pulse: false,
    },
  };

  const BADGE_BASE =
    "inline-flex h-7 w-[96px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

  const toneOf = (statuses, value) =>
    TONES[statuses?.find((s) => s.value === value)?.tone] ?? TONES.neutral;

  /* ---------------------------- SMALL PARTS ------------------------- */

  export const StatusBadge = ({ value, statuses }) => {
    const tone = toneOf(statuses, value);
    return (
      <span className={`${BADGE_BASE} ${tone.badge}`}>
        {value || "-"}
      </span>
    );
  };

  /** Two lines in one cell: optional leading node (avatar/icon), primary + secondary text */
  export const TwoLineCell = ({ leading, primary, secondary }) => (
    <div className="flex items-center gap-2.5">
      {leading}
      <span className="flex flex-col">
        <span className="font-medium text-slate-900">{primary || "-"}</span>
        {secondary && (
          <span className="text-[12px] text-[#6b7a88]">{secondary}</span>
        )}
      </span>
    </div>
  );

  const ActionButton = ({ title, onClick, gradient, children }) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-gradient-to-br ${gradient} text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2`}
    >
      {children}
    </button>
  );

  const StatusSwitch = ({ label, active, onClick }) => (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? `Deactivate ${label}` : `Activate ${label}`}
      title={
        active ? "Active. Click to deactivate" : "Not active. Click to activate"
      }
      onClick={onClick}
      className={`relative h-6 w-[42px] shrink-0 cursor-pointer rounded-full p-0.5 shadow-inner transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 ${
        active
          ? "bg-gradient-to-r from-[#16834f] to-[#2fc77e]"
          : "bg-gradient-to-r from-[#c8323f] to-[#ed626b]"
      }`}
    >
      <span
        className={`grid h-5 w-5 place-items-center rounded-full bg-white shadow-md transition-transform duration-300 ${
          active ? "translate-x-[18px]" : "translate-x-0"
        }`}
      >
        {active ? (
          <UserRoundCheck
            size={13}
            strokeWidth={2.7}
            className="text-emerald-700"
          />
        ) : (
          <UserRoundX size={13} strokeWidth={2.7} className="text-rose-700" />
        )}
      </span>
    </button>
  );

  const Select = ({ label, value, onChange, options }) => (
    <div className="relative min-w-[200px] flex-1 xl:flex-none">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] px-3 pr-9 text-[15px] font-medium text-[#34445a] outline-none transition hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
      >
        <option value="All">{label}: All</option>
        {options.map((o) => (
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
  );

  /* ------------------------- CONFIRM DIALOG ------------------------- */

  const StatusConfirmDialog = ({
    label,
    next,
    tone,
    entityName,
    busy,
    onCancel,
    onConfirm,
  }) => {
    return (
      <StatusModal
        isOpen
        type="confirm"
        title={`Set ${entityName.toLowerCase()} to ${next}?`}
        message={`This ${entityName.toLowerCase()} will be marked as ${next.toLowerCase()}: ${label}`}
        showCancel
        busy={busy}
        confirmText={`Yes, set ${next.toLowerCase()}`}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
  };

  /* ------------------------------ COMPONENT ------------------------- */

  const DataListPage = ({
    title,
    rows = [],
    total,
    loading = false,
    hasStats = false,

    onQueryChange,

    searchPlaceholder = "Search",
    searchKeys,

    statusField = "status",
    statuses,
    activeValue = "Active",
    inactiveValue = "Inactive",
    statusColumnIndex = 2,

    categoryLabel = "Category",
    categoryField,
    categories,

    columns = [],
    rowTitle = (row) => row.name || row.title || row.id,
    entityName = "Record",

    onAdd,
    addLabel = "Add",
    exportConfig,

    onView,
    onEdit,
    onToggleStatus,

    pageSizes = DEFAULT_PAGE_SIZES,
  }) => {
    const location = useLocation();
    const serverMode = typeof onQueryChange === "function";
    const hasStatus = Array.isArray(statuses) && statuses.length > 0;
    const hasCategory = Array.isArray(categories) && categories.length > 0;
    const hasFilters = hasStatus || hasCategory;
    const hasActions = Boolean(onView || onEdit || onToggleStatus);

    const initialQuery = {
      search: "",
      status: "All",
      category: "All",
      sort: { key: null, dir: null },
      page: 1,
      pageSize: pageSizes[0],
    };

    const [query, setQuery] = useState(initialQuery);
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useStatusToast();

    useEffect(() => setQuery(initialQuery), [location.pathname, pageSizes]);

    /* query helpers */
    const patchFilter = (patch) => setQuery((q) => ({ ...q, page: 1, ...patch }));
    const setPage = (page) => setQuery((q) => ({ ...q, page }));
    const toggleSort = (key) =>
      setQuery((q) => ({
        ...q,
        page: 1,
        sort:
          q.sort.key !== key
            ? { key, dir: "asc" }
            : q.sort.dir === "asc"
              ? { key, dir: "desc" }
              : { key: null, dir: null },
      }));
    const resetFilters = () =>
      setQuery((q) => ({
        ...q,
        search: "",
        status: "All",
        category: "All",
        page: 1,
      }));

    const isFiltered =
      query.search.trim() !== "" ||
      query.status !== "All" ||
      query.category !== "All";

    useEffect(() => {
      if (serverMode) onQueryChange(query);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    /* local filter + sort */
    const localRows = useMemo(() => {
      if (serverMode) return rows;
      const q = query.search.trim().toLowerCase();
      const keys = searchKeys ?? columns.map((c) => c.key).filter(Boolean);

      let out = rows.filter((r) => {
        if (
          q &&
          !keys.some((k) =>
            String(r[k] ?? "")
              .toLowerCase()
              .includes(q),
          )
        )
          return false;
        if (hasStatus && query.status !== "All" && r[statusField] !== query.status)
          return false;
        if (
          hasCategory &&
          query.category !== "All" &&
          r[categoryField] !== query.category
        )
          return false;
        return true;
      });

      const { key, dir } = query.sort;
      if (key) {
        const col = columns.find((c) => c.key === key);
        const valueOf = (r) => (col?.sortValue ? col.sortValue(r) : r[key]) ?? "";
        out = [...out].sort((a, b) => {
          const x = valueOf(a);
          const y = valueOf(b);
          const c =
            typeof x === "number" && typeof y === "number"
              ? x - y
              : String(x).localeCompare(String(y), undefined, { numeric: true });
          return dir === "asc" ? c : -c;
        });
      }
      return out;
    }, [
      rows,
      query,
      serverMode,
      columns,
      searchKeys,
      hasStatus,
      hasCategory,
      statusField,
      categoryField,
    ]);

    /* pagination */
    const count = serverMode ? (total ?? rows.length) : localRows.length;
    const totalPages = Math.max(1, Math.ceil(count / query.pageSize));
    const currentPage = Math.min(query.page, totalPages);
    const start = (currentPage - 1) * query.pageSize;
    const pageRows = serverMode
      ? rows
      : localRows.slice(start, start + query.pageSize);

    const pageNumbers = useMemo(() => {
      const win = 5;
      let from = Math.max(1, currentPage - Math.floor(win / 2));
      const to = Math.min(totalPages, from + win - 1);
      from = Math.max(1, to - win + 1);
      return Array.from({ length: to - from + 1 }, (_, i) => from + i);
    }, [currentPage, totalPages]);

    /* header columns */
    const statusInsertAt = hasStatus
      ? Math.min(Math.max(statusColumnIndex - 2, 0), columns.length)
      : 0;
    const headCols = [
      { sr: true, label: "Sr.No", width: "60px" }, 
      ...columns.slice(0, statusInsertAt),
      ...(hasStatus ? [{ status: true, label: "Status", width: "130px" }] : []),
      ...columns.slice(statusInsertAt),
      ...(hasActions
        ? [{ actions: true, label: "Actions", width: "145px" }]
        : []),
    ];

    /* toast auto-hide */
    useEffect(() => {
      if (!toast) return undefined;
      const t = setTimeout(() => setToast(null), 2800);
      return () => clearTimeout(t);
    }, [toast]);

    /* export */
    const handleExport = async () => {
      if (!exportConfig) return;
      const source = serverMode
        ? exportConfig.fetchRows
          ? await exportConfig.fetchRows(query)
          : rows
        : localRows;
      const data = source.map((r, i) => exportConfig.toRow(r, i));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, exportConfig.sheetName ?? "Sheet1");
      XLSX.writeFile(wb, exportConfig.fileName ?? "export.xlsx");
      setToast({
        id: Date.now(),
        tone: "ok",
        msg: `Exported ${data.length} records`,
      });
    };

    /* status toggle */
    const askToggle = (row) => {
      const next = row[statusField] === activeValue ? inactiveValue : activeValue;
      setConfirm({ row, next });
    };

    const confirmToggle = async () => {
      if (!confirm || !onToggleStatus) return;
      const { row, next } = confirm;
      setBusy(true);
      try {
        await onToggleStatus(row, next);
        setToast({
          id: Date.now(),
          tone: next === activeValue ? "ok" : "warn",
          msg: `${rowTitle(row)} is now ${next.toLowerCase()}`,
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

    const pageBtn =
      "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";
    const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] disabled:cursor-not-allowed disabled:border-[#e2e8ee] disabled:text-[#b8c4d3] disabled:hover:bg-white disabled:hover:text-[#b8c4d3]`;
    const td = "border-t border-[#e2e8ee] px-3.5 py-2.5 text-[15px] text-slate-900";

    const renderCell = (col, row, index) => {
      if (col.sr) return start + index + 1;
      if (col.status)
        return (
          <StatusBadge
            value={row[statusField]}
            statuses={statuses}
            className="justify-center items-center text-center"
          />
        );
      if (col.actions)
        return (
          <div className="flex items-center gap-2">
            {onView && (
              <ActionButton
                title={`View ${rowTitle(row)}`}
                onClick={() => onView(row)}
                gradient="from-[#168fa1] to-[#35b8c4]"
              >
                <ChevronsRight size={14} strokeWidth={2.2} />
              </ActionButton>
            )}
            {onEdit && (
              <ActionButton
                title={`Edit ${rowTitle(row)}`}
                onClick={() => onEdit(row)}
                gradient="from-[#2c6b8a] to-[#4a9bb3]"
              >
                <Pencil size={14} strokeWidth={2.2} />
              </ActionButton>
            )}
            {onToggleStatus && (
              <StatusSwitch
                label={rowTitle(row)}
                active={row[statusField] === activeValue}
                onClick={() => askToggle(row)}
              />
            )}
          </div>
        );
      if (col.render) return col.render(row);
      return row[col.key] ?? "-";
    };

    const btnPrimary =
      "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#16834f] to-[#2fb877] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834f] focus-visible:ring-offset-2";

    return (
      <div className="mx-auto max-w-[1400px] rounded-[14px] border border-[#e2e8ee] bg-white p-4 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:px-5">
        {/* HEADER */}
        <div className="mb-2 flex flex-col items-start justify-between gap-3 xl:flex-row xl:items-center">
          <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
            {title}
          </h1>

          <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto">
            <div className="relative min-w-[280px] flex-1 xl:flex-none">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
              />
              <input
                type="search"
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                value={query.search}
                onChange={(e) => patchFilter({ search: e.target.value })}
                className="h-9 w-full rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] pl-9 pr-3 text-[13px] text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
              />
            </div>

            {hasStatus && (
              <Select
                label="Status"
                value={query.status}
                options={statuses.map((s) => s.value)}
                onChange={(v) => patchFilter({ status: v })}
              />
            )}

            {hasCategory && (
              <Select
                label={categoryLabel}
                value={query.category}
                options={categories}
                onChange={(v) => patchFilter({ category: v })}
              />
            )}

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                disabled={!isFiltered}
                title="Reset filters"
                className="group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#e2e8ee] px-2.5 text-[13px] font-medium text-[#d64545] transition hover:border-[#d64545]/40 hover:bg-[#fbe9e9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d64545] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#e2e8ee] disabled:hover:bg-transparent"
              >
                <RotateCcw
                  size={14}
                  className="transition-transform duration-300 group-enabled:group-hover:-rotate-180"
                />
              </button>
            )}

            {exportConfig && (
              <button
                type="button"
                onClick={handleExport}
                title="Export to Excel"
                className={btnPrimary}
              >
                <Download
                  size={14}
                  className="transition-transform group-hover:translate-y-0.5"
                />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}

            {onAdd && (
              <button
                type="button"
                title={addLabel}
                onClick={onAdd}
                className={btnPrimary}
              >
                <Plus
                  size={15}
                  strokeWidth={2.2}
                  className="transition-transform group-hover:scale-110"
                />
                <span className="hidden sm:inline">{addLabel}</span>
              </button>
            )}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="my-3.5 h-px bg-gradient-to-r from-[#2c6b8a]/45 via-[#e2e8ee] to-transparent"
        />

        {/* TABLE */}
<div className={`common-scrollbar mt-4 overflow-auto rounded-lg border border-[#cbe1f4] ${hasStats ? "h-[45vh]" : "h-[55vh]"}`}>
  <table className="w-full min-w-[860px] table-fixed border-collapse text-[15px]">
    {/* Single colgroup keeps header & body columns perfectly aligned */}
    <colgroup>
      {headCols.map((col) => (
        <col key={col.label} style={{ width: col.width }} />
      ))}
    </colgroup>
    <thead className="sticky top-0 z-10">
        <tr>
          {headCols.map((col) => {
            const sortable = Boolean(col.key && col.sortable);
            const active = sortable && query.sort.key === col.key;
            return (
              <th
                key={col.label}
                scope="col"
                style={{ width: col.width }}
                aria-sort={
                  active
                    ? query.sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
                className="whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-left text-[15px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)]"
              >
                {sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[15px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      active
                        ? "bg-white/20 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]"
                        : "text-white hover:text-white/80"
                    }`}
                  >
                    {col.label}
                    <span className="flex flex-col leading-none">
                      <ChevronUp
                        size={10}
                        className={
                          active && query.sort.dir === "asc"
                            ? "opacity-100"
                            : "opacity-40"
                        }
                      />
                      <ChevronDown
                        size={10}
                        className={
                          active && query.sort.dir === "desc"
                            ? "opacity-100"
                            : "opacity-40"
                        }
                      />
                    </span>
                  </button>
                ) : (
                  col.label
                )}
              </th>
            );
          })}
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <tr>
            <td colSpan={headCols.length} className="px-4 py-12 text-center">
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
            <td
              colSpan={headCols.length}
              className="border-t border-[#e2e8ee] px-4 py-12 text-center"
            >
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                <Inbox size={22} />
              </div>
              <p className="mt-3 text-[15px] text-[#1e2b36]">
                {isFiltered
                  ? "No records match these filters"
                  : `No ${title.toLowerCase()} yet`}
              </p>
              {isFiltered && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-3 cursor-pointer rounded-lg bg-[#2c6b8a] px-3.5 py-2 text-[15px] font-semibold text-white hover:bg-[#245a75]"
                >
                  Reset filters
                </button>
              )}
            </td>
          </tr>
        ) : (
          pageRows.map((row, index) => (
            <tr
              key={row.id ?? index}
              style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
              className="js-row group transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
            >
              {headCols.map((col) => (
                <td
                  key={col.label}
                  style={{ width: col.width }}
                  className={`${td} ${
                    col.sr ? "tabular-nums" : ""
                  } ${col.actions ? "" : "whitespace-nowrap"}`}
                >
                  <div
                    className={
                      col.actions
                        ? "flex items-center gap-2"
                        : "w-full min-w-0 truncate"
                    }
                    title={
                      !col.sr && !col.status && !col.actions
                        ? String(row[col.key] ?? "")
                        : undefined
                    }
                  >
                    {renderCell(col, row, index)}
                  </div>
                </td>
              ))}
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
                {Math.min(start + query.pageSize, count)}
              </strong>{" "}
              of <strong className="font-semibold text-[#53677f]">{count}</strong>{" "}
              entries
            </span>
            <label className="flex items-center gap-1.5">
              <span>Show:</span>
              <select
                value={query.pageSize}
                onChange={(e) =>
                  setQuery((q) => ({
                    ...q,
                    pageSize: Number(e.target.value),
                    page: 1,
                  }))
                }
                className="h-8 cursor-pointer rounded-lg border border-[#dce3eb] bg-white px-2 text-[13px] text-[#34445a] hover:border-[#2c6b8a] focus:border-[#2c6b8a] focus:outline-none focus:ring-2 focus:ring-[#2c6b8a]/30"
              >
                {pageSizes.map((n) => (
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
              disabled={currentPage === totalPages}
              className={navBtn}
            >
              Next
            </button>
          </nav>
        </div>

        {/* DIALOG */}
        {confirm && (
          <StatusConfirmDialog
            label={rowTitle(confirm.row)}
            next={confirm.next}
            tone={toneOf(statuses, confirm.next)}
            entityName={entityName}
            busy={busy}
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
              <CheckIcon size={12} strokeWidth={3.4} />
            </span>
            {toast.msg}
          </div>
        )}
      </div>
    );
  };

  export default DataListPage;
