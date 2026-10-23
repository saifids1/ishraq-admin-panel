import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronsLeft,
  Clock3,
  Loader2,
  LoaderCircle,
  PauseCircle,
  CheckCircle2,
  ShieldAlert,Star,
} from "lucide-react";

import { getFeedbackById } from "../../../api/feedbackApi";

const ACCENT = "#2f6b8a";

/* ------------------------- STATUS TONES ------------------------- */
/* Mirrors ComplaintDetails / CareerEnquiryList palette. */

const REQUEST_STATUS_TONES = {
  new: {
    badge: "bg-sky-600 ring-sky-700 shadow-sky-600/20",
    icon: Clock3,
  },
  inprogress: {
    badge: "bg-indigo-600 ring-indigo-700 shadow-indigo-600/20",
    icon: Loader2,
  },
  hold: {
    badge: "bg-amber-500 ring-amber-600 shadow-amber-500/20",
    icon: PauseCircle,
  },
  closed: {
    badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20",
    icon: CheckCircle2,
  },
};

const NEUTRAL_TONE = {
  badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20",
  icon: ShieldAlert,
};

const BADGE_BASE =
  "inline-flex h-7 min-w-[110px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[15px] text-white ring-1 ring-inset whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

const normalizeRequestStatus = (value) => {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (!raw) return null;
  if (raw === "new") return "new";
  if (
    ["open", "inprogress", "inprocess", "processing", "ongoing"].includes(raw)
  )
    return "inprogress";
  if (["hold", "onhold", "paused", "pending"].includes(raw)) return "hold";
  if (["closed", "close", "completed", "done", "resolved"].includes(raw))
    return "closed";
  return null;
};

const requestToneOf = (value) => {
  const key = normalizeRequestStatus(value);
  if (!key) return { ...NEUTRAL_TONE, key: null };
  return { ...REQUEST_STATUS_TONES[key], key };
};

/* ------------------------- HELPERS ------------------------- */

const FIELD_LABEL = "text-[13px] font-semibold text-black leading-tight";

const formatDate = (value) => {
  if (!value) return "—";
  const normalized = String(value).replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year}, ${hours}:${minutes}`;
};

const viewValue = (value) =>
  value === null || value === undefined || String(value).trim() === ""
    ? "—"
    : value;

/* ------------------------- FIELD COMPONENTS ------------------------- */

const FieldRow = ({ label, children, fullWidth }) => (
  <div
    className={`grid grid-cols-[160px_1fr] items-start gap-3 ${
      fullWidth ? "md:col-span-2" : ""
    }`}
  >
    <span className={`${FIELD_LABEL} pt-2`}>{label}</span>
    <div className="min-w-0">{children}</div>
  </div>
);

const ValueBox = ({ children, multiline }) => (
  <div
    className={`flex ${
      multiline ? "min-h-[72px] items-start" : "min-h-9 items-center"
    } rounded-md border border-[#e3e8ee] bg-[#fbfcfd] px-3 py-2 text-[13px] font-medium text-[#1a2b3c]`}
  >
    <span className="min-w-0 flex-1 break-words">{children}</span>
  </div>
);

