import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlignLeft,
  Building2,
  FileText,
  LoaderCircle,
  Mail,
  Paperclip,
  Phone,
  Plus,
  Tag,
  UserRound,
  X as CloseIcon,
} from "lucide-react";

import {
  getComplaintCategories,
  submitComplaint,
} from "../../../api/complaintApi";
import { getCurrentUserId } from "../../../utils/authUtils";
import {
  ACCENT,
  Card,
  Field,
  IconField,
  PageHeader,
  inputClass,
} from "../../../components/common/FormUi";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const initialForm = {
  name: localStorage.getItem("organizationName") || "",
  phone: localStorage.getItem("organizationNo") || "",
  email: localStorage.getItem("employerEmail") || "",
  categoryId: "",
  details: "",
};

const getCategoryId = (category) =>
  category.cC_complaint_category_id ??
  category.CC_Complaint_Category_Id ??
  category.CC_Id;

const getCategoryName = (category) =>
  category.cC_name ?? category.CC_Name ?? category.CC_ComplaintCategoryName;

let complaintCategoriesPromise = null;
let complaintCategoriesCache = null;

const loadComplaintCategoriesOnce = async () => {
  if (complaintCategoriesCache) {
    return complaintCategoriesCache;
  }

  if (complaintCategoriesPromise) {
    return complaintCategoriesPromise;
  }

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

const CreateComplaint = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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

        setErrors((prev) => ({
          ...prev,
          categories: undefined,
        }));
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
      if (active) {
        setCategoriesLoading(false);
      }
    }
  };

  loadCategories();

  return () => {
    active = false;
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
    setErrors((prev) => ({ ...prev, attachment: undefined, form: undefined }));
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    const next = {};

    if (!form.name.trim()) next.name = "Enter your name.";

    if (!form.email.trim()) {
      next.email = "Enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const rawUserId = getCurrentUserId();
    const userId = Number(rawUserId);

    if (!rawUserId || !Number.isInteger(userId) || userId <= 0) {
      setErrors({
        form: "Unable to identify the logged-in user. Please log in again.",
      });
      return;
    }

    const categoryId = Number(form.categoryId);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setErrors({ categoryId: "Please select a valid complaint category." });
      return;
    }

    const formData = new FormData();

    formData.append("CP_full_name", form.name.trim());
    formData.append("CP_mobile", form.phone.trim());
    formData.append("CP_email", form.email.trim());
    formData.append("CP_complaint_category_id", String(categoryId));
    formData.append("CP_details", form.details.trim());
    formData.append("complainer", String(userId));
    formData.append("CP_user_type_id", "2");

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

      navigate("/employer/complaint-list", {
        replace: true,
        state: { successMessage: "Complaint submitted successfully." },
      });
    } catch (error) {
      console.error("Complaint submission failed:", error);

      const apiErrors = error.response?.data?.errors;
      const validationMessage =
        apiErrors && typeof apiErrors === "object"
          ? Object.values(apiErrors).flat().join(" ")
          : "";

      setErrors({
        form:
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

  return (
    <div className="min-h-full bg-white text-slate-800">
      <PageHeader title="Add Complaint" onBack={() => navigate(-1)} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4">
          <Card title="Complainant Information" icon={UserRound}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Name" htmlFor="name" required error={errors.name}>
                <IconField icon={Building2}>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Your full name"
                    className={inputClass(Boolean(errors.name))}
                  />
                </IconField>
              </Field>

              <Field
                label="Email"
                htmlFor="email"
                required
                error={errors.email}
              >
                <IconField icon={Mail}>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="name@example.com"
                    className={inputClass(Boolean(errors.email))}
                  />
                </IconField>
              </Field>

              <Field label="Mobile Number" htmlFor="phone" error={errors.phone}>
                <IconField icon={Phone}>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className={inputClass(Boolean(errors.phone))}
                  />
                </IconField>
              </Field>
            </div>
          </Card>

          <Card title="Complaint Details" icon={FileText}>
            <div className="grid grid-cols-1 gap-4">
              <Field
                label="Complaint Category"
                htmlFor="categoryId"
                required
                error={errors.categoryId || errors.categories}
              >
                <IconField icon={Tag}>
                  <select
                    id="categoryId"
                    value={form.categoryId}
                    onChange={(e) => update("categoryId", e.target.value)}
                    disabled={categoriesLoading}
                    className={`${inputClass(Boolean(errors.categoryId || errors.categories))} cursor-pointer disabled:cursor-not-allowed`}
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
                </IconField>
              </Field>

              <Field
                label="Complaint Description"
                htmlFor="details"
                required
                error={errors.details}
              >
                <IconField icon={AlignLeft}>
                  <textarea
                    id="details"
                    rows={6}
                    value={form.details}
                    onChange={(e) => update("details", e.target.value)}
                    placeholder="Describe your complaint in detail."
                    className={`${inputClass(Boolean(errors.details), false)} resize-y pl-3`}
                  />
                </IconField>
                <p className="mt-1 text-right text-xs text-slate-500">
                  {form.details.length} characters
                </p>
              </Field>
            </div>
          </Card>

          <Card title="Supporting Document" icon={Paperclip}>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">
                Attachment (optional)
              </span>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed bg-[#f4f9fb] px-4 text-sm font-medium transition hover:bg-[#eaf3f7]"
                  style={{ color: ACCENT, borderColor: ACCENT }}
                >
                  <Paperclip size={15} />
                  Choose file
                </button>

                <input
                  ref={fileInputRef}
                  id="attachment"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={onFileChange}
                  className="hidden"
                />

                {attachment ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#eaf3f7] px-3 py-1 text-xs text-slate-700">
                    {attachment.name}
                    <button
                      type="button"
                      onClick={removeAttachment}
                      aria-label="Remove attachment"
                      className="text-slate-500 hover:text-red-600"
                    >
                      <CloseIcon size={14} />
                    </button>
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    PDF, images, or documents. Maximum 10 MB.
                  </span>
                )}
              </div>

              {errors.attachment && (
                <p className="mt-1 text-xs text-red-600">{errors.attachment}</p>
              )}
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
            disabled={submitting || categoriesLoading}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {submitting ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            {submitting ? "Submitting..." : "Submit Complaint"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateComplaint;
