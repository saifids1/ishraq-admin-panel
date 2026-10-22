
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  LoaderCircle,
  Lightbulb,
  MessageSquareText,
  Phone,
  Star,
  Tag,
  User,
  Wrench,
  ThumbsUp,
  ArrowLeft,
} from "lucide-react";

import { getFeedbackById } from "../../../api/feedbackApi";
import {
  ACCENT,
  Card,
  PageHeader,
} from "../../../components/common/FormUi";

// Status colors
const STATUS_STYLES = {
  NEW: "bg-blue-600 text-white",
  OPEN: "bg-emerald-600 text-white",
  "IN-PROGRESS": "bg-amber-500 text-white",
  HOLD: "bg-violet-600 text-white",
  CLOSED: "bg-slate-700 text-white",
};

const DEFAULT_STATUS_STYLE = "bg-gray-200 text-black";

const normalizeStatus = (value = "") =>
  String(value).trim().toUpperCase().replace(/[\s_]+/g, "-");

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

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
  {
    label: "Request Number",
    key: "fB_request_no",
    icon: FileText,
  },
  {
    label: "Name",
    key: "fB_name",
    icon: User,
  },
  {
    label: "Contact",
    key: "fB_contact",
    icon: Phone,
  },
  {
    label: "User Type",
    key: "userTypeName",
    icon: Tag,
  },
  {
    label: "Created At",
    key: "fB_created_at",
    icon: CalendarDays,
  },
];

const CONTENT_FIELDS = [
  {
    label: "Overall Experience",
    key: "fB_overall_experience",
    icon: MessageSquareText,
  },
  {
    label: "What Was Useful",
    key: "fB_useful_text",
    icon: ThumbsUp,
  },
  {
    label: "What Can Be Improved",
    key: "fB_improve_text",
    icon: Wrench,
  },
  {
    label: "Suggestions",
    key: "fB_suggestions",
    icon: Lightbulb,
  },
];

// Label and value displayed side by side
function DetailField({ label, value, icon: Icon, multiline = false }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 border-b border-slate-100 py-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex w-full shrink-0 items-center gap-2 sm:w-48">
        {Icon && (
          <Icon
            size={16}
            className="shrink-0 text-black"
            aria-hidden="true"
          />
        )}

        <span className="text-[14px] font-medium text-black">
          {label}
        </span>
      </div>

      <div
        className={`min-w-0 flex-1 text-[14px] text-black ${
          multiline ? "whitespace-pre-wrap break-words" : "break-words"
        }`}
      >
        {formatValue(value)}
      </div>
    </div>
  );
}

export default function FeedbackDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchFeedback = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getFeedbackById(id);

        if (response?.success === false) {
          throw new Error(
            response.message || "Failed to load feedback."
          );
        }

        const result = response?.data?.data ?? response?.data ?? response;

        if (!result || typeof result !== "object") {
          throw new Error("Feedback not found.");
        }

        if (isMounted) {
          setFeedback(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load feedback details."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchFeedback();
    } else {
      setError("Feedback ID is missing.");
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white p-6">
        <div className="flex items-center gap-3 text-[14px] text-black">
          <LoaderCircle
            className="animate-spin"
            style={{ color: ACCENT }}
            size={20}
          />
          <span>Loading feedback details...</span>
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
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-black transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>

        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-5 text-black shadow-sm">
          <h1 className="text-[14px] font-semibold">
            Could Not Load Feedback
          </h1>

          <p className="mt-2 text-[14px] text-black">
            {error || "Feedback not found."}
          </p>
        </div>
      </div>
    );
  }

  const rating = Math.min(
    5,
    Math.max(0, Number(feedback.fB_rating) || 0)
  );

  const statusKey = normalizeStatus(feedback.statusName);
  const statusLabel = statusKey || "UNKNOWN";
  const statusStyle =
    STATUS_STYLES[statusKey] ?? DEFAULT_STATUS_STYLE;

  return (
    <div className="min-h-full bg-white text-black">
      <PageHeader
        title="Feedback Details"
        onBack={() => navigate(-1)}
        right={
          <span
            className={`inline-flex w-fit items-center rounded-full px-4 py-1.5 text-[14px] font-semibold ${statusStyle}`}
          >
            {statusLabel}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4">
        {/* Rating */}
        <Card title="Rating" icon={Star}>
          <div className="flex flex-wrap items-center gap-1">
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

            <span className="ml-2 text-[14px] text-black">
              {rating > 0 ? `${rating}/5` : "No Rating"}
            </span>
          </div>
        </Card>

        {/* Feedback Information */}
        <Card title="Feedback Information" icon={ClipboardList}>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {INFO_FIELDS.map(({ label, key, icon }) => (
              <DetailField
                key={key}
                label={label}
                value={
                  key === "fB_created_at"
                    ? formatDateTime(feedback[key])
                    : feedback[key]
                }
                icon={icon}
              />
            ))}
          </div>
        </Card>

        {/* Feedback Content */}
        <Card title="Feedback Content" icon={MessageSquareText}>
          <div className="grid grid-cols-1 gap-x-8">
            {CONTENT_FIELDS.map(({ label, key, icon }) => (
              <DetailField
                key={key}
                label={label}
                value={feedback[key]}
                icon={icon}
                multiline
              />
            ))}
          </div>
        </Card>

        {/* Back Button */}
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-black transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