/* ------------------------- COMPONENT ------------------------- */

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

        if (!id) throw new Error("Feedback ID is missing.");

        const response = await getFeedbackById(id);
        const apiResponse = response?.data ?? response;

        if (
          apiResponse?.success === false ||
          apiResponse?.Success === false
        ) {
          throw new Error(
            apiResponse.message ||
              apiResponse.Message ||
              "Failed to load feedback details.",
          );
        }

        const payload = apiResponse?.data ?? apiResponse;
        const records = payload?.data ?? payload;

        let record = null;

        if (Array.isArray(records)) {
          record = records.find(
            (item) => String(item?.fB_feedback_id) === String(id),
          );
          if (!record && records.length === 1) record = records[0];
        } else if (
          records &&
          typeof records === "object" &&
          !Array.isArray(records) &&
          records.fB_feedback_id !== undefined
        ) {
          record = records;
        }

        if (!record) {
          throw new Error(
            "Feedback not found. Please check the feedback ID.",
          );
        }

        if (!cancelled) setFeedback(record);
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

    fetchFeedback();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ------------------------- LOADING ------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#f4f8fb] p-6">
        <div className="flex items-center gap-3 text-sm text-slate-700">
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

  /* ------------------------- ERROR ------------------------- */

  if (error || !feedback) {
    return (
      <div className="min-h-full bg-[#f4f8fb] p-4">
        <div className="mx-auto">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex justify-between border-b border-slate-200 px-6 py-4">
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
                  Feedback Details
                </h2>
              </div>
            </div>

            <div className="p-4">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                {error || "Feedback not found."}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------- DERIVED ------------------------- */

  const reqTone = requestToneOf(feedback.statusName);
  const StatusIcon = reqTone.icon;

  const rating = Math.min(
    5,
    Math.max(0, Number(feedback.fB_rating) || 0),
  );

  const adminResponse = feedback.fb_responseRetun;

  /* ------------------------- RENDER ------------------------- */

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Header bar */}
          <div className="flex justify-between border-b border-slate-200 px-6 py-4">
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
                Feedback Details
              </h2>
            </div>

            <span className={`${BADGE_BASE} ${reqTone.badge}`}>
              
              {feedback.statusName || "UNKNOWN"}
            </span>
          </div>

          <div className="p-4">
            <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-4">
              {/* Summary */}
              <section>
                <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                  Summary
                </h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                

                  <FieldRow label="Request Id">
                    <ValueBox>{viewValue(feedback.fB_request_no)}</ValueBox>
                  </FieldRow>

                  <FieldRow label="Submitted On">
                    <ValueBox>{formatDate(feedback.fB_created_at)}</ValueBox>
                  </FieldRow>
                </div>
              </section>

              {/* Submitter Information */}
              <section>
                <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                  Submitter Information
                </h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow label="Name ">
                    <ValueBox>{viewValue(feedback.fB_name)}</ValueBox>
                  </FieldRow>

                  <FieldRow label="User Type">
                    <ValueBox>{viewValue(feedback.userTypeName)}</ValueBox>
                  </FieldRow>

                  <FieldRow label="Contact / Email">
                    <ValueBox>{viewValue(feedback.fB_contact)}</ValueBox>
                  </FieldRow>
                </div>
              </section>

              {/* Rating */}
              <section>
                <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                  Rating
                </h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow label="Rating" fullWidth>
                    <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-[#e3e8ee] bg-[#fbfcfd] px-3 py-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Star
                          key={value}
                          size={18}
                          className={
                            value <= rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300"
                          }
                        />
                      ))}

                      <span className="ml-2 text-[13px] font-medium text-[#1a2b3c]">
                        {rating > 0 ? `${rating}/5` : "No rating"}
                      </span>
                    </div>
                  </FieldRow>
                </div>
              </section>

              {/* Feedback Content */}
              <section>
                <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                  Feedback Content
                </h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow label="Overall Experience" fullWidth>
                    <ValueBox multiline>
                      {viewValue(feedback.fB_overall_experience)}
                    </ValueBox>
                  </FieldRow>

                  <FieldRow label="What Was Useful" fullWidth>
                    <ValueBox multiline>
                      {viewValue(feedback.fB_useful_text)}
                    </ValueBox>
                  </FieldRow>

                  <FieldRow label="What Can Be Improved" fullWidth>
                    <ValueBox multiline>
                      {viewValue(feedback.fB_improve_text)}
                    </ValueBox>
                  </FieldRow>

                  <FieldRow label="Suggestions" fullWidth>
                    <ValueBox multiline>
                      {viewValue(feedback.fB_suggestions)}
                    </ValueBox>
                  </FieldRow>
                </div>
              </section>

              {/* Admin Response */}
              <section>
                <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                  Admin Response
                </h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow label="Response Status">
                    <ValueBox>{viewValue(feedback.statusName)}</ValueBox>
                  </FieldRow>

                  <FieldRow label="Response" fullWidth>
                    <ValueBox multiline>
                      {adminResponse?.trim()
                        ? adminResponse
                        : "No response has been provided yet."}
                    </ValueBox>
                  </FieldRow>
                </div>
              </section>

              {/* Record Information */}
              <section>
                <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                  Record Information
                </h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow label="Created At">
                    <ValueBox>{formatDate(feedback.fB_created_at)}</ValueBox>
                  </FieldRow>
                </div>
              </section>
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
        </div>
      </div>
    </div>
  );
};

export default FeedbackDetails;