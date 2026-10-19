import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, LoaderCircle, Mail, MessageSquareText, Plus, Star } from "lucide-react";

import { submitFeedback } from "../../../api/feedbackApi";
import { getCurrentUserId } from "../../../utils/authUtils";
import {
  ACCENT,
  Card,
  Field,
  IconField,
  PageHeader,
  inputClass,
} from "../../../components/common/FormUi";

const initialForm = {
  rating: 0,
  overallExperience: "",
  usefulText: "",
  improveText: "",
  suggestions: "",
};

const textareaClass = (errors, field) => `${inputClass(Boolean(errors[field]), false)} resize-y`;


const CreateFeedback = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [organizationName] = useState(
    () => localStorage.getItem("organizationName") || "",
  );
  const [email] = useState(() => localStorage.getItem("employerEmail") || "");

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const found = {};

    if (!form.rating) found.rating = "Select a rating.";
    if (!form.overallExperience.trim()) {
      found.overallExperience = "Enter your overall experience.";
    }

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const rawUserId = getCurrentUserId();
    const userId = Number(rawUserId);

    if (!rawUserId || !Number.isInteger(userId) || userId <= 0) {
      setErrors({
        form: "Unable to identify the logged-in user. Please log in again.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        fB_name: organizationName,
        fB_contact: email,
        fB_user_type_id: 2,
        fB_rating: Number(form.rating),
        fb_requester_id: userId,
        fB_overall_experience: form.overallExperience.trim(),
        fB_useful_text: form.usefulText.trim(),
        fB_improve_text: form.improveText.trim(),
        fB_suggestions: form.suggestions.trim(),
      };

      const result = await submitFeedback(payload);

      if (result?.success === false || result?.Success === false) {
        throw new Error(
          result.message || result.Message || "Failed to submit feedback.",
        );
      }

      navigate("/employer/feedback-list", { replace: true });
    } catch (err) {
      setErrors({
        form:
          err.response?.data?.message ||
          err.response?.data?.Message ||
          err.message ||
          "Unable to submit feedback. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm(initialForm);
    setErrors({});
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="bg-white text-slate-800">
        <PageHeader title="Add Your Feedback" onBack={() => navigate(-1)} />
        <Card title="Thank You" icon={MessageSquareText}>
          <div className="py-6 text-center">
            <h2 className="text-xl font-semibold text-slate-900">
              Thanks for your feedback
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Your message has been sent to our team.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              Send more feedback
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white text-slate-800">
      <PageHeader title="Add Your Feedback" onBack={() => navigate(-1)} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4">
          <Card title="Organization" icon={Building2}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Organization Name" htmlFor="organizationName">
                <IconField icon={Building2}>
                  <input
                    id="organizationName"
                    value={organizationName}
                    readOnly
                    className={`${inputClass(false)} bg-slate-50`}
                  />
                </IconField>
              </Field>

              <Field label="Email Address" htmlFor="email">
                <IconField icon={Mail}>
                  <input
                    id="email"
                    value={email}
                    readOnly
                    className={`${inputClass(false)} bg-slate-50`}
                  />
                </IconField>
              </Field>
            </div>
          </Card>

          <Card title="Rating" icon={Star}>
            <Field label="Overall Rating" required error={errors.rating}>
              <div
                className="flex gap-2"
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
                    onClick={() => update("rating", n)}
                    className={`rounded px-2 py-1 text-2xl ${
                      n <= form.rating ? "text-amber-400" : "text-gray-300"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </Field>
          </Card>

          <Card title="Your Feedback" icon={MessageSquareText}>
            <div className="grid grid-cols-1 gap-4">
              <Field
                label="Overall Experience"
                htmlFor="overallExperience"
                required
                error={errors.overallExperience}
              >
                <textarea
                  id="overallExperience"
                  rows={3}
                  value={form.overallExperience}
                  onChange={(e) => update("overallExperience", e.target.value)}
                  placeholder="Describe your overall experience"
                  className={textareaClass(errors, "overallExperience")}
                />
              </Field>

              <Field label="What did you find useful?" htmlFor="usefulText" error={errors.usefulText}>
                <textarea
                  id="usefulText"
                  rows={3}
                  value={form.usefulText}
                  onChange={(e) => update("usefulText", e.target.value)}
                  placeholder="What worked well?"
                  className={textareaClass(errors, "usefulText")}
                />
              </Field>

              <Field label="What can we improve?" htmlFor="improveText" error={errors.improveText}>
                <textarea
                  id="improveText"
                  rows={3}
                  value={form.improveText}
                  onChange={(e) => update("improveText", e.target.value)}
                  placeholder="Share your suggestions for improvement"
                  className={textareaClass(errors, "improveText")}
                />
              </Field>

              <Field label="Additional Suggestions" htmlFor="suggestions" error={errors.suggestions}>
                <textarea
                  id="suggestions"
                  rows={3}
                  value={form.suggestions}
                  onChange={(e) => update("suggestions", e.target.value)}
                  placeholder="Any other suggestions?"
                  className={textareaClass(errors, "suggestions")}
                />
              </Field>
            </div>
          </Card>
        </div>

        {errors.form && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {errors.form}
          </div>
        )}

        <div className="mt-4 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={submitting}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {submitting ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            {submitting ? "Sending..." : "Send Feedback"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateFeedback;