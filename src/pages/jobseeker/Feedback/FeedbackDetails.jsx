import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  FileText,
  Hash,
  LoaderCircle,
  Lightbulb,
  MessageSquareText,
  Phone,
  Star,
  Tag,
  UserRound,
  Wrench,
  ThumbsUp,
  ShieldCheck,
} from "lucide-react";

import { getFeedbackById } from "../../../api/feedbackApi";

import {
  ACCENT,
  Card,
  PageHeader,
  ReadOnlyValue,
} from "../../../components/common/FormUi";

const STATUS_STYLES = {
  NEW: "bg-blue-600 text-white",
  OPEN: "bg-emerald-600 text-white",
  "IN-PROGRESS": "bg-amber-500 text-white",
  HOLD: "bg-violet-600 text-white",
  CLOSED: "bg-slate-700 text-white",
};

const DEFAULT_STATUS_STYLE = "bg-gray-300 text-gray-800";

const LABEL_CLASS =
  "w-full text-sm font-medium text-black sm:w-48 sm:min-w-48 sm:shrink-0 sm:pt-2";

const normalizeStatus = (value = "") =>
  String(value).trim().toUpperCase().replace(/[\s_]+/g, "-");

const formatDate = (value) => {
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

const or = (value) =>
  value !== null &&
  value !== undefined &&
  String(value).trim() !== ""
    ? value
    : "-";

// Reusable horizontal label and value layout.
const DetailField = ({ label, children, className = "" }) => (
  <div
    className={`flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-5 ${className}`}
  >
    <span className={LABEL_CLASS}>{label}</span>

    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

const FeedbackDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchFeedback = async () => {
      try {
        setLoading(true);
        setError("");
        setFeedback(null);

        if (!id) {
          throw new Error("Feedback ID is missing.");
        }

        const response = await getFeedbackById(id);

        if (
          response?.success === false ||
          response?.Success === false
        ) {
          throw new Error(
            response?.message ||
              response?.Message ||
              "Failed to load feedback."
          );
        }

        // Supports both Axios responses and direct API response objects.
        const payload = response?.data ?? response;

        // API may return { success, message, data: feedbackRecord }.
        const record = payload?.data ?? payload;

        if (
          !record ||
          typeof record !== "object" ||
          Array.isArray(record) ||
          record.fB_feedback_id == null
        ) {
          throw new Error("Feedback record not found.");
        }

        if (!cancelled) {
          setFeedback(record);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.Message ||
              err?.message ||
              "Failed to load feedback details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchFeedback();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white p-6">
        <div className="flex items-center gap-3 text-sm text-black">
          <LoaderCircle
            className="animate-spin"
            style={{ color: ACCENT }}
            size={20}
          />
          Loading feedback details...
        </div>
      </div>
    );
  }

  // Error state
  if (error || !feedback) {
    return (
      <div className="min-h-full bg-white p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-slate-50"
        >
          Go Back
        </button>

        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-5 text-red-700 shadow-sm">
          <h1 className="font-semibold">
            Could Not Load Feedback
          </h1>

          <p className="mt-1 text-sm">
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

  const adminResponse = feedback.fb_responseRetun;

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
        {/* Summary */}
        <Card title="Summary" icon={FileText}>
          <div className="flex flex-col gap-5">
            <DetailField label="Feedback ID">
              <ReadOnlyValue icon={Hash}>
                {or(feedback.fB_feedback_id)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="Request Number">
              <ReadOnlyValue icon={FileText}>
                {or(feedback.fB_request_no)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="Submitted On">
              <ReadOnlyValue icon={CalendarDays}>
                {formatDate(feedback.fB_created_at)}
              </ReadOnlyValue>
            </DetailField>
          </div>
        </Card>

        {/* Submitter Information */}
        <Card title="Submitter Information" icon={UserRound}>
          <div className="flex flex-col gap-5">
            <DetailField label="Name / Organization">
              <ReadOnlyValue icon={UserRound}>
                {or(feedback.fB_name)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="User Type">
              <ReadOnlyValue icon={Tag}>
                {or(feedback.userTypeName)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="Contact / Email">
              <ReadOnlyValue icon={Phone}>
                {or(feedback.fB_contact)}
              </ReadOnlyValue>
            </DetailField>
          </div>
        </Card>

        {/* Rating */}
        <Card title="Rating" icon={Star}>
          <DetailField label="Rating">
            <div className="flex flex-wrap items-center gap-1 sm:pt-1">
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

              <span className="ml-2 text-sm text-black">
                {rating > 0 ? `${rating}/5` : "No rating"}
              </span>
            </div>
          </DetailField>
        </Card>

        {/* Feedback Content */}
        <Card title="Feedback Content" icon={MessageSquareText}>
          <div className="flex flex-col gap-5">
            <DetailField label="Overall Experience">
              <ReadOnlyValue icon={MessageSquareText} multiline>
                {or(feedback.fB_overall_experience)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="What Was Useful">
              <ReadOnlyValue icon={ThumbsUp} multiline>
                {or(feedback.fB_useful_text)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="What Can Be Improved">
              <ReadOnlyValue icon={Wrench} multiline>
                {or(feedback.fB_improve_text)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="Suggestions">
              <ReadOnlyValue icon={Lightbulb} multiline>
                {or(feedback.fB_suggestions)}
              </ReadOnlyValue>
            </DetailField>
          </div>
        </Card>

        {/* Admin Response */}
        <Card title="Admin Response" icon={ShieldCheck}>
          <div className="flex flex-col gap-5">
            <DetailField label="Response Status">
              <ReadOnlyValue icon={Tag}>
                {or(feedback.statusName)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="Response">
              <ReadOnlyValue multiline>
                {adminResponse?.trim()
                  ? adminResponse
                  : "No response has been provided yet."}
              </ReadOnlyValue>
            </DetailField>
          </div>
        </Card>

        {/* Record Information */}
        <Card title="Record Information" icon={CalendarDays}>
          <DetailField label="Created At">
            <ReadOnlyValue icon={CalendarDays}>
              {formatDate(feedback.fB_created_at)}
            </ReadOnlyValue>
          </DetailField>
        </Card>
      </div>
    </div>
  );
};

export default FeedbackDetails;