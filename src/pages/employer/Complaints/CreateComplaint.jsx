import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlignLeft,
  ChevronDown,
  ChevronsLeft,
  LoaderCircle,
  Paperclip,
  Plus,
  X as CloseIcon,
} from "lucide-react";

import {
  getComplaintCategories,
  submitComplaint,
} from "../../../api/complaintApi";
import { getCurrentUserId } from "../../../utils/authUtils";
import StatusModal from "../../../components/common/StatusModal";

const LIST_PATH = "/employer/complaint-list";
const MAX_ATTACHMENT_MB = 10;
const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024;
const COMPLAINANT_USER_TYPE_ID = "2";

const FIELD_LABEL = "text-[13px] font-semibold text-black leading-tight";

const selectClass = (hasError) =>
  `w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500 ${
    hasError ? "border-red-400" : "border-slate-300"
  }`;

const inputClass = (hasError) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500 ${
    hasError ? "border-red-400" : "border-slate-300"
  }`;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errors && typeof error.response.data.errors === "object"
    ? Object.values(error.response.data.errors).flat().join(" ")
    : error?.response?.data?.message ||
      error?.response?.data?.Message ||
      error?.response?.data?.title ||
      error?.message ||
      fallback;

const getCategoryId = (category) =>
  category.cC_complaint_category_id ??
  category.CC_Complaint_Category_Id ??
  category.CC_Id;

const getCategoryName = (category) =>
  category.cC_name ?? category.CC_Name ?? category.CC_ComplaintCategoryName;

const initialForm = () => ({
  name: localStorage.getItem("organizationName") || "",
  phone: localStorage.getItem("organizationNo") || "",
  email: localStorage.getItem("employerEmail") || "",
  categoryId: "",
  details: "",
});

/* ---------------- Category cache (loaded once per session) ---------------- */

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
        : response?.data ?? response?.Data;

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

/* ---------------- Layout helpers (same as EditJobSeeker) ---------------- */

const SectionTitle = ({ children }) => (
  <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
    {children}
  </h3>
);

const FieldRow = ({ label, required, error, fullWidth, htmlFor, children }) => (
  <div
    className={`grid grid-cols-[160px_1fr] items-start gap-3 ${
      fullWidth ? "md:col-span-2" : ""
    }`}
  >
    <label htmlFor={htmlFor} className={`${FIELD_LABEL} pt-2`}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="min-w-0">
      {children}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </div>
  </div>
);

const SelectInput = ({ id, value, onChange, disabled, placeholder, options, hasError }) => (
  <div className="relative">
    <select
      id={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={selectClass(hasError)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <ChevronDown
      size={16}
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
    />
  </div>
);

/* ========================================================= */

export default function CreateComplaint() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState(null);

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

  /* ---------- load categories ---------- */

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      setCategoriesLoading(true);

      try {
        const activeCategories = await loadComplaintCategoriesOnce();
        if (active) setCategories(activeCategories);
      } catch (error) {
        console.error("Failed to load complaint categories:", error);
        if (active) {
          openStatus(
            "error",
            getErrorMessage(error, "Unable to load complaint categories."),
          );
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

  /* ---------- field change ---------- */

  const update = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  /* ---------- attachment ---------- */

  const onFileChange = (event) => {
    const selected = event.target.files?.[0] || null;

    if (selected && selected.size > MAX_ATTACHMENT_BYTES) {
      openStatus(
        "warning",
        `The attachment must be ${MAX_ATTACHMENT_MB} MB or smaller.`,
      );
      event.target.value = "";
      setAttachment(null);
      return;
    }

    setAttachment(selected);
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ---------- validation ---------- */

  const validate = () => {
    const next = {};

    if (!form.name.trim()) next.name = "Enter your name.";

    if (!form.email.trim()) {
      next.email = "Enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address.";
    }

    if (form.phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) {
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

  /* ---------- save ---------- */

  const save = async (formData) => {
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

      openStatus("update", "Complaint submitted successfully.", {
        confirmText: "Continue",
        onConfirm: () =>
          navigate(LIST_PATH, {
            replace: true,
            state: { successMessage: "Complaint submitted successfully." },
          }),
      });
    } catch (error) {
      console.error("Complaint submission failed:", error);
      openStatus(
        "error",
        getErrorMessage(error, "Unable to submit your complaint. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- submit ---------- */

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submitting) return;

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      openStatus("warning", Object.values(validationErrors)[0]);
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

    const categoryId = Number(form.categoryId);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      openStatus("warning", "Please select a valid complaint category.");
      return;
    }

    const formData = new FormData();
    formData.append("CP_full_name", form.name.trim());
    formData.append("CP_mobile", form.phone.trim());
    formData.append("CP_email", form.email.trim());
    formData.append("CP_complaint_category_id", String(categoryId));
    formData.append("CP_details", form.details.trim());
    formData.append("complainer", String(userId));
    formData.append("CP_user_type_id", COMPLAINANT_USER_TYPE_ID);

    if (attachment) {
      formData.append("Attachment", attachment, attachment.name);
    }

    openConfirm({
      title: "Confirm submission",
      message: "Are you sure you want to submit this complaint?",
      confirmText: "Submit",
      onConfirm: () => save(formData),
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
              <h2 className="font-semibold text-slate-800">Raise Complaint</h2>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            autoComplete="off"
            className="space-y-6 p-4"
          >
            {/* COMPLAINANT */}
            <section>
              <SectionTitle>Complainant Information</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow label="Name" htmlFor="name" required error={errors.name}>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    disabled={submitting}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Your full name"
                    className={inputClass(Boolean(errors.name))}
                  />
                </FieldRow>

                <FieldRow label="Email" htmlFor="email" required error={errors.email}>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    disabled={submitting}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="name@example.com"
                    className={inputClass(Boolean(errors.email))}
                  />
                </FieldRow>

                <FieldRow
                  label="Mobile Number"
                  htmlFor="phone"
                  error={errors.phone}
                >
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    disabled={submitting}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className={inputClass(Boolean(errors.phone))}
                  />
                </FieldRow>
              </div>
            </section>

            {/* COMPLAINT DETAILS */}
            <section>
              <SectionTitle>Complaint Details</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow
                  label="Complaint Category"
                  htmlFor="categoryId"
                  required
                  error={errors.categoryId}
                >
                  <SelectInput
                    id="categoryId"
                    value={form.categoryId}
                    onChange={(e) => update("categoryId", e.target.value)}
                    disabled={submitting || categoriesLoading}
                    placeholder={
                      categoriesLoading ? "Loading categories..." : "Select a category"
                    }
                    options={categories
                      .map((category) => ({
                        value: String(getCategoryId(category) ?? ""),
                        label: getCategoryName(category) ?? "",
                      }))
                      .filter((option) => option.value && option.label)}
                    hasError={Boolean(errors.categoryId)}
                  />
                </FieldRow>

                <FieldRow
                  label="Complaint Description"
                  htmlFor="details"
                  required
                  error={errors.details}
                  fullWidth
                >
                  <textarea
                    id="details"
                    rows={6}
                    value={form.details}
                    disabled={submitting}
                    onChange={(e) => update("details", e.target.value)}
                    placeholder="Describe your complaint in detail."
                    className={`${inputClass(Boolean(errors.details))} resize-y`}
                  />
                  <p className="mt-1 text-right text-xs text-slate-500">
                    {form.details.length} characters
                  </p>
                </FieldRow>
              </div>
            </section>

            {/* SUPPORTING DOCUMENT */}
            <section>
              <SectionTitle>Supporting Document</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow label="Attachment" fullWidth>
                  <input
                    ref={fileInputRef}
                    id="attachment"
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={onFileChange}
                  />

                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#2f6b8a] bg-white px-4 py-2 text-sm font-medium text-[#2f6b8a] transition hover:bg-[#eaf2f7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Paperclip size={15} />
                      {attachment ? "Change file" : "Choose file"}
                    </button>

                    <span className="truncate text-sm text-slate-600">
                      {attachment ? attachment.name : "No file chosen"}
                    </span>

                    {attachment && (
                      <button
                        type="button"
                        onClick={removeAttachment}
                        disabled={submitting}
                        aria-label="Remove attachment"
                        className="text-slate-500 hover:text-red-600 disabled:opacity-60"
                      >
                        <CloseIcon size={14} />
                      </button>
                    )}
                  </div>

                  <span className="mt-1 block text-xs text-slate-500">
                    PDF, images, or documents. Optional, up to {MAX_ATTACHMENT_MB} MB.
                  </span>
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
                disabled={submitting || categoriesLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
              >
               
                {submitting ? "Submitting..." : "Submit Complaint"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {modalElement}
    </div>
  );
}