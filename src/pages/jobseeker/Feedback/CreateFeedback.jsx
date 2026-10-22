import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Plus,
  Star,
} from "lucide-react";

import jobseekerApi from "../../../api/Services/adjobseekerApi";
import { submitFeedback } from "../../../api/feedbackApi";
import { getCurrentUserId } from "../../../utils/authUtils";

import {
  ACCENT,
  Card,
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

const LABEL_CLASS =
  "w-full text-sm font-medium text-black sm:w-48 sm:min-w-48 sm:shrink-0";

const INPUT_WRAPPER_CLASS = "flex min-w-0 flex-1 flex-col gap-1";

const textareaClass = (errors, field) =>
  `${inputClass(Boolean(errors[field]), false)} w-full resize-y text-sm`;

const CreateFeedback = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [jobseeker, setJobseeker] = useState({
    name: "",
    mobile: "",
    email: "",
  });
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadJobseekerDetails = async () => {
      try {
        const userId = getCurrentUserId();

        if (
          !userId ||
          !Number.isInteger(Number(userId)) ||
          Number(userId) <= 0
        ) {
          throw new Error("Unable to identify the logged-in jobseeker.");
        }

        const response = await jobseekerApi.getById(userId);
        const record = response?.data?.data;

        if (!record) {
          throw new Error("Jobseeker details were not returned by the API.");
        }

        if (!cancelled) {
          setJobseeker({
            name: record.fullName || "",
            mobile: record.mobile || record.jB_whatsapp || "",
            email: record.email || record.userName || "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setErrors((prev) => ({
            ...prev,
            form:
              error.response?.data?.message ||
              error.message ||
              "Unable to load your profile details.",
          }));
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    };

    loadJobseekerDetails();

    return () => {
      cancelled = true;
    };
  }, []);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
      form: undefined,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loadingProfile || submitting) return;

    if (!jobseeker.name || !jobseeker.email) {
      setErrors({
        form:
          "Your name or email could not be loaded. Please try logging in again.",
      });
      return;
    }

    const found = {};

    if (!form.rating) {
      found.rating = "Select a rating.";
    }

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
        fB_name: jobseeker.name,
        fB_contact: jobseeker.email,
        fB_user_type_id: 1,
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
          result.message ||
            result.Message ||
            "Failed to submit feedback."
        );
      }

      navigate("/jobseeker/feedback-list", { replace: true });
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

  const renderField = ({
    id,
    label,
    required = false,
    error,
    children,
  }) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-5">
      <label
        htmlFor={id}
        className={`${LABEL_CLASS} sm:pt-2`}
      >
        {label}
        {required && <span className="ml-1 text-black">*</span>}
      </label>

      <div className={INPUT_WRAPPER_CLASS}>
        {children}
        {error && (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-white text-slate-800">
      <PageHeader
        title="Add Your Feedback"
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4">
          {/* Your Details */}
          <Card title="Your Details" icon={Building2}>
            <div className="flex flex-col gap-5">
              {renderField({
                id: "jobseekerName",
                label: "Full Name",
                children: (
                  <div className="relative">
                    <Building2
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-black"
                    />
                    <input
                      id="jobseekerName"
                      value={jobseeker.name}
                      readOnly
                      placeholder={
                        loadingProfile ? "Loading name..." : "Full name"
                      }
                      className={`${inputClass(false)} w-full bg-slate-50 pl-9 text-sm text-black`}
                    />
                  </div>
                ),
              })}

              {renderField({
                id: "jobseekerMobile",
                label: "Mobile Number",
                children: (
                  <div className="relative">
                    <MessageSquareText
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-black"
                    />
                    <input
                      id="jobseekerMobile"
                      value={jobseeker.mobile}
                      readOnly
                      placeholder={
                        loadingProfile
                          ? "Loading mobile..."
                          : "Mobile number"
                      }
                      className={`${inputClass(false)} w-full bg-slate-50 pl-9 text-sm text-black`}
                    />
                  </div>
                ),
              })}

              {renderField({
                id: "jobseekerEmail",
                label: "Email Address",
                children: (
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-black"
                    />
                    <input
                      id="jobseekerEmail"
                      type="email"
                      value={jobseeker.email}
                      readOnly
                      placeholder={
                        loadingProfile
                          ? "Loading email..."
                          : "Email address"
                      }
                      className={`${inputClass(false)} w-full bg-slate-50 pl-9 text-sm text-black`}
                    />
                  </div>
                ),
              })}
            </div>
          </Card>

          {/* Rating */}
          <Card title="Rating" icon={Star}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
              <span
                className={LABEL_CLASS}
                id="overallRatingLabel"
              >
                Overall Rating
                <span className="ml-1 text-black">*</span>
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div
                  className="flex items-center gap-1"
                  role="radiogroup"
                  aria-labelledby="overallRatingLabel"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={form.rating === n}
                      aria-label={`${n} out of 5 stars`}
                      onClick={() => update("rating", n)}
                      className={`rounded p-1 text-2xl transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                        n <= form.rating
                          ? "text-amber-400"
                          : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                {errors.rating && (
                  <p className="text-xs text-red-600" role="alert">
                    {errors.rating}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Feedback Fields */}
          <Card title="Your Feedback" icon={MessageSquareText}>
            <div className="flex flex-col gap-5">
              {renderField({
                id: "overallExperience",
                label: "Overall Experience",
                required: true,
                error: errors.overallExperience,
                children: (
                  <textarea
                    id="overallExperience"
                    rows={3}
                    value={form.overallExperience}
                    onChange={(e) =>
                      update("overallExperience", e.target.value)
                    }
                    placeholder="Describe your overall experience"
                    className={textareaClass(errors, "overallExperience")}
                  />
                ),
              })}

              {renderField({
                id: "usefulText",
                label: "What Did You Find Useful?",
                error: errors.usefulText,
                children: (
                  <textarea
                    id="usefulText"
                    rows={3}
                    value={form.usefulText}
                    onChange={(e) =>
                      update("usefulText", e.target.value)
                    }
                    placeholder="What worked well?"
                    className={textareaClass(errors, "usefulText")}
                  />
                ),
              })}

              {renderField({
                id: "improveText",
                label: "What Can We Improve?",
                error: errors.improveText,
                children: (
                  <textarea
                    id="improveText"
                    rows={3}
                    value={form.improveText}
                    onChange={(e) =>
                      update("improveText", e.target.value)
                    }
                    placeholder="Share your suggestions for improvement"
                    className={textareaClass(errors, "improveText")}
                  />
                ),
              })}

              {renderField({
                id: "suggestions",
                label: "Additional Suggestions",
                error: errors.suggestions,
                children: (
                  <textarea
                    id="suggestions"
                    rows={3}
                    value={form.suggestions}
                    onChange={(e) =>
                      update("suggestions", e.target.value)
                    }
                    placeholder="Any other suggestions?"
                    className={textareaClass(errors, "suggestions")}
                  />
                ),
              })}
            </div>
          </Card>
        </div>

        {/* Form Error */}
        {errors.form && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {errors.form}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-black transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting || loadingProfile}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
           

            {submitting
              ? "Sending..."
              : loadingProfile
                ? "Loading Profile..."
                : "Send Feedback"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateFeedback;