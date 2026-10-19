import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Hash,
  LoaderCircle,
  Lightbulb,
  MessageSquareText,
  Phone,
  Star,
  Tag,
  User,
  Wrench,
  ThumbsUp,
} from "lucide-react";

import { getFeedbackById } from "../../../api/feedbackApi";
import {
  ACCENT,
  Card,
  Field,
  PageHeader,
  ReadOnlyValue,
} from "../../../components/common/FormUi";

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

const INFO_FIELDS = [
  // { label: "Feedback ID", key: "fB_feedback_id", icon: Hash },
  { label: "Request Number", key: "fB_request_no", icon: FileText },
  { label: "Name", key: "fB_name", icon: User },
  { label: "Contact", key: "fB_contact", icon: Phone },
  { label: "User Type", key: "userTypeName", icon: Tag },
  { label: "Created At", key: "fB_created_at", icon: CalendarDays },
];

const CONTENT_FIELDS = [
  { label: "Overall Experience", key: "fB_overall_experience", icon: MessageSquareText },
  { label: "What Was Useful", key: "fB_useful_text", icon: ThumbsUp },
  { label: "What Can Be Improved", key: "fB_improve_text", icon: Wrench },
  { label: "Suggestions", key: "fB_suggestions", icon: Lightbulb },
];

export default function FeedbackDetails() {
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white p-6">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <LoaderCircle className="animate-spin" style={{ color: ACCENT }} size={20} />
          Loading feedback details...
        </div>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="min-h-full bg-white p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Go Back
        </button>
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-5 text-red-700 shadow-sm">
          <h1 className="font-semibold">Could not load feedback</h1>
          <p className="mt-1 text-sm">{error || "Feedback not found."}</p>
        </div>
      </div>
    );
  }

  const rating = Math.min(5, Math.max(0, Number(feedback.fB_rating) || 0));
  const statusKey = normalizeStatus(feedback.statusName);
  const statusLabel = statusKey || "UNKNOWN";
  const statusStyle = STATUS_STYLES[statusKey] ?? DEFAULT_STATUS_STYLE;

  return (
    <div className="min-h-full bg-white text-slate-800">
      <PageHeader
        title="Feedback Details"
        onBack={() => navigate(-1)}
        right={
          <span
            className={`inline-flex w-fit items-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-sm ${statusStyle}`}
          >
            {statusLabel}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4">
        <Card title="Rating" icon={Star}>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                size={22}
                className={
                  value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                }
              />
            ))}
            <span className="ml-2 text-sm text-slate-600">
              {rating > 0 ? `${rating}/5` : "No rating"}
            </span>
          </div>
        </Card>

        <Card title="Feedback Information" icon={ClipboardList}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {INFO_FIELDS.map(({ label, key, icon }) => (
              <Field key={key} label={label}>
                <ReadOnlyValue icon={icon}>{formatValue(feedback[key])}</ReadOnlyValue>
              </Field>
            ))}
          </div>
        </Card>

        <Card title="Feedback Content" icon={MessageSquareText}>
          <div className="grid grid-cols-1 gap-4">
            {CONTENT_FIELDS.map(({ label, key }) => (
              <Field key={key} label={label}>
                <ReadOnlyValue multiline>{formatValue(feedback[key])}</ReadOnlyValue>
              </Field>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}