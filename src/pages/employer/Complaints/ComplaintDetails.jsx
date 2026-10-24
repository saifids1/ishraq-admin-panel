import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronsLeft, FileText, Eye } from "lucide-react";
import { adminEnquiryService } from "../../../api/Services/adminEnquiryService";

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
const DOCUMENT_BASE_URL = (
  process.env.REACT_APP_DOCUMENT_BASE_URL || ""
).trim();

const toAbsoluteUrl = (url) => {
  if (!url) return url;

  const raw = String(url).trim();

  // Already absolute (http/https): return as-is
  if (/^https?:\/\//i.test(raw)) return raw;

  // Normalize the path
  let clean = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  clean = clean.replace(/^wwwroot\//i, ""); // strip "wwwroot/"
  clean = clean.replace(/^api\//i, ""); // strip accidental "api/"
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
  new: {
    badge: "bg-yellow-400 text-yellow-950 ring-yellow-500 shadow-yellow-400/30",
  },
  open: { badge: "bg-blue-600 text-white ring-blue-700 shadow-blue-600/20" },
  "in-progress": {
    badge: "bg-orange-500 text-white ring-orange-600 shadow-orange-500/20",
  },
  hold: { badge: "bg-red-600 text-white ring-red-700 shadow-red-600/20" },
  closed: {
    badge: "bg-emerald-600 text-white ring-emerald-700 shadow-emerald-600/20",
  },
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
  CP_reference_no: "CP_reference_no",
  detailFields: [
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

/* Read-only display input: looks like a normal input but not editable */
const displayInputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition cursor-default";

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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await adminEnquiryService.getById(formType, id);

        if (cancelled) return;

        setRecord(data);

        if (!data) {
          setError("Record not found.");
          return;
        }

        // API key is `cP_responseRetun` (note the spelling).
        const savedResponse =
          data?.cP_responseRetun ??
          data?.responseRetun ??
          data?.responseReturn ??
          data?.response ??
          data?.admin_response ??
          "";
        setResponseText(String(savedResponse ?? ""));
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load this record.");
        }
      } finally {
        if (!cancelled) setLoading(false);
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
        <>
          <textarea
            readOnly
            value={fieldDisplayValue(field, value)}
            rows={3}
            className={`${displayInputClass} resize-none`}
          />
          <p className="mt-1 text-xs text-amber-600">
            Maximum 500 characters allowed.
          </p>
        </>
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

  const title = cfg?.singular || cfg?.title || "Enquiry";
  const pageTitle = `View ${title}`;

  /* ---- Header request-status badge (display only) ---- */
  const headerStatusLabel = useMemo(() => requestStatusLabel(record), [record]);
  const headerStatusTone = useMemo(
    () => requestToneOf(headerStatusLabel),
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
            <h2 className="font-semibold text-slate-800">
              {record?.CP_reference_no}
            </h2>

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

          {/* Loading state */}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center p-6 text-slate-500">
              Loading details...
            </div>
          ) : record ? (
            <div
              className="common-scrollbar overflow-y-auto p-4"
              style={{ scrollbarGutter: "stable" }}
            >
              {/* Details list */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                  {cfg.detailFields.map((field) => (
                    <div
                      key={field.key}
                      className={`grid grid-cols-[130px_1fr]  gap-3 ${
                        field.type === "multiline"
                          ? "md:col-span-2 items-top"
                          : "items-center"
                      }`}
                    >
                      <label
                        htmlFor={`field-${field.key}`}
                        className={`text-[14px] font-semibold text-black `}
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

              {/* Response (read-only) */}
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 flex items-top  gap-y-4">
                <p className="mb-1.5 block text-sm font-semibold text-black mr-[8%]">
                  Response
                </p>
                <div className="w-full whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                  {responseText.trim() ? (
                    responseText
                  ) : (
                    <span className="text-slate-400">No response yet.</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetails;
