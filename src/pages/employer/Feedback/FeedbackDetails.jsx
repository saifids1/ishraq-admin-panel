import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronsLeft, LoaderCircle } from "lucide-react";
import { getFeedbackById } from "../../../api/feedbackApi";

/* ------------------------------ HELPERS ------------------------------ */

const formatDate = (value) => {
  if (!value) return "-";
  const s = String(value).trim();
  if (s.startsWith("0001-01-01")) return "-";

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

const displayText = (value) =>
  value !== null && value !== undefined && String(value).trim() !== ""
    ? String(value)
    : "";

/* ---------- STATUS (same colors as the feedback list) ---------- */

const STATUS_BADGE = {
  open: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20",
  active: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20",
  new: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20",
  hold: "bg-amber-500 ring-amber-600 shadow-amber-500/20",
  paused: "bg-amber-500 ring-amber-600 shadow-amber-500/20",
  pending: "bg-amber-500 ring-amber-600 shadow-amber-500/20",
  closed: "bg-rose-600 ring-rose-700 shadow-rose-600/20",
  resolved: "bg-rose-600 ring-rose-700 shadow-rose-600/20",
};

const statusBadgeClass = (value) =>
  STATUS_BADGE[String(value ?? "").trim().toLowerCase()] ??
  "bg-slate-500 ring-slate-600 shadow-slate-500/20";

/* ------------------------------ STYLES ------------------------------ */

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

/* Field definitions. Rendering type decides how each value is shown. */
const FIELDS = [
  { key: "fB_feedback_id", label: "Feedback ID" },
  { key: "fB_request_no", label: "Request No." },
  { key: "fB_name", label: "Organization Name" },
  { key: "userTypeName", label: "User Type" },
  { key: "fB_contact", label: "Contact / Email" },
  { key: "fB_created_at", label: "Submitted", type: "date" },
  { key: "fB_rating", label: "Rating", type: "rating" },
  {
    key: "fB_overall_experience",
    label: "Overall Experience",
    type: "multiline",
  },
  { key: "fB_useful_text", label: "What Was Useful", type: "multiline" },
  {
    key: "fB_improve_text",
    label: "What Can Be Improved",
    type: "multiline",
  },
  { key: "fB_suggestions", label: "Suggestions", type: "multiline" },
];

/* ------------------------------ COMPONENT ------------------------------ */

const FeedbackDetails = () => {
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
        if (!id) throw new Error("Feedback ID is missing.");

        const response = await getFeedbackById(id);

        if (response?.success === false || response?.Success === false) {
          throw new Error(
            response?.message || response?.Message || "Failed to load feedback.",
          );
        }

        // Handles { success, data: record } and { data: { data: record } }.
        const payload = response?.data ?? response;
        const data = payload?.data ?? payload;

        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data) ||
          data.fB_feedback_id == null
        ) {
          throw new Error("Feedback record not found.");
        }

        if (!cancelled) setRecord(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.Message ||
              err?.message ||
              "Failed to load feedback details.",
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
  const savedResponse = displayText(record?.fb_responseRetun);

  const renderValue = (field, value) => {
    if (field.type === "rating") {
      const rating = Math.min(5, Math.max(0, Number(value) || 0));
      return (
        <div className={displayInputClass}>
          {rating > 0 ? <Stars value={rating} /> : <span>—</span>}
        </div>
      );
    }

    if (field.type === "date") {
      return (
        <input
          type="text"
          readOnly
          value={formatDate(value)}
          className={displayInputClass}
        />
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
        value={displayText(value) || "-"}
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

              <h2 className="font-semibold text-slate-800">View Feedback</h2>
            </div>

            {record && statusLabel && (
              <span
                className={`inline-flex h-7 min-w-[110px] items-center justify-center rounded-md px-2.5 text-[15px] font-medium text-white ring-1 ring-inset whitespace-nowrap shadow-sm ${statusBadgeClass(
                  statusLabel,
                )}`}
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
            <div className="flex min-h-[300px] items-center justify-center gap-3 p-6 text-sm text-slate-500">
              <LoaderCircle size={18} className="animate-spin text-[#2f6b8a]" />
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
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                <p className="mb-1.5 text-sm font-medium text-slate-700">
                  Response
                </p>
                <div className="w-full whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                  {savedResponse || (
                    <span className="text-slate-400">
                      No response has been provided yet.
                    </span>
                  )}
                </div>
              </div>

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

export default FeedbackDetails;