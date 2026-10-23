import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronsLeft, Eye } from "lucide-react";
import { getComplaintById } from "../../../api/complaintApi";

/* ------------------------------ HELPERS ------------------------------ */

const displayText = (value) =>
  value !== null && value !== undefined && String(value).trim() !== ""
    ? String(value)
    : "";

const formatDate = (value) => {
  if (!value) return "-";
  const s = String(value).trim();
  if (s.startsWith("0001-01-01")) return "-";

  // Trim fractional seconds to milliseconds: "2026-10-23T14:15:23.1415065"
  const normalized = s.replace(/(\.\d{3})\d+/, "$1");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "-";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

/* ---------- DOCUMENT URL ---------- */

const DOCUMENT_BASE_URL = (process.env.REACT_APP_DOCUMENT_BASE_URL || "").trim();

const toAbsoluteUrl = (url) => {
  if (!url) return "";
  const raw = String(url).trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  let clean = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  clean = clean.replace(/^wwwroot\//i, "");
  clean = clean.replace(/^api\//i, "");
  clean = clean.replace(/^\/+/, "");

  if (!DOCUMENT_BASE_URL) return `/${clean}`;
  return `${DOCUMENT_BASE_URL.replace(/\/+$/, "")}/${clean}`;
};

/* ---------- STATUS ---------- */

const STATUS_BADGE = {
  new: "bg-sky-600 ring-sky-700 shadow-sky-600/20",
  inprogress: "bg-indigo-600 ring-indigo-700 shadow-indigo-600/20",
  hold: "bg-amber-500 ring-amber-600 shadow-amber-500/20",
  closed: "bg-slate-500 ring-slate-600 shadow-slate-500/20",
};

const NEUTRAL_BADGE = "bg-slate-500 ring-slate-600 shadow-slate-500/20";

const normalizeStatus = (value) => {
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

/* ---------- FIELDS (keys match the API response exactly) ---------- */

const FIELDS = [
  { key: "cP_reference_no", label: "Request ID" },
  { key: "cP_full_name", label: "Full Name" },
  { key: "cP_mobile", label: "Mobile" },
  { key: "cP_email", label: "Email" },
  { key: "userTypeName", label: "User Type" },
  { key: "complaintCategoryName", label: "Category" },
  { key: "cP_created_at", label: "Submitted", type: "date" },
  { key: "cP_file_path", label: "Supporting Document", type: "file" },
  { key: "cP_details", label: "Complaint Details", type: "multiline" },
];

/* ------------------------------ STYLES ------------------------------ */

const displayInputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition cursor-default";

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
      setRecord(null);

      try {
        if (!id) throw new Error("Complaint ID is missing.");

        const response = await getComplaintById(id);

        if (response?.success === false || response?.Success === false) {
          throw new Error(
            response?.message || response?.Message || "Unable to load this record.",
          );
        }

        // Handles { success, data: record } and { data: { data: record } }.
        const payload = response?.data ?? response;
        const data = payload?.data ?? payload;

        if (!data || typeof data !== "object" || data.cP_complaint_id == null) {
          throw new Error("Record not found.");
        }

        if (!cancelled) setRecord(data);
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

  /* ---------- Derived ---------- */

  const statusLabel = displayText(record?.statusName);
  const statusBadge =
    STATUS_BADGE[normalizeStatus(statusLabel)] ?? NEUTRAL_BADGE;

  const savedResponse = displayText(record?.cP_responseRetun);

  /* ---------- Field rendering ---------- */

  const renderValue = (field, value) => {
    if (field.type === "file") {
      const url = toAbsoluteUrl(value);
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
          value={displayText(value) || "-"}
          rows={3}
          className={`${displayInputClass} resize-none`}
        />
      );
    }

    return (
      <input
        type="text"
        readOnly
        value={field.type === "date" ? formatDate(value) : displayText(value) || "-"}
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

              <h2 className="font-semibold text-slate-800">View Complaint</h2>
            </div>

            {record && statusLabel && (
              <span
                className={`inline-flex h-7 min-w-[110px] items-center justify-center rounded-md px-2.5 text-[15px] font-medium text-white ring-1 ring-inset whitespace-nowrap shadow-sm ${statusBadge}`}
              >
                {statusLabel}
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
                  {FIELDS.map((field) => (
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
                        {renderValue(field, record[field.key])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response (read-only) */}
              {savedResponse && (
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