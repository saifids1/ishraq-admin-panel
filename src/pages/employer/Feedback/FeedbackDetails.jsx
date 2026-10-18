import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  LoaderCircle,
  Star,
  MessageSquareText,
  ClipboardList,
  ChevronsLeft,
} from "lucide-react";

import { getFeedbackById } from "../../../api/feedbackApi";

// Prominent status colors. Keys are normalized (uppercase, hyphenated).
const STATUS_STYLES = {
  NEW: "bg-blue-600 text-white",
  OPEN: "bg-emerald-600 text-white",
  "IN-PROGRESS": "bg-amber-500 text-white",
  HOLD: "bg-violet-600 text-white",
  CLOSED: "bg-slate-700 text-white",
};
const DEFAULT_STATUS_STYLE = "bg-gray-300 text-gray-800";

const normalizeStatus = (value = "") =>
  String(value).trim().toUpperCase().replace(/[\s_]+/g, "-");

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  }

  return String(value);
};

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Section = ({ icon: Icon, title, children }) => (
  <section className="overflow-hidden rounded-lg border border-[#cbe1f4] bg-white">
    <div className="flex items-center gap-2 bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-3 text-white">
      <Icon size={17} />
      <h2 className="text-sm font-bold">{title}</h2>
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </section>
);

const ResponseSection = ({ existingResponse, respondedAt, disabled, onSubmit }) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const handleSend = async () => {
    const message = text.trim();
    if (!message) return;

    try {
      setSending(true);
      setSendError("");
      await onSubmit(message);
      setText("");
    } catch (err) {
      setSendError(
        err?.response?.data?.message || err?.message || "Failed to send response.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Section icon={MessageSquareText} title="Response">
      {existingResponse ? (
        <div className="mb-5 rounded-lg border border-[#e2e8ee] bg-[#f9fbfc] p-4">
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#1e2b36]">
            {existingResponse}
          </p>
          <p className="mt-3 text-xs text-[#60738a]">
            Responded on {formatDateTime(respondedAt)}
          </p>
        </div>
      ) : (
        <p className="mb-5 text-sm text-[#60738a]">No response yet.</p>
      )}

      {disabled ? (
        <p className="text-sm text-[#60738a]">
          Responses are closed for this feedback.
        </p>
      ) : (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            placeholder="Write a response to this feedback..."
            disabled={sending}
            className="w-full rounded-lg border border-[#c9d5dd] p-3 text-sm outline-none focus:border-[#2c6b8a] focus:ring-2 focus:ring-[#2c6b8a]/20 disabled:opacity-60"
          />

          {sendError && (
            <p role="alert" className="text-sm text-rose-600">
              {sendError}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2c6b8a] px-4 text-sm font-semibold text-white hover:bg-[#245a75] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending && <LoaderCircle size={15} className="animate-spin" />}
              Send Response
            </button>
          </div>
        </div>
      )}
    </Section>
  );
};

const FeedbackDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getFeedbackById(id);

        if (response?.success === false) {
          throw new Error(response.message || "Failed to load feedback.");
        }

        setFeedback(response?.data ?? response);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load feedback details.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFeedback();
    } else {
      setError("Feedback ID is missing.");
      setLoading(false);
    }
  }, [id]);

 

  const fields = [
    ["Feedback ID", "fB_feedback_id"],
    ["Request Number", "fB_request_no"],
    ["Name", "fB_name"],
    ["Contact", "fB_contact"],
    ["User Type", "userTypeName"],
    ["Overall Experience", "fB_overall_experience"],
    ["What Was Useful", "fB_useful_text"],
    ["What Can Be Improved", "fB_improve_text"],
    ["Suggestions", "fB_suggestions"],
    ["Created At", "fB_created_at"],
  ];

  const pageShell = "min-h-full bg-[#f7f9fb] text-[#1e2b36]";
  const card = "mx-auto max-w-[1500px] rounded-xl border border-[#e2e8ee] bg-white p-4 shadow-sm sm:p-5";
  const backButton =
    "grid h-10 w-10 place-items-center rounded-lg border border-[#c9d5dd] bg-white text-[#2c6b8a] hover:bg-slate-50";

  if (loading) {
    return (
      <div className={pageShell}>
        <div className={`${card} flex min-h-64 items-center justify-center gap-3 text-[#60738a]`}>
          <LoaderCircle className="animate-spin text-[#2c6b8a]" size={22} />
          Loading feedback details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={pageShell}>
        <div className={`${card} flex flex-col gap-3 border-rose-200 bg-rose-50 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between`}>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-rose-200 bg-white px-4 py-2 font-semibold hover:bg-rose-100"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className={pageShell}>
        <div className={`${card} text-[#60738a]`}>Feedback not found.</div>
      </div>
    );
  }

  const rating = Math.min(5, Math.max(0, Number(feedback.fB_rating) || 0));
  const statusKey = normalizeStatus(feedback.statusName);
  const statusLabel = statusKey || "UNKNOWN";
  const statusStyle = STATUS_STYLES[statusKey] ?? DEFAULT_STATUS_STYLE;
  const isClosed = statusKey === "CLOSED";

  return (
    <div className={pageShell}>
      <div className={`${card} space-y-5`}>
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className={backButton}
            >
              <ChevronsLeft size={18} />
            </button>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#2c6b8a]">
                Feedback Details
              </h1>
             
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-sm ${statusStyle}`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Rating */}
        <Section icon={Star} title="Rating">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                size={22}
                className={
                  value <= rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-300"
                }
              />
            ))}
            <span className="ml-2 text-sm text-[#60738a]">
              {rating > 0 ? `${rating}/5` : "No rating"}
            </span>
          </div>
        </Section>

        {/* Details */}
        <Section icon={ClipboardList} title="Feedback Information">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {fields.map(([label, key]) => (
              <div key={key} className="min-w-0">
                <p className="mb-1.5 text-sm text-[#60738a]">{label}</p>
                <p className="whitespace-pre-wrap break-words text-sm font-medium text-[#1e2b36]">
                  {formatValue(feedback[key])}
                </p>
              </div>
            ))}
          </div>
        </Section>

    
      </div>
    </div>
  );
};

export default FeedbackDetails;