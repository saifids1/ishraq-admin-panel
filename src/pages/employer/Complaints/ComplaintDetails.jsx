import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronsLeft, Eye, FileText } from "lucide-react";
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
  new: "bg-sky-600 ring-sky-700 shadow-sky-600/20",
  inprogress: "bg-indigo-600 ring-indigo-700 shadow-indigo-600/20",
  hold: "bg-amber-500 ring-amber-600 shadow-amber-500/20",
  closed: "bg-slate-500 ring-slate-600 shadow-slate-500/20",
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

/* Read-only display input */
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

const ComplaintDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getComplaintById(id);
        const data = response?.data ?? response;

        if (!cancelled) {
          if (!data) setError("Record not found.");
          setRecord(data || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Unable to load this record.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ---------- Saved response (read-only for employers) ---------- */
  const savedResponse =
    record?.cP_responseRetun ??
    record?.responseRetun ??
    record?.responseReturn ??
    record?.response ??
    record?.admin_response ??
    "";

  /* ---------- Header status ---------- */
  const headerStatusLabel = useMemo(() => requestStatusLabel(record), [record]);
  const headerStatusKey = normalizeRequestStatus(headerStatusLabel);
  const headerStatusBadge =
    (headerStatusKey && REQUEST_STATUS_TONES[headerStatusKey]) || NEUTRAL_BADGE;

  /* ---------- Helpers ---------- */
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
    return field.type === "date" ? formatDate(value) : String(value);
  };

  const renderFieldInput = (field, value) => {
    if (field.type === "file") {
      const url = value ? toAbsoluteUrl(value) : resolveDocumentUrl();

      if (!url) {
        return <span className="text-sm text-slate-400">No document</span>;
      }

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

    return (
      <input
        type="text"
        readOnly
        value={fieldDisplayValue(field, value)}
        className={displayInputClass}
      />
    );
  };

  /* ---------------------------- RENDER ---------------------------- */

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

              <h2 className="font-semibold text-slate-800">
                View {cfg.title}
              </h2>
            </div>

            {record && headerStatusLabel && (
              <span
                className={`inline-flex h-7 min-w-[110px] items-center justify-center rounded-md px-2.5 text-[15px] font-medium text-white ring-1 ring-inset whitespace-nowrap shadow-sm ${headerStatusBadge}`}
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

          {/* Loading */}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center p-6 text-slate-500">
              Loading details...
            </div>
          ) : record ? (
            <div
              className="common-scrollbar overflow-y-auto p-4"
              style={{ scrollbarGutter: "stable" }}
            >
              {/* Details */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                  {cfg.detailFields.map((field) => (
                    <div
                      key={field.key}
                      className={`grid grid-cols-[130px_1fr] items-center gap-3 ${
                        field.type === "multiline" ? "md:col-span-2" : ""
                      }`}
                    >
                      <span className="text-[14px] font-semibold text-black">
                        {field.label}
                      </span>
                      <div className="min-w-0">
                        {renderFieldInput(field, record[field.key])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response (read-only) */}
              {String(savedResponse).trim() && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                  <p className="mb-1.5 text-sm font-medium text-slate-700">
                    Response
                  </p>
                  <div className="w-full whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                    {savedResponse}
                  </div>
                </div>
              )}

              {/* Footer */}
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