import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronsLeft, FileText, Eye } from "lucide-react";
import { useStatusToast } from "../../../../components/common/StatusModalProvider";
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

/* ---------- DOCUMENT URL Configuration (same as JobSeekerDetails) ---------- */
const DOCUMENT_BASE_URL = (process.env.REACT_APP_DOCUMENT_BASE_URL || "").trim();

const toAbsoluteUrl = (url) => {
  if (!url) return url;

  const raw = String(url).trim();

  // Already absolute (http/https) — return as-is
  if (/^https?:\/\//i.test(raw)) return raw;

  // Normalize the path
  let clean = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  clean = clean.replace(/^wwwroot\//i, "");  // strip "wwwroot/"
  clean = clean.replace(/^api\//i, "");      // strip accidental "api/"
  clean = clean.replace(/^\/+/, "");

  // No base configured → fall back to root-relative path (works same-origin)
  if (!DOCUMENT_BASE_URL) return `/${clean}`;

  return `${DOCUMENT_BASE_URL.replace(/\/+$/, "")}/${clean}`;
};

/* ---------- REQUEST STATUS (same palette as Contact/Career list) ---------- */

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

const NEUTRAL_BADGE = "bg-slate-500 ring-slate-600 shadow-slate-500/20";

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
  if (!key) return { badge: NEUTRAL_BADGE, key: null };
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
    { key: "CP_reference_no", label: "Request ID" },
    { key: "CP_full_name", label: "Full Name" },
    { key: "CP_mobile", label: "Mobile" },
    { key: "CP_email", label: "Email" },
    { key: "UserTypeName", label: "User Type" },
    { key: "ComplaintCategoryName", label: "Category" },
    { key: "CP_details", label: "Complaint Details", type: "multiline" },
    { key: "CP_file_path", label: "Supporting Document", type: "file" },
    { key: "CP_created_at", label: "Submitted", type: "date" },
  ],
};

/* ------------------------------ STYLES ------------------------------ */

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

/* Read-only display input — looks like a normal input but not editable */
const displayInputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition cursor-default";

const statusIdFromName = (value, options) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return options.find(
    (option) => option.label.toLowerCase() === normalized,
  )?.value;
};

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
  const [, setToast] = useStatusToast();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---- Response + Status state ----
  const [responseText, setResponseText] = useState("");
  const [status, setStatus] = useState("1");
  const [savingResponse, setSavingResponse] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [responseSaved, setResponseSaved] = useState(false);
  const [statusOptions, setStatusOptions] = useState([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [notice, setNotice] = useState("");

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
            /* ---- Response: include the API's actual key `cP_responseRetun` ---- */
            const savedResponse =
              data?.cP_responseRetun ??   // API key (note spelling)
              data?.responseRetun ??
              data?.responseReturn ??
              data?.response ??
              data?.admin_response ??
              "";
            setResponseText(savedResponse);
            setResponseSaved(Boolean(String(savedResponse).trim()));

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
            setStatus(
              String(
                existingStatusId ??
                  statusIdFromName(existingStatusName, loadedStatuses) ??
                  loadedStatuses[0]?.value ??
                  "",
              ),
            );
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

  const openFile = async () => {
    try {
      await adminEnquiryService.openFile(formType, id);
    } catch (err) {
      setError(err?.message || "Could not open the document.");
    }
  };

  /* ---------- Resolve the document URL from the raw path ---------- */
  const resolveDocumentUrl = () => {
    const path =
      record?.CP_file_path ??
      record?.cP_file_path ??
      record?.filePath ??
      record?.FilePath ??
      "";
    return path ? toAbsoluteUrl(path) : "";
  };

  /* ---------- Render the raw display string for a field ---------- */
  const fieldDisplayValue = (field, value) => {
    if (value === null || value === undefined || value === "") return "";

    switch (field.type) {
      case "date":
        return formatDate(value);
      default:
        return String(value);
    }
  };

  /* ---------- Render the field's value block ---------- */
  const renderFieldInput = (field, value) => {
    /* Rating → styled stars inside a display box */
    if (field.type === "rating") {
      return (
        <div className={displayInputClass}>
          {value ? <Stars value={value} /> : <span>—</span>}
        </div>
      );
    }

    /* File → plain "View Document" link (NO input box) */
    if (field.type === "file") {
      const url = value ? toAbsoluteUrl(value) : resolveDocumentUrl();

      // When we have a raw file path → build a clickable link (JobSeekerDetails pattern)
      if (url) {
        return (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-[#2f6b8a] hover:underline"
          >
            <Eye size={16} />
            View Document
          </a>
        );
      }

      // Fallback to the API-based openFile() when no path is present
      return (
        <button
          type="button"
          onClick={openFile}
          className="inline-flex items-center gap-2 text-[#2f6b8a] hover:underline"
        >
          <FileText size={16} />
          View Document
        </button>
      );
    }

    /* Multiline → textarea-style display */
    if (field.type === "multiline") {
      return (
        <textarea
          readOnly
          value={fieldDisplayValue(field, value)}
          rows={3}
          className={`${displayInputClass} resize-none`}
        />
      );
    }

    /* Default → single-line read-only input */
    return (
      <input
        type="text"
        readOnly
        value={fieldDisplayValue(field, value)}
        className={displayInputClass}
      />
    );
  };

  // ---- Submit response ----
  const handleSubmitResponse = async () => {
    if (savingResponse || responseSaved) return;

    const trimmed = responseText.trim();
    if (!trimmed) {
      setError("Response cannot be empty.");
      setToast({ tone: "err", msg: "Response cannot be empty." });
      return;
    }

    setSavingResponse(true);
    setError("");
    setNotice("");

    try {
      const userId = Number(getCurrentUserId2());
      if (!Number.isInteger(userId) || userId <= 0) {
        throw new Error("Unable to identify the current user. Please sign in again.");
      }
      await adminEnquiryService.updateEnquiryResponse(
        formType,
        id,
        trimmed,
        userId,
      );
      setNotice("Response submitted successfully.");
      setToast({ tone: "ok", msg: "Response submitted successfully." });
      setResponseSaved(true);
      setRecord((prev) =>
        prev
          ? { ...prev, cP_responseRetun: trimmed, response: trimmed }
          : prev,
      );
    } catch (err) {
      const message = err?.message || "Failed to submit response.";
      setError(message);
      setToast({ tone: "err", msg: message });
    } finally {
      setSavingResponse(false);
    }
  };

  // ---- Update status ----
  const handleSaveStatus = async () => {
    // Locked once the request is Closed.
    if (savingStatus || isClosed) return;

    setSavingStatus(true);
    setError("");
    setNotice("");

    try {
      const userId = Number(getCurrentUserId2());
      if (!Number.isInteger(userId) || userId <= 0) {
        throw new Error("Unable to identify the current user. Please sign in again.");
      }
      await adminEnquiryService.updateEnquiryStatus(formType, id, {
        statusId: Number(status),
        userId,
        changedAt: new Date().toISOString(),
      });
      setNotice("Status updated successfully.");
      setToast({ tone: "ok", msg: "Status updated successfully." });
      const newLabel =
        statusOptions.find((o) => String(o.value) === String(status))?.label ??
        null;
      setRecord((prev) =>
        prev
          ? {
              ...prev,
              statusId: Number(status),
              // keep header badge / isClosed in sync immediately
              statusName: newLabel ?? prev.statusName,
              requestStatusName: newLabel ?? prev.requestStatusName,
            }
          : prev,
      );
    } catch (err) {
      const message = err?.message || "Failed to update status.";
      setError(message);
      setToast({ tone: "err", msg: message });
    } finally {
      setSavingStatus(false);
    }
  };

  const title = cfg?.singular || cfg?.title || "Enquiry";
  const pageTitle = `View ${title}`;

  /* ---- Header request-status badge (same colors as list) ---- */
  const headerStatusLabel = useMemo(() => requestStatusLabel(record), [record]);
  const headerStatusTone = useMemo(
    () => requestToneOf(headerStatusLabel),
    [headerStatusLabel],
  );

  /* ---- Lock status editing once the request is Closed. ---- */
  const isClosed = useMemo(
    () => normalizeRequestStatus(headerStatusLabel) === "closed",
    [headerStatusLabel],
  );

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Header bar */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                title="Back"
                aria-label="Back"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f]"
              >
                <ChevronsLeft size={18} strokeWidth={2} />
              </button>

              <h2 className="font-semibold text-slate-800">{pageTitle}</h2>
            </div>

            {/* Request Status badge — same colors as the list, no icon */}
            {record && headerStatusLabel && (
              <span
                className={`inline-flex h-7 min-w-[110px] items-center justify-center rounded-md px-2.5 text-[15px] font-medium text-white ring-1 ring-inset whitespace-nowrap shadow-sm ${headerStatusTone.badge}`}
              >
                {headerStatusLabel}
              </span>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Success notice */}
          {notice && (
            <div className="mx-4 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
              {notice}
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center p-6 text-slate-500">
              Loading details...
            </div>
          ) : record ? (
            /* ── Scrollable content wrapper — `common-scrollbar` styles the
               vertical scrollbar when the content exceeds 65vh ── */
            <div
              className="common-scrollbar  overflow-y-auto p-4"
              style={{ scrollbarGutter: "stable" }}
            >
              {/* Details list */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                  {cfg.detailFields.map((field) => (
                    <div
                      key={field.key}
                      className={`grid grid-cols-[130px_1fr] items-center gap-3 ${
                        field.type === "multiline" ? "md:col-span-2" : ""
                      }`}
                    >
                      <label
                        htmlFor={`field-${field.key}`}
                        className="text-[14px] font-semibold text-black"
                      >
                        {field.label}
                      </label>
                      <div className="min-w-0">
                        {renderFieldInput(field, record[field.key])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- Merged Response + Status section ---- */}
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {/* Response — read-only if already saved */}
                  <div className="md:col-span-2">
                    <label
                      htmlFor="admin-response"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Response
                    </label>

                    {responseSaved ? (
                      <div
                        id="admin-response"
                        className="w-full whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                      >
                        {responseText || (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    ) : (
                      <textarea
                        id="admin-response"
                        value={responseText}
                        onChange={(event) =>
                          setResponseText(event.target.value)
                        }
                        rows={4}
                        placeholder="Type your response to this enquiry..."
                        className={inputClass}
                        disabled={savingResponse || savingStatus}
                      />
                    )}
                  </div>

                  {/* Status — disabled when request is Closed */}
                  <div>
                    <label
                      htmlFor="status-select"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Status
                    </label>
                    <div className="relative">
                      <select
                        id="status-select"
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
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
                      <p className="mt-1.5 text-xs text-slate-500">
                        This complaint is closed — status can no longer be
                        changed.
                      </p>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex items-end justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleSaveStatus}
                      disabled={savingStatus || savingResponse || isClosed}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#2f6b8a] bg-white px-5 py-2.5 text-sm font-semibold text-[#2f6b8a] transition hover:bg-[#e9f4f7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingStatus
                        ? "Saving..."
                        : isClosed
                          ? "Status Locked"
                          : "Save Status"}
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitResponse}
                      disabled={savingResponse || savingStatus || responseSaved}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingResponse
                        ? "Submitting..."
                        : responseSaved
                          ? "Response Saved"
                          : "Submit Response"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="mt-4 flex justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Back
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetails;