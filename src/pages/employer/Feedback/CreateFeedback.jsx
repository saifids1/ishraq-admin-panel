import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronsLeft, LoaderCircle, Plus, Star } from "lucide-react";

import { submitFeedback } from "../../../api/feedbackApi";
import { getCurrentUserId } from "../../../utils/authUtils";
import StatusModal from "../../../components/common/StatusModal";

const LIST_PATH = "/employer/feedback-list";
const FEEDBACK_USER_TYPE_ID = 2;

const FIELD_LABEL = "text-[13px] font-semibold text-black leading-tight";

const inputClass = (hasError) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500 ${
    hasError ? "border-red-400" : "border-slate-300"
  }`;

const initialForm = {
  rating: 0,
  overallExperience: "",
  usefulText: "",
  improveText: "",
  suggestions: "",
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  "Unable to submit feedback. Please try again.";

/* ---------------- Layout helpers (same as EditJobSeeker) ---------------- */

const SectionTitle = ({ children }) => (
  <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
    {children}
  </h3>
);

const FieldRow = ({ label, required, error, fullWidth, children }) => (
  <div
    className={`grid grid-cols-[160px_1fr] items-start gap-3 ${
      fullWidth ? "md:col-span-2" : ""
    }`}
  >
    <label className={`${FIELD_LABEL} pt-2`}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="min-w-0">
      {children}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </div>
  </div>
);

/* ========================================================= */

export default function CreateFeedback() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState(null);

  const [organizationName] = useState(
    () => localStorage.getItem("organizationName") || "",
  );
  const [email] = useState(() => localStorage.getItem("employerEmail") || "");

  /* ---------- modal helpers (same pattern as EditJobSeeker) ---------- */

  const openStatus = (type, message, extra = {}) => {
    setModal({
      type,
      title: extra.title,
      message,
      confirmText: extra.confirmText || "OK",
      showCancel: false,
      onConfirm: () => {
        setModal(null);
        extra.onConfirm?.();
      },
      onCancel: () => setModal(null),
    });
  };

  const openConfirm = ({ title, message, confirmText, onConfirm }) => {
    setModal({
      type: "confirm",
      title,
      message,
      confirmText: confirmText || "Confirm",
      cancelText: "Cancel",
      showCancel: true,
      onConfirm: () => {
        setModal(null);
        onConfirm?.();
      },
      onCancel: () => setModal(null),
    });
  };

  /* ---------- field change ---------- */

  const update = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  /* ---------- save ---------- */

  const save = async (payload) => {
    setSubmitting(true);

    try {
      const result = await submitFeedback(payload);

      if (result?.success === false || result?.Success === false) {
        throw new Error(
          result?.message || result?.Message || "Failed to submit feedback.",
        );
      }

      openStatus(
        "update",
        result?.message || result?.Message || "Thank you. Your feedback has been submitted.",
        {
          confirmText: "Continue",
          onConfirm: () => navigate(LIST_PATH, { replace: true }),
        },
      );
    } catch (error) {
      openStatus("error", getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- submit ---------- */

  const submit = (event) => {
    event.preventDefault();
    if (submitting) return;

    const found = {};
    if (!form.rating) found.rating = "Select a rating.";
    if (!form.overallExperience.trim()) {
      found.overallExperience = "Enter your overall experience.";
    }

    setErrors(found);

    if (Object.keys(found).length > 0) {
      openStatus("warning", Object.values(found)[0]);
      return;
    }

    const rawUserId = getCurrentUserId();
    const userId = Number(rawUserId);

    if (!rawUserId || !Number.isInteger(userId) || userId <= 0) {
      openStatus(
        "error",
        "Unable to identify the logged-in user. Please log in again.",
      );
      return;
    }

    const payload = {
      fB_name: organizationName,
      fB_contact: email,
      fB_user_type_id: FEEDBACK_USER_TYPE_ID,
      fB_rating: Number(form.rating),
      fb_requester_id: userId,
      fB_overall_experience: form.overallExperience.trim(),
      fB_useful_text: form.usefulText.trim(),
      fB_improve_text: form.improveText.trim(),
      fB_suggestions: form.suggestions.trim(),
    };

    openConfirm({
      title: "Confirm submission",
      message: "Are you sure you want to send this feedback?",
      confirmText: "Send",
      onConfirm: () => save(payload),
    });
  };

  /* ----------------------------- UI ----------------------------- */

  const modalElement = (
    <StatusModal
      isOpen={Boolean(modal)}
      type={modal?.type}
      title={modal?.title}
      message={modal?.message}
      confirmText={modal?.confirmText}
      cancelText={modal?.cancelText}
      showCancel={modal?.showCancel}
      busy={submitting}
      onConfirm={modal?.onConfirm}
      onCancel={modal?.onCancel}
    />
  );

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* HEADER */}
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
              <h2 className="font-semibold text-slate-800">Add Your Feedback</h2>
            </div>
          </div>

          <form
            onSubmit={submit}
            noValidate
            autoComplete="off"
            className="space-y-6 p-4"
          >
            {/* ORGANIZATION */}
            <section>
              <SectionTitle>Organization</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow label="Organization Name">
                  <input
                    type="text"
                    value={organizationName}
                    readOnly
                    className={`${inputClass(false)} bg-slate-50`}
                  />
                </FieldRow>

                <FieldRow label="Email Address">
                  <input
                    type="text"
                    value={email}
                    readOnly
                    className={`${inputClass(false)} bg-slate-50`}
                  />
                </FieldRow>
              </div>
            </section>

            {/* RATING */}
            <section>
              <SectionTitle>Rating</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow label="Overall Rating" required error={errors.rating}>
                  <div
                    className="flex gap-1"
                    role="radiogroup"
                    aria-label="Overall rating"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={form.rating === n}
                        aria-label={`${n} out of 5 stars`}
                        disabled={submitting}
                        onClick={() => update("rating", n)}
                        className="rounded p-1 transition hover:scale-110 disabled:opacity-60"
                      >
                        <Star
                          size={26}
                          className={
                            n <= form.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300"
                          }
                        />
                      </button>
                    ))}
                  </div>
                </FieldRow>
              </div>
            </section>

            {/* FEEDBACK */}
            <section>
              <SectionTitle>Your Feedback</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow
                  label="Overall Experience"
                  required
                  error={errors.overallExperience}
                  fullWidth
                >
                  <textarea
                    rows={3}
                    value={form.overallExperience}
                    disabled={submitting}
                    onChange={(e) => update("overallExperience", e.target.value)}
                    placeholder="Describe your overall experience"
                    className={`${inputClass(Boolean(errors.overallExperience))} resize-y`}
                  />
                </FieldRow>

                <FieldRow label="What did you find useful?" fullWidth>
                  <textarea
                    rows={3}
                    value={form.usefulText}
                    disabled={submitting}
                    onChange={(e) => update("usefulText", e.target.value)}
                    placeholder="What worked well?"
                    className={`${inputClass(false)} resize-y`}
                  />
                </FieldRow>

                <FieldRow label="What can we improve?" fullWidth>
                  <textarea
                    rows={3}
                    value={form.improveText}
                    disabled={submitting}
                    onChange={(e) => update("improveText", e.target.value)}
                    placeholder="Share your suggestions for improvement"
                    className={`${inputClass(false)} resize-y`}
                  />
                </FieldRow>

                <FieldRow label="Additional Suggestions" fullWidth>
                  <textarea
                    rows={3}
                    value={form.suggestions}
                    disabled={submitting}
                    onChange={(e) => update("suggestions", e.target.value)}
                    placeholder="Any other suggestions?"
                    className={`${inputClass(false)} resize-y`}
                  />
                </FieldRow>
              </div>
            </section>

            {/* FOOTER */}
            <div className="flex justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={submitting}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                
                {submitting ? "Sending..." : "Send Feedback"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {modalElement}
    </div>
  );
}