
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

import jobseekerApi from "../../../api/Services/adjobseekerApi.js";

import {
  getComplaintCategories,
  submitComplaint,
} from "../../../api/complaintApi";

import { getCurrentUserId } from "../../../utils/authUtils";

import {
  ACCENT,
  Card,
  PageHeader,
  inputClass,
} from "../../../components/common/FormUi";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const initialForm = {
  name: "",
  phone: "",
  email: "",
  categoryId: "",
  details: "",
};

const LABEL_CLASS =
  "w-full text-sm font-medium text-black sm:w-48 sm:min-w-48 sm:shrink-0 sm:pt-2";

const getCategoryId = (category) =>
  category.cC_complaint_category_id ??
  category.CC_Complaint_Category_Id ??
  category.CC_Id;

const getCategoryName = (category) =>
  category.cC_name ??
  category.CC_Name ??
  category.CC_ComplaintCategoryName;

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
      if (
        response?.success === false ||
        response?.Success === false
      ) {
        throw new Error(
          response.message ||
            response.Message ||
            "Unable to load complaint categories."
        );
      }

      const records = Array.isArray(response)
        ? response
        : response?.data ?? response?.Data;

      if (!Array.isArray(records)) {
        throw new Error("Invalid complaint category response.");
      }

      const activeCategories = records.filter(
        (item) =>
          item.cC_is_active !== false &&
          item.CC_IsActive !== false
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
        const activeCategories =
          await loadComplaintCategoriesOnce();

        if (active) {
          setCategories(activeCategories);

          setErrors((prev) => ({
            ...prev,
            categories: undefined,
          }));
        }
      } catch (error) {
        console.error(
          "Failed to load complaint categories:",
          error
        );

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

  useEffect(() => {
    let cancelled = false;

    const loadJobseekerDetails = async () => {
      try {
        const userId = getCurrentUserId();

        if (userId == null || userId === "") {
          console.error(
            "Unable to identify the logged-in jobseeker."
          );
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
          record.jB_jobseeker_no || ""
        );
      } catch (error) {
        console.error(
          "Failed to load jobseeker details:",
          error.response?.data || error.message
        );
      }
    };

    loadJobseekerDetails();

    return () => {
      cancelled = true;
    };
  }, []);

  const update = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
      form: undefined,
    }));
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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setErrors((prev) => ({
      ...prev,
      attachment: undefined,
    }));
  };

  const validate = () => {
    const next = {};

    if (!form.name.trim()) {
      next.name = "Enter your name.";
    }

    if (!form.email.trim()) {
      next.email = "Enter your email address.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      next.email = "Enter a valid email address.";
    }

    if (
      form.phone.trim() &&
      !/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())
    ) {
      next.phone = "Enter a valid phone number.";
    }

    if (!form.categoryId) {
      next.categoryId = "Choose a complaint category.";
    }

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

    if (
      !rawUserId ||
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      setErrors((prev) => ({
        ...prev,
        form:
          "Unable to identify the logged-in user. Please log in again.",
      }));
      return;
    }

    const categoryId = Number(form.categoryId);

    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0
    ) {
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
    formData.append(
      "CP_complaint_category_id",
      String(categoryId)
    );
    formData.append("CP_details", form.details.trim());
    formData.append("complainer", String(userId));
    formData.append("CP_user_type_id", "1");

    if (attachment) {
      formData.append(
        "Attachment",
        attachment,
        attachment.name
      );
    }

    setSubmitting(true);

    try {
      const response = await submitComplaint(formData);

      if (
        response?.success === false ||
        response?.Success === false
      ) {
        throw new Error(
          response.message ||
            response.Message ||
            "Failed to submit the complaint."
        );
      }

      navigate("/jobseeker/complaint-list", {
        replace: true,
        state: {
          successMessage: "Complaint submitted successfully.",
        },
      });
    } catch (error) {
      console.error("Complaint submission failed:", error);

      const apiErrors = error.response?.data?.errors;

      const validationMessage =
        apiErrors && typeof apiErrors === "object"
          ? Object.values(apiErrors).flat().join(" ")
          : "";

      setErrors((prev) => ({
        ...prev,
        form:
          validationMessage ||
          error.response?.data?.message ||
          error.response?.data?.Message ||
          error.response?.data?.title ||
          error.message ||
          "Unable to submit your complaint. Please try again.",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  // Consistent horizontal label/control layout for all fields.
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
        className={LABEL_CLASS}
      >
        {label}
        {required && <span className="ml-1 text-black">*</span>}
      </label>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {children}

        {error && (
          <p
            className="text-xs text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-white text-slate-800">
      <PageHeader
        title="Add Complaint"
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4">
          {/* Complainant Information */}
          <Card title="Complainant Information" icon={UserRound}>
            <div className="flex flex-col gap-5">
              {renderField({
                id: "name",
                label: "Name",
                required: true,
                error: errors.name,
                children: (
                  <div className="relative">
                    <Building2
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-black"
                    />
                    <input
                      id="name"
                      type="text"
                      value={form.name}
                      readOnly
                      placeholder="Your full name"
                      className={`${inputClass(Boolean(errors.name))} w-full bg-slate-50 pl-9 text-sm text-black`}
                    />
                  </div>
                ),
              })}

              {renderField({
                id: "email",
                label: "Email Address",
                required: true,
                error: errors.email,
                children: (
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-black"
                    />
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      readOnly
                      placeholder="Your email address"
                      className={`${inputClass(Boolean(errors.email))} w-full bg-slate-50 pl-9 text-sm text-black`}
                    />
                  </div>
                ),
              })}

              {renderField({
                id: "phone",
                label: "Mobile Number",
                error: errors.phone,
                children: (
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-black"
                    />
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      readOnly
                      placeholder="Your phone number"
                      className={`${inputClass(Boolean(errors.phone))} w-full bg-slate-50 pl-9 text-sm text-black`}
                    />
                  </div>
                ),
              })}
            </div>
          </Card>

          {/* Complaint Details */}
          <Card title="Complaint Details" icon={FileText}>
            <div className="flex flex-col gap-5">
              {renderField({
                id: "categoryId",
                label: "Complaint Category",
                required: true,
                error: errors.categoryId || errors.categories,
                children: (
                  <div className="relative">
                    <Tag
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-black"
                    />

                    <select
                      id="categoryId"
                      value={form.categoryId}
                      onChange={(e) =>
                        update("categoryId", e.target.value)
                      }
                      disabled={categoriesLoading}
                      className={`${inputClass(Boolean(errors.categoryId || errors.categories))} w-full cursor-pointer pl-9 text-sm text-black disabled:cursor-not-allowed`}
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
                ),
              })}

              {renderField({
                id: "details",
                label: "Complaint Description",
                required: true,
                error: errors.details,
                children: (
                  <>
                    <div className="relative">
                      <AlignLeft
                        size={16}
                        className="absolute left-3 top-3 text-black"
                      />

                      <textarea
                        id="details"
                        rows={6}
                        value={form.details}
                        onChange={(e) =>
                          update("details", e.target.value)
                        }
                        placeholder="Describe your complaint in detail."
                        className={`${inputClass(Boolean(errors.details), false)} w-full resize-y pl-9 text-sm text-black`}
                      />
                    </div>

                    <p className="text-right text-xs text-black">
                      {form.details.length} characters
                    </p>
                  </>
                ),
              })}
            </div>
          </Card>

          {/* Supporting Document */}
          <Card title="Supporting Document" icon={Paperclip}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-5">
              <label
                htmlFor="attachment"
                className={LABEL_CLASS}
              >
                Attachment
                <span className="ml-1 font-normal text-black">
                  (Optional)
                </span>
              </label>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
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
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-400 bg-slate-50 px-4 py-2 text-sm font-medium text-black transition hover:bg-slate-100"
                  >
                    <Paperclip size={15} />
                    Choose File
                  </button>

                  {attachment ? (
                    <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-black">
                      <span className="max-w-56 truncate">
                        {attachment.name}
                      </span>

                      <button
                        type="button"
                        onClick={removeAttachment}
                        aria-label="Remove attachment"
                        className="shrink-0 text-black hover:text-red-600"
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
                  <p
                    className="text-xs text-red-600"
                    role="alert"
                  >
                    {errors.attachment}
                  </p>
                )}
              </div>
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
            disabled={submitting || categoriesLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-black shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {submitting ? (
              <LoaderCircle
                size={15}
                className="animate-spin"
              />
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
      </form>
    </div>
  );
};

export default CreateComplaint;
