import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronsLeft,
  FileText,
  Eye,
  Save,
  Send,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  Lock,
  Loader2,
  Download,
  CalendarDays,
  User,
  Mail,
  Phone,
  Tag,
  MessageSquare,
  Inbox,
} from "lucide-react";

import { getCurrentUserId } from "../../../utils/authUtils";
import { getComplaintById } from "../../../api/complaintApi";

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

const formatDateTime = (value) => {
  if (!value) return "-";
  const s = String(value).trim();
  if (s.startsWith("0001-01-01")) return "-";
  const normalized = s.replace(/(\.\d{3})\d+/, "$1");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "-";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = d.getHours() % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, "0");
  const ap = d.getHours() >= 12 ? "PM" : "AM";
  return `${dd}/${mm}/${yyyy}, ${hh}:${min} ${ap}`;
};

/* ---------- DOCUMENT URL Configuration ---------- */
const DOCUMENT_BASE_URL = (process.env.REACT_APP_DOCUMENT_BASE_URL || "").trim();

const toAbsoluteUrl = (url) => {
  if (!url) return url;
  const raw = String(url).trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  let clean = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  clean = clean.replace(/^wwwroot\//i, "");
  clean = clean.replace(/^api\//i, "");
  clean = clean.replace(/^\/+/, "");

  if (!DOCUMENT_BASE_URL) return `/${clean}`;
  return `${DOCUMENT_BASE_URL.replace(/\/+$/, "")}/${clean}`;
};

/* ---------- REQUEST STATUS ---------- */

const REQUEST_STATUS_LABELS = {
  1: "In Progress",
  2: "On Hold",
  3: "Closed",
};

const REQUEST_STATUS_TONES = {
  new: { badge: "bg-emerald-600 ring-emerald-700", dot: "bg-emerald-500" },
  inprogress: { badge: "bg-sky-600 ring-sky-700", dot: "bg-sky-500" },
  hold: { badge: "bg-amber-500 ring-amber-600", dot: "bg-amber-400" },
  closed: { badge: "bg-slate-500 ring-slate-600", dot: "bg-slate-400" },
};

const NEUTRAL_BADGE = "bg-slate-500 ring-slate-600";
const NEUTRAL_DOT = "bg-slate-400";

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
  if (!key) return { badge: NEUTRAL_BADGE, dot: NEUTRAL_DOT, key: null };
  return { ...REQUEST_STATUS_TONES[key], key };
};

const requestStatusLabel = (record) => {
  if (!record) return "";
  const statusName =
    record?.requestStatusName ??
    record?.RequestStatusName ??
    record?.statusName ??
    record?.status ??
    record?.enquiry_status;
  if (statusName) return String(statusName);

  const statusId =
    record?.requestStatusId ??
    record?.RequestStatusId ??
    record?.statusId ??
    record?.CP_status_id ??
    record?.cP_status_id ??
    record?.enquiry_status_id;
  if (statusId != null && REQUEST_STATUS_LABELS[Number(statusId)])
    return REQUEST_STATUS_LABELS[Number(statusId)];
  return "";
};

const cfg = {
  title: "Complaints",
  activeField: "CP_is_active",
  detailFields: [
    { key: "CP_reference_no", label: "Request ID", icon: FileText, span: 1 },
    { key: "CP_full_name", label: "Full Name", icon: User, span: 1 },
    { key: "CP_mobile", label: "Mobile", icon: Phone, span: 1 },
    { key: "CP_email", label: "Email", icon: Mail, span: 1 },
    { key: "UserTypeName", label: "User Type", icon: User, span: 1 },
    { key: "ComplaintCategoryName", label: "Category", icon: Tag, span: 1 },
    {
      key: "CP_created_at",
      label: "Submitted",
      type: "date",
      icon: CalendarDays,
      span: 1,
    },
    {
      key: "CP_file_path",
      label: "Supporting Document",
      type: "file",
      icon: FileText,
      span: 1,
    },
    {
      key: "CP_details",
      label: "Complaint Details",
      type: "multiline",
      icon: MessageSquare,
      span: 2,
    },
  ],
};

/* ------------------------------ STYLES ------------------------------ */

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/15 disabled:bg-slate-50 disabled:text-slate-500";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/15 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";

const statusIdFromName = (value, options) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return options.find((option) => option.label.toLowerCase() === normalized)
    ?.value;
};

/* ------------------------------ SUBCOMPONENTS ------------------------------ */

