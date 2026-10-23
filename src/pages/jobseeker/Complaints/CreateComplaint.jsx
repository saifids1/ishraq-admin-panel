import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlignLeft,
  ChevronsLeft,
  Clock3,
  FileText,
  Loader2,
  LoaderCircle,
  Paperclip,
  Plus,
  ShieldAlert,
  Tag,
  UserRound,
  X as CloseIcon,
  CheckCircle2,
  PauseCircle,
} from "lucide-react";

import jobseekerApi from "../../../api/Services/adjobseekerApi.js";
import StatusModal from "../../../components/common/StatusModal.jsx";

import {
  getComplaintCategories,
  submitComplaint,
} from "../../../api/complaintApi";

import { getCurrentUserId } from "../../../utils/authUtils";

const ACCENT = "#2f6b8a";

/* ------------------------- STATUS TONES ------------------------- */
/* Mirrors ComplaintDetails / FeedbackDetails palette. */

const REQUEST_STATUS_TONES = {
  new: { badge: "bg-sky-600 ring-sky-700 shadow-sky-600/20", icon: Clock3 },
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

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const initialForm = {
  name: "",
  phone: "",
  email: "",
  categoryId: "",
  details: "",
};

const getCategoryId = (category) =>
  category.cC_complaint_category_id ??
  category.CC_Complaint_Category_Id ??
  category.CC_Id;

const getCategoryName = (category) =>
  category.cC_name ?? category.CC_Name ?? category.CC_ComplaintCategoryName;

const viewValue = (value) =>
  value === null || value === undefined || String(value).trim() === ""
    ? "—"
    : value;

let complaintCategoriesPromise = null;
let complaintCategoriesCache = null;

const loadComplaintCategoriesOnce = async () => {
  if (complaintCategoriesCache) return complaintCategoriesCache;
  if (complaintCategoriesPromise) return complaintCategoriesPromise;

  complaintCategoriesPromise = getComplaintCategories()
    .then((response) => {
      if (response?.success === false || response?.Success === false) {
        throw new Error(
          response.message ||
            response.Message ||
            "Unable to load complaint categories.",
        );
      }

      const records = Array.isArray(response)
        ? response
        : (response?.data ?? response?.Data);

      if (!Array.isArray(records)) {
        throw new Error("Invalid complaint category response.");
      }

      const activeCategories = records.filter(
        (item) => item.cC_is_active !== false && item.CC_IsActive !== false,
      );

      complaintCategoriesCache = activeCategories;
      return activeCategories;
    })
    .finally(() => {
      complaintCategoriesPromise = null;
    });

  return complaintCategoriesPromise;
};

/* ------------------------- FIELD COMPONENTS ------------------------- */

const FieldRow = ({ label, htmlFor, required, children, fullWidth }) => (
  <div
    className={`grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr] sm:items-start sm:gap-3 ${
      fullWidth ? "md:col-span-2" : ""
    }`}
  >
    <label htmlFor={htmlFor} className={`${FIELD_LABEL} pt-2`}>
      {label}
      {required && <span className="ml-1 text-red-600">*</span>}
    </label>
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

const CreateComplaint = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [attachment, setAttachment] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      setCategoriesLoading(true);

      try {
        const activeCategories = await loadComplaintCategoriesOnce();

        if (active) {
          setCategories(activeCategories);
          setErrors((prev) => ({ ...prev, categories: undefined }));
        }
      } catch (error) {
        console.error("Failed to load complaint categories:", error);

        if (active) {
          setErrors((prev) => ({
            ...prev,
            categories:
              error.response?.data?.message ||
              error.response?.data?.Message ||
              error.message ||
              "Unable to load complaint categories.",
          }));
        }
      } finally {
        if (active) setCategoriesLoading(false);
      }
    };

    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadJobseekerDetails = async () => {
      try {
        const userId = getCurrentUserId();

        if (userId == null || userId === "") {
          console.error("Unable to identify the logged-in jobseeker.");
          return;
        }

        const response = await jobseekerApi.getById(userId);
        const record = response?.data?.data;

        if (!record || cancelled) return;

        setForm((prev) => ({
          ...prev,
          name: record.fullName || "",
          phone: record.mobile || "",
          email: record.email || record.userName || "",
        }));

        localStorage.setItem(
          "jobseekerNumber",
          record.jB_jobseeker_no || "",
        );
      } catch (error) {
        console.error(
          "Failed to load jobseeker details:",
          error.response?.data || error.message,
        );
      }
    };

    loadJobseekerDetails();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
  };

  const onFileChange = (event) => {
    const selected = event.target.files?.[0] || null;

    if (selected && selected.size > MAX_ATTACHMENT_BYTES) {
      setErrors((prev) => ({
        ...prev,
        attachment: "The attachment must be 10 MB or smaller.",
      }));
      event.target.value = "";
      setAttachment(null);
      return;
    }

    setAttachment(selected);
    setErrors((prev) => ({
      ...prev,
      attachment: undefined,
      form: undefined,
    }));
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrors((prev) => ({ ...prev, attachment: undefined }));
  };

  const validate = () => {
    const next = {};

    if (!form.name.trim()) next.name = "Enter your name.";

    if (!form.email.trim()) {
      next.email = "Enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address.";
    }

    if (
      form.phone.trim() &&
      !/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())
    ) {
      next.phone = "Enter a valid phone number.";
    }

    if (!form.categoryId) next.categoryId = "Choose a complaint category.";

    if (!form.details.trim()) {
      next.details = "Enter your complaint details.";
    } else if (form.details.trim().length < 20) {
      next.details =
        "Please enter at least 20 characters describing your complaint.";
    }

    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || categoriesLoading) return;

    const validationErrors = validate();
    setErrors((prev) => ({
      ...prev,
      ...validationErrors,
      form: undefined,
    }));

    if (Object.keys(validationErrors).length > 0) return;

    const rawUserId = getCurrentUserId();
    const userId = Number(rawUserId);

    if (!rawUserId || !Number.isInteger(userId) || userId <= 0) {
      setErrors((prev) => ({
        ...prev,
        form: "Unable to identify the logged-in user. Please log in again.",
      }));
      return;
    }

    const categoryId = Number(form.categoryId);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setErrors((prev) => ({
        ...prev,
        categoryId: "Please select a valid complaint category.",
      }));
      return;
    }

    const formData = new FormData();
    formData.append("CP_full_name", form.name.trim());
    formData.append("CP_mobile", form.phone.trim());
    formData.append("CP_email", form.email.trim());
    formData.append("CP_complaint_category_id", String(categoryId));
    formData.append("CP_details", form.details.trim());
    formData.append("complainer", String(userId));
    formData.append("CP_user_type_id", "1");

    if (attachment) {
      formData.append("Attachment", attachment, attachment.name);
    }

    setSubmitting(true);

    try {
      const response = await submitComplaint(formData);

      if (response?.success === false || response?.Success === false) {
        throw new Error(
          response.message ||
            response.Message ||
            "Failed to submit the complaint.",
        );
      }

      setStatusModal({
        isOpen: true,
        type: "success",
        title: "Complaint Submitted",
        message: "Your complaint has been submitted successfully.",
      });
    } catch (error) {
      console.error("Complaint submission failed:", error);

      const apiErrors = error.response?.data?.errors;
      const validationMessage =
        apiErrors && typeof apiErrors === "object"
          ? Object.values(apiErrors).flat().join(" ")
          : "";

      setStatusModal({
        isOpen: true,
        type: "error",
        title: "Submission Failed",
        message:
          validationMessage ||
          error.response?.data?.message ||
          error.response?.data?.Message ||
          error.response?.data?.title ||
          error.message ||
          "Unable to submit your complaint. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------- DERIVED ------------------------- */

  // New complaints always start in the "NEW" state — surface the same badge
  // the detail view will show after submission.
  const reqTone = requestToneOf("new");
  const StatusIcon = reqTone.icon;

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
                Raise Complaint
              </h2>
            </div>

            <span className={`${BADGE_BASE} ${reqTone.badge}`}>
              <StatusIcon size={14} strokeWidth={2.5} />
              NEW
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="p-4">
              <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-4">
                {/* Complainant Information */}
                <section>
                  <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                    Complainant Information
                  </h3>
                  <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                    <FieldRow label="Name" htmlFor="name" required fullWidth>
                      <div className="flex min-h-9 items-center rounded-md border border-[#e3e8ee] bg-slate-50 px-3 py-2 text-[13px] font-medium text-[#1a2b3c]">
                        <UserRound size={15} className="mr-2 shrink-0 text-black" />
                        <span className="min-w-0 flex-1 truncate">
                          {viewValue(form.name)}
                        </span>
                      </div>
                      {errors.name && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {errors.name}
                        </p>
                      )}
                    </FieldRow>

                    <FieldRow label="Email Address" htmlFor="email" required fullWidth>
                      <div className="flex min-h-9 items-center rounded-md border border-[#e3e8ee] bg-slate-50 px-3 py-2 text-[13px] font-medium text-[#1a2b3c]">
                        <span className="min-w-0 flex-1 truncate">
                          {viewValue(form.email)}
                        </span>
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {errors.email}
                        </p>
                      )}
                    </FieldRow>

                    <FieldRow label="Mobile Number" htmlFor="phone" fullWidth>
                      <div className="flex min-h-9 items-center rounded-md border border-[#e3e8ee] bg-slate-50 px-3 py-2 text-[13px] font-medium text-[#1a2b3c]">
                        <span className="min-w-0 flex-1 truncate">
                          {viewValue(form.phone)}
                        </span>
                      </div>
                      {errors.phone && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {errors.phone}
                        </p>
                      )}
                    </FieldRow>
                  </div>
                </section>

                {/* Complaint Details */}
                <section>
                  <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                    Complaint Details
                  </h3>
                  <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                    <FieldRow
                      label="Complaint Category"
                      htmlFor="categoryId"
                      required
                      fullWidth
                    >
                      <div className="relative">
                        <Tag
                          size={15}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black"
                        />
                        <select
                          id="categoryId"
                          value={form.categoryId}
                          onChange={(e) =>
                            update("categoryId", e.target.value)
                          }
                          disabled={categoriesLoading}
                          className={`min-h-9 w-full cursor-pointer rounded-md border bg-[#fbfcfd] py-2 pl-9 pr-3 text-[13px] font-medium text-[#1a2b3c] outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/20 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                            errors.categoryId || errors.categories
                              ? "border-red-400"
                              : "border-[#e3e8ee]"
                          }`}
                        >
                          <option value="">
                            {categoriesLoading
                              ? "Loading categories..."
                              : "Select a category"}
                          </option>

                          {categories.map((category) => {
                            const id = getCategoryId(category);
                            const name = getCategoryName(category);
                            if (id == null || !name) return null;
                            return (
                              <option key={id} value={id}>
                                {name}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {(errors.categoryId || errors.categories) && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {errors.categoryId || errors.categories}
                        </p>
                      )}
                    </FieldRow>

                    <FieldRow
                      label="Complaint Description"
                      htmlFor="details"
                      required
                      fullWidth
                    >
                      <div className="relative">
                        <AlignLeft
                          size={15}
                          className="pointer-events-none absolute left-3 top-3 text-black"
                        />
                        <textarea
                          id="details"
                          rows={6}
                          value={form.details}
                          onChange={(e) => update("details", e.target.value)}
                          placeholder="Describe your complaint in detail."
                          className={`w-full resize-y rounded-md border bg-[#fbfcfd] py-2 pl-9 pr-3 text-[13px] font-medium text-[#1a2b3c] outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/20 ${
                            errors.details
                              ? "border-red-400"
                              : "border-[#e3e8ee]"
                          }`}
                        />
                      </div>

                      <p className="mt-1 text-right text-xs text-black">
                        {form.details.length} characters
                      </p>

                      {errors.details && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {errors.details}
                        </p>
                      )}
                    </FieldRow>
                  </div>
                </section>

                {/* Supporting Document */}
                <section>
                  <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                    Supporting Document
                  </h3>
                  <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                    <FieldRow
                      label="Attachment"
                      htmlFor="attachment"
                      fullWidth
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          ref={fileInputRef}
                          id="attachment"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={onFileChange}
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-dashed border-slate-400 bg-[#fbfcfd] px-3 py-2 text-[13px] font-medium text-[#1a2b3c] transition hover:bg-[#eaf2f7]"
                        >
                          <Paperclip size={15} />
                          Choose File
                        </button>

                        {attachment ? (
                          <span className="inline-flex max-w-full items-center gap-2 rounded-md border border-[#e3e8ee] bg-[#fbfcfd] px-3 py-2 text-[13px] font-medium text-[#1a2b3c]">
                            <span className="max-w-56 truncate">
                              {attachment.name}
                            </span>
                            <button
                              type="button"
                              onClick={removeAttachment}
                              aria-label="Remove attachment"
                              className="shrink-0 text-black transition hover:text-red-600"
                            >
                              <CloseIcon size={15} />
                            </button>
                          </span>
                        ) : (
                          <span className="text-xs text-black">
                            PDF, JPG, PNG, DOC, or DOCX. Maximum 10 MB.
                          </span>
                        )}
                      </div>

                      {errors.attachment && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {errors.attachment}
                        </p>
                      )}
                    </FieldRow>
                  </div>
                </section>
              </div>

              {/* Form-level error */}
              {errors.form && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
                >
                  {errors.form}
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 flex justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={submitting || categoriesLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <Plus size={15} />
                  )}
                  {submitting
                    ? "Submitting..."
                    : categoriesLoading
                      ? "Loading Categories..."
                      : "Submit Complaint"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <StatusModal
        isOpen={statusModal.isOpen}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        confirmText="OK"
        onConfirm={() => {
          if (statusModal.type === "success") {
            navigate("/jobseeker/complaint-list", {
              replace: true,
              state: {
                successMessage: "Complaint submitted successfully.",
              },
            });
            return;
          }
          setStatusModal((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() =>
          setStatusModal((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
};

export default CreateComplaint;