const InfoCard = ({ label, icon: Icon, children, span = 1 }) => (
  <div
    className={`rounded-lg border border-slate-200 bg-slate-50/60 p-3 transition hover:border-slate-300 ${
      span === 2 ? "sm:col-span-2" : ""
    }`}
  >
    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {Icon && <Icon size={12} strokeWidth={2.4} />}
      <span>{label}</span>
    </div>
    <div className="min-w-0 break-words text-sm font-medium text-slate-900">
      {children || <span className="text-slate-400">—</span>}
    </div>
  </div>
);

const SkeletonBlock = ({ lines = 3 }) => (
  <div className="animate-pulse space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="h-3 rounded bg-slate-200"
        style={{ width: `${60 + ((i * 13) % 35)}%` }}
      />
    ))}
  </div>
);

const Stars = ({ value }) => (
  <span className="inline-flex items-center gap-2">
    <span className="text-lg leading-none">
      <span className="text-yellow-400">{"★".repeat(Number(value))}</span>
      <span className="text-slate-300">{"★".repeat(5 - Number(value))}</span>
    </span>
    <span className="text-sm text-slate-500">({value}/5)</span>
  </span>
);

/* ------------------------------ COMPONENT ------------------------------ */

const ComplaintDetails = ({ formType = "complaint" }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [responseText, setResponseText] = useState("");
  const [draftResponse, setDraftResponse] = useState("");
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [status, setStatus] = useState("1");
  const [savingResponse, setSavingResponse] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusOptions, setStatusOptions] = useState([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [notice, setNotice] = useState("");

  /* --------------------------- LOAD --------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [data, loadedStatuses] = await Promise.all([
          adminEnquiryService.getById(formType, id),
          adminEnquiryService.getRequestStatuses().catch((err) => {
            if (!cancelled)
              setError(err?.message || "Unable to load request statuses.");
            return [];
          }),
        ]);

        if (!cancelled) {
          setStatusOptions(loadedStatuses);
          setRecord(data);
          if (!data) {
            setError("Record not found.");
          } else {
            const savedResponse =
              data?.cP_responseRetun ??
              data?.responseRetun ??
              data?.responseReturn ??
              data?.response ??
              data?.admin_response ??
              "";
            setResponseText(savedResponse);
            setDraftResponse(savedResponse);

            const existingStatusId =
              data?.requestStatusId ??
              data?.RequestStatusId ??
              data?.statusId ??
              data?.CP_status_id ??
              data?.cP_status_id ??
              data?.enquiry_status_id;
            const existingStatusName =
              data?.requestStatusName ??
              data?.RequestStatusName ??
              data?.statusName ??
              data?.status ??
              data?.enquiry_status;
            const mappedId =
              existingStatusId ??
              statusIdFromName(existingStatusName, loadedStatuses);

            if (mappedId != null) {
              setStatus(String(mappedId));
            } else if (loadedStatuses[0]?.value) {
              setStatus(String(loadedStatuses[0].value));
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load this record.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setStatusLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [formType, id]);

  /* --------------------------- DOCUMENT --------------------------- */

  const openFile = async () => {
    try {
      await adminEnquiryService.openFile(formType, id);
    } catch (err) {
      setError(err?.message || "Could not open the document.");
    }
  };

  const resolveDocumentUrl = () => {
    const path =
      record?.CP_file_path ??
      record?.cP_file_path ??
      record?.filePath ??
      record?.FilePath ??
      "";
    return path ? toAbsoluteUrl(path) : "";
  };

  const fieldDisplayValue = (field, value) => {
    if (value === null || value === undefined || value === "") return "";
    switch (field.type) {
      case "date":
        return formatDate(value);
      default:
        return String(value);
    }
  };

  /* --------------------------- RESPONSE ACTIONS --------------------------- */

  const startEditResponse = () => {
    setDraftResponse(responseText);
    setIsEditingResponse(true);
  };

  const cancelEditResponse = () => {
    setDraftResponse(responseText);
    setIsEditingResponse(false);
  };

  const handleSubmitResponse = async () => {
    if (savingResponse) return;

    const trimmed = draftResponse.trim();
    if (!trimmed) {
      setError("Response cannot be empty.");
      return;
    }

    setSavingResponse(true);
    setError("");
    setNotice("");

    try {
      const userId = Number(getCurrentUserId()) || 0;
      await adminEnquiryService.updateEnquiryResponse(
        formType,
        id,
        trimmed,
        userId,
      );
      setNotice("Response saved successfully.");
      setResponseText(trimmed);
      setDraftResponse(trimmed);
      setIsEditingResponse(false);
      setRecord((prev) =>
        prev
          ? { ...prev, cP_responseRetun: trimmed, response: trimmed }
          : prev,
      );
    } catch (err) {
      setError(err?.message || "Failed to submit response.");
    } finally {
      setSavingResponse(false);
    }
  };

  /* --------------------------- STATUS ACTIONS --------------------------- */

  const handleSaveStatus = async () => {
    if (savingStatus || isClosed) return;

    setSavingStatus(true);
    setError("");
    setNotice("");

    try {
      const userId = getCurrentUserId();
      await adminEnquiryService.updateEnquiryStatus(formType, id, {
        statusId: Number(status),
        userId: Number(userId) || 0,
        changedAt: new Date().toISOString(),
      });
      setNotice("Status updated successfully.");
      const newLabel =
        statusOptions.find((o) => String(o.value) === String(status))?.label ??
        null;
      setRecord((prev) =>
        prev
          ? {
              ...prev,
              statusId: Number(status),
              statusName: newLabel ?? prev.statusName,
              requestStatusName: newLabel ?? prev.requestStatusName,
            }
          : prev,
      );
    } catch (err) {
      setError(err?.message || "Failed to update status.");
    } finally {
      setSavingStatus(false);
    }
  };

  /* --------------------------- DERIVED --------------------------- */

  const title = cfg?.singular || cfg?.title || "Enquiry";
  const pageTitle = `View ${title}`;

  const headerStatusLabel = useMemo(() => requestStatusLabel(record), [record]);
  const headerStatusTone = useMemo(
    () => requestToneOf(headerStatusLabel),
    [headerStatusLabel],
  );

  const isClosed = useMemo(
    () => normalizeRequestStatus(headerStatusLabel) === "closed",
    [headerStatusLabel],
  );

  const hasSavedResponse = Boolean(String(responseText ?? "").trim());

  /* --------------------------- RENDER --------------------------- */

  return (
    <div className="flex min-h-full flex-col bg-[#f4f8fb]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 py-4 sm:px-6">
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* ── HEADER BAR ─────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                title="Back"
                aria-label="Back"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6b8a]/40 focus-visible:ring-offset-2"
              >
                <ChevronsLeft size={18} strokeWidth={2} />
              </button>

              <h2 className="truncate font-semibold text-slate-800">
                {pageTitle}
              </h2>
            </div>

            {record && headerStatusLabel && (
              <span
                className={`inline-flex h-7 min-w-[110px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-white ring-1 ring-inset whitespace-nowrap shadow-sm ${headerStatusTone.badge}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${headerStatusTone.dot}`}
                  aria-hidden="true"
                />
                {headerStatusLabel}
              </span>
            )}
          </div>

          {/* ── BANNERS ───────────────────────────────────── */}
          <div className="space-y-2 px-4 pt-3 sm:px-6">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="shrink-0 rounded p-0.5 text-red-600 hover:bg-red-100"
                  aria-label="Dismiss error"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {notice && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700"
              >
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1">{notice}</span>
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  className="shrink-0 rounded p-0.5 text-emerald-600 hover:bg-emerald-100"
                  aria-label="Dismiss notice"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* ── SCROLLABLE CONTENT ────────────────────────── */}
          <div
            className="common-scrollbar flex-1 overflow-y-auto p-4 sm:p-6"
            style={{ scrollbarGutter: "stable" }}
          >
            {loading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                    >
                      <div className="mb-2 h-2.5 w-20 rounded bg-slate-200" />
                      <SkeletonBlock lines={1} />
                    </div>
                  ))}
                </div>
              </div>
            ) : record ? (
              <div className="space-y-4">
                {/* ── CARD 1: DETAIL FIELDS GRID ──────────── */}
                <section
                  aria-label="Complaint information"
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {cfg.detailFields.map((field) => {
                      const value = record[field.key];

                      // Rating
                      if (field.type === "rating") {
                        return (
                          <InfoCard
                            key={field.key}
                            label={field.label}
                            icon={field.icon}
                            span={field.span}
                          >
                            {value ? <Stars value={value} /> : null}
                          </InfoCard>
                        );
                      }

                      // File
                      if (field.type === "file") {
                        const url = value
                          ? toAbsoluteUrl(value)
                          : resolveDocumentUrl();
                        const rawPath = value || "";
                        const fileName = rawPath
                          ? String(rawPath).split(/[\\/]/).pop()
                          : "View Document";

                        return (
                          <InfoCard
                            key={field.key}
                            label={field.label}
                            icon={field.icon}
                            span={field.span}
                          >
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                title="Open in new tab"
                                className="inline-flex items-center gap-2 break-all text-[#2f6b8a] hover:underline"
                              >
                                <Download size={14} className="shrink-0" />
                                <span className="min-w-0 break-all">
                                  {fileName}
                                </span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={openFile}
                                className="inline-flex items-center gap-2 text-[#2f6b8a] hover:underline"
                              >
                                <Eye size={14} />
                                View Document
                              </button>
                            )}
                          </InfoCard>
                        );
                      }

                      // Multiline
                      if (field.type === "multiline") {
                        return (
                          <InfoCard
                            key={field.key}
                            label={field.label}
                            icon={field.icon}
                            span={field.span}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {fieldDisplayValue(field, value) || "—"}
                            </p>
                          </InfoCard>
                        );
                      }

                      // Default
                      return (
                        <InfoCard
                          key={field.key}
                          label={field.label}
                          icon={field.icon}
                          span={field.span}
                        >
                          {fieldDisplayValue(field, value)}
                        </InfoCard>
                      );
                    })}
                  </div>
                </section>

                {/* ── CARD 2: RESPONSE + STATUS ───────────── */}
                <section
                  aria-label="Response and status"
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  {/* Response header row */}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label
                      htmlFor="admin-response"
                      className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"
                    >
                      <MessageSquare size={14} className="text-slate-500" />
                      Response
                    </label>

                    {!isEditingResponse && hasSavedResponse && (
                      <button
                        type="button"
                        onClick={startEditResponse}
                        disabled={savingResponse || savingStatus}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-[#2f6b8a] hover:bg-[#e8f1f6] hover:text-[#2f6b8a] disabled:opacity-60"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    )}
                  </div>

                  {/* Response content */}
                  {isEditingResponse ? (
                    <>
                      <textarea
                        id="admin-response"
                        value={draftResponse}
                        onChange={(e) => setDraftResponse(e.target.value)}
                        rows={4}
                        placeholder="Type your response to this enquiry..."
                        className={inputClass}
                        disabled={savingResponse || savingStatus}
                        autoFocus
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditResponse}
                          disabled={savingResponse}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitResponse}
                          disabled={savingResponse || savingStatus}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f6b8a] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingResponse ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Send size={14} />
                              Save Response
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : hasSavedResponse ? (
                    <div
                      id="admin-response"
                      className="whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                    >
                      {responseText}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-3 py-6 text-center text-sm text-slate-500">
                      No response has been provided yet.
                      <button
                        type="button"
                        onClick={startEditResponse}
                        disabled={savingResponse || savingStatus}
                        className="ml-2 font-semibold text-[#2f6b8a] hover:underline"
                      >
                        Add one
                      </button>
                    </div>
                  )}

                  {/* Status row */}
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label
                        htmlFor="status-select"
                        className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"
                      >
                        <Tag size={14} className="text-slate-500" />
                        Status
                      </label>
                      <div className="relative">
                        <select
                          id="status-select"
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className={selectClass}
                          disabled={
                            statusLoading ||
                            savingResponse ||
                            savingStatus ||
                            isClosed
                          }
                        >
                          {statusLoading ? (
                            <option value="">Loading statuses...</option>
                          ) : statusOptions.length === 0 ? (
                            <option value="">No statuses available</option>
                          ) : (
                            statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))
                          )}
                        </select>
                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        />
                      </div>
                      {isClosed && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                          <Lock size={11} />
                          This complaint is closed — status can no longer be
                          changed.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveStatus}
                      disabled={savingStatus || savingResponse || isClosed}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#2f6b8a] bg-white px-4 py-2.5 text-sm font-semibold text-[#2f6b8a] transition hover:bg-[#e9f4f7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingStatus ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Saving...
                        </>
                      ) : isClosed ? (
                        <>
                          <Lock size={14} />
                          Status Locked
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          Save Status
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Inbox size={32} className="mb-3 text-slate-300" />
                <p className="text-sm">No details available for this record.</p>
              </div>
            )}
          </div>

          {/* ── STICKY FOOTER ─────────────────────────────── */}
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <ChevronsLeft size={14} />
              Back
            </button>
            <span className="text-xs text-slate-400">
              Record #{record?.CP_reference_no || id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetails;