import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronsLeft, Eye, EyeOff } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import jobseekerApi from "../../../api/Services/adjobseekerApi";
import toast from "react-hot-toast";
import jobCategoryApi from "../../../api/Services/jobCategoryApi";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

/* ---------- helpers ---------- */

const extractList = (response) => {
  const root = response?.data ?? response;

  const candidates = [
    root?.data?.data,
    root?.Data?.Data,
    root?.data,
    root?.Data,
    root,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (Array.isArray(candidate?.data)) return candidate.data;
    if (Array.isArray(candidate?.Data)) return candidate.Data;
  }

  return [];
};

const extractRecord = (response) => {
  const root = response?.data ?? response;
  const record = root?.data ?? root?.Data ?? root;
  return record && typeof record === "object" && !Array.isArray(record)
    ? record
    : null;
};

const firstValue = (item, ...keys) =>
  keys
    .map((key) => item?.[key])
    .find((value) => value !== undefined && value !== null) ?? "";

const toForm = (item) => ({
  ...EMPTY_FORM,
  fullName: firstValue(item, "fullName", "JB_full_name", "jS_full_name"),
  email: firstValue(item, "email", "Email", "jS_email"),
  mobile: firstValue(item, "mobile", "JB_mobile", "jS_mobile"),
  whatsapp: firstValue(
    item,
    "jB_whatsapp",
    "JB_whatsapp",
    "jS_whatsapp",
    "whatsapp"
  ),
  jobCategory: String(
    firstValue(
      item,
      "jB_job_category_id",
      "JB_job_category_id",
      "jS_job_category_id",
      "jC_job_category_id",
      "jobCategoryId",
      "jobCategoryName",
      "jC_name",
      "jobCategory"
    )
  ),
  jobCategoryName: firstValue(item, "jobCategoryName", "jC_name", "jobCategory"),
  address: firstValue(
    item,
    "address",
    "Address",
    "JB_address",
    "jB_address",
    "preferredLocationName",
    "jB_preferredLocationName",
    "cityName"
  ),
  document: (() => {
    const path = firstValue(item, "jB_cv_file_path", "CVFilePath", "cvFilePath");
    const name =
      firstValue(item, "CVFileName", "cvFileName", "resumeName") ||
      String(path).split(/[\\/]/).pop();
    const url = firstValue(item, "CVFileUrl", "cvFileUrl", "resumeUrl");
    return name || url ? { name: name || "Resume / CV", url: url || "" } : null;
  })(),
});

const MAX_FILE_MB = 5;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const EMPTY_FORM = {
  fullName: "",
  email: "",
  mobile: "",
  whatsapp: "",
  password: "",
  jobCategory: "",
  jobCategoryName: "",
  address: "",
  document: null,
};

/* ---------- job category prefetch (module-level cache) ---------- */

let jobCategoriesPromise = null;

const loadJobCategoriesOnce = () => {
  if (!jobCategoriesPromise) {
    jobCategoriesPromise = jobCategoryApi
      .getAllList()
      .then((response) =>
        extractList(response)
          .map((item) => ({
            id: firstValue(item, "jC_job_category_id", "JC_job_category_id"),
            name: firstValue(item, "jC_name", "JC_name", "name"),
          }))
          .filter((category) => category.id && category.name)
      )
      .catch((err) => {
        // allow a retry on the next call if it failed
        jobCategoriesPromise = null;
        throw err;
      });
  }
  return jobCategoriesPromise;
};

// Kick off the fetch as soon as this module is imported, so by the time
// the form mounts (or the user opens the dropdown) data is often ready.
loadJobCategoriesOnce().catch(() => {
  /* swallow — component will retry / show empty */
});

/* ---------- validation ---------- */

const validate = (form, requireDocument = true) => {
  const errors = {};

  if (!form.fullName.trim()) errors.fullName = "Full name is required";

  const digits = form.mobile.replace(/\D/g, "");
  if (!form.mobile.trim()) {
    errors.mobile = "Mobile number is required";
  } else if (digits.length < 10 || digits.length > 15) {
    errors.mobile = "Enter a valid mobile number, 10 to 15 digits";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (requireDocument && !form.password.trim()) {
    errors.password = "Password is required";
  } else if (form.password && form.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (!form.jobCategory) errors.jobCategory = "Select a profession";
  if (!form.address.trim()) errors.address = "Address is required";

  if (requireDocument && !form.document) {
    errors.document = "Upload a document";
  }

  return errors;
};

/* ========================================================= */

const AddJobSeeker = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isCreate = mode === "create" || !id;
  const [isView, setIsView] = useState(
    mode === "view" || (!mode && Boolean(id)),
  );
  const isEdit = !isCreate && !isView;

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loadingRecord, setLoadingRecord] = useState(isView);
  const [showPassword, setShowPassword] = useState(false);

  const fileRef = useRef(null);

  useEffect(() => {
    setIsView(mode === "view" || (!mode && Boolean(id)));
  }, [id, mode]);

  /* ---------- dropdown sources ---------- */

  const [jobCategories, setJobCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadJobCategories = async () => {
      setLoadingCategories(true);
      setCategoryError("");
      try {
        const list = await loadJobCategoriesOnce();
        if (!cancelled) setJobCategories(list);
      } catch (err) {
        if (!cancelled) {
          setJobCategories([]);
          setCategoryError(
            getApiErrorMessage(err) ||
              "Unable to load professions. Check the API connection."
          );
        }
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };

    loadJobCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;
    const loadRecord = async () => {
      setLoadingRecord(true);
      setServerError("");
      try {
        const response = await jobseekerApi.getById(id);
        const item = extractRecord(response);
        if (!item) throw new Error("Jobseeker details were not found.");
        if (!cancelled) setForm(toForm(item));
      } catch (err) {
        if (!cancelled) {
          setServerError(
            getApiErrorMessage(err) || "Unable to load jobseeker details."
          );
        }
      } finally {
        if (!cancelled) setLoadingRecord(false);
      }
    };

    loadRecord();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ---------- input handlers ---------- */

  const set = (key) => (e) => {
    setForm((c) => ({ ...c, [key]: e.target.value }));
    setErrors((c) => ({ ...c, [key]: undefined }));
  };

  const onMobile = (e) => {
    const clean = e.target.value.replace(/[^\d+\s]/g, "");
    setForm((c) => ({ ...c, mobile: clean }));
    setErrors((c) => ({ ...c, mobile: undefined }));
  };

  /* ---------- file ---------- */

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((c) => ({
        ...c,
        document: "Only PDF, JPG, PNG, DOC or DOCX files are allowed",
      }));
      return;
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrors((c) => ({
        ...c,
        document: `File must be smaller than ${MAX_FILE_MB} MB`,
      }));
      return;
    }

    setForm((c) => ({
      ...c,
      document: { name: file.name, url: URL.createObjectURL(file), file },
    }));
    setErrors((c) => ({ ...c, document: undefined }));
  };

  /* ---------- submit ---------- */

  const submit = async (e) => {
    e.preventDefault();
    if (isView) return;
    setServerError("");

    const foundErrors = validate(form, isCreate);
    if (Object.keys(foundErrors).length) {
      setErrors(foundErrors);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        JB_jobseeker_id: Number(id),
        JB_full_name: form.fullName.trim(),
        Email: form.email.trim(),
        JB_mobile: form.mobile.replace(/\D/g, ""),
        JB_whatsapp: (form.whatsapp || form.mobile).replace(/\D/g, ""),
        JB_job_category_id: Number(form.jobCategory),
        JB_job_role_id: 1,
        JB_institute_type_id: 1,
        JB_highest_qualification: "N/A",
        JB_speciality: "",
        JB_registration_number: "",
        JB_total_experience: 0,
        JB_current_designation: "",
        JB_current_employer: "",
        JB_current_salary: 0,
        JB_expected_salary: 0,
        JB_address: form.address.trim(),
        JB_country_id: 1,
        JB_state_id: 1,
        JB_city_id: 1,
        JB_preferred_location: 1,
        JB_willing_to_relocate: true,
        JB_consent_given: true,
      };

      // Jobseeker create and update endpoints both consume multipart/form-data.
      // Sending the edit payload as JSON causes ASP.NET Core to reject the PUT
      // with 415 Unsupported Media Type.
      const formData = new FormData();
      Object.entries({
        ...payload,
        ...(isCreate ? { Password: form.password.trim() } : {}),
      }).forEach(([key, value]) => {
        formData.append(key, String(value ?? ""));
      });

      if (form.document?.file) {
        formData.append("CVFile", form.document.file, form.document.file.name);
      }

      const response = isCreate
        ? await jobseekerApi.create(formData)
        : await jobseekerApi.update(id, formData);

      toast.success(
        response?.data?.message ||
          `Job seeker ${isCreate ? "created" : "updated"} successfully.`,
      );
      navigate("/admin/jobseekers");
    } catch (err) {
      const msg =
        getApiErrorMessage(err) ||
        `Failed to ${isCreate ? "create" : "update"} job seeker. Please try again.`;
      setServerError(msg);
    } finally {
      setSaving(false);
    }
  };

  const star = <span className="ml-1 text-red-500">*</span>;
  const hasCategoryOption = jobCategories.some(
    (category) => String(category.id) === String(form.jobCategory),
  );

  /* ========================================================= */

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

              <h2 className="font-semibold text-slate-800">
                {isCreate
                  ? "Add User"
                  : isEdit
                    ? "Edit User"
                    : "Jobseeker Details"}
              </h2>
            </div>
          </div>

          {serverError && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {serverError}
            </div>
          )}

          {loadingRecord ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading jobseeker details...
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="p-4">
              {/* PERSONAL + PROFESSIONAL DETAILS */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Full Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full Name {star}
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={set("fullName")}
                    disabled={saving || isView}
                    placeholder="Your full name"
                    className={inputClass}
                  />
                  {errors.fullName && (
                    <span className="mt-1 block text-xs text-red-500">
                      {errors.fullName}
                    </span>
                  )}
                </div>

                {/* Profession / Job Category */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Profession / Job Category {star}
                  </label>
                  <div className="relative">
                    <select
                      value={form.jobCategory}
                      onChange={set("jobCategory")}
                      disabled={saving || loadingCategories || isView}
                      className={selectClass}
                    >
                      <option value="">
                        {loadingCategories
                          ? "Loading professions..."
                          : "Select Profession"}
                      </option>
                      {jobCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                      {form.jobCategory && !hasCategoryOption && (
                        <option value={form.jobCategory}>
                          {form.jobCategoryName || form.jobCategory}
                        </option>
                      )}
                    </select>
                    <ChevronDown
                      size={17}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                  </div>
                  {errors.jobCategory && (
                    <span className="mt-1 block text-xs text-red-500">
                      {errors.jobCategory}
                    </span>
                  )}
                  {categoryError && (
                    <span className="mt-1 block text-xs text-red-500">
                      {categoryError}
                    </span>
                  )}
                </div>

                {/* Mobile */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Mobile Number {star}
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.mobile}
                    onChange={onMobile}
                    disabled={saving || isView}
                    placeholder="+91 98765 43210"
                    className={inputClass}
                  />
                  {errors.mobile && (
                    <span className="mt-1 block text-xs text-red-500">
                      {errors.mobile}
                    </span>
                  )}
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.whatsapp}
                    onChange={set("whatsapp")}
                    disabled={saving || isView}
                    placeholder="Same as mobile if left blank"
                    className={inputClass}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email Address {star}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    disabled={saving || isView}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                  {errors.email && (
                    <span className="mt-1 block text-xs text-red-500">
                      {errors.email}
                    </span>
                  )}
                </div>

                {/* Password is only shown while creating a jobseeker. */}
                {isCreate && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Password {star}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={set("password")}
                        disabled={saving}
                        placeholder="Minimum 6 characters"
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        disabled={saving}
                        title={showPassword ? "Hide password" : "Show password"}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {showPassword ? (
                          <EyeOff size={17} strokeWidth={2} />
                        ) : (
                          <Eye size={17} strokeWidth={2} />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <span className="mt-1 block text-xs text-red-500">
                        {errors.password}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ADDRESS + DOCUMENT */}
              <div className="mt-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {/* Address — full width */}
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Address {star}
                    </label>
                    <textarea
                      rows={3}
                      value={form.address}
                      onChange={set("address")}
                      disabled={saving || isView}
                      placeholder="House no., area, city, state"
                      className={inputClass}
                    />
                    {errors.address && (
                      <span className="mt-1 block text-xs text-red-500">
                        {errors.address}
                      </span>
                    )}
                  </div>

                  {/* Document — full width */}
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Document (CV) {isCreate && star}
                    </label>

                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={onFile}
                    />

                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={saving || isView}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#2f6b8a] bg-white px-4 py-2 text-sm font-medium text-[#2f6b8a] transition hover:bg-[#eaf2f7] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {form.document ? "Change file" : "Choose file"}
                      </button>
                      <span className="truncate text-sm text-slate-600">
                        {form.document ? form.document.name : "No file chosen"}
                      </span>
                    </div>

                    <span className="mt-1 block text-xs text-slate-500">
                      PDF, JPG, PNG, DOC or DOCX, up to {MAX_FILE_MB} MB
                    </span>

                    {isCreate && errors.document && (
                      <span className="mt-1 block text-xs text-red-500">
                        {errors.document}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="mt-4 flex justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/admin/jobseekers")}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                {isView ? (
                  <button
                    key="view-edit-button"
                    type="button"
                    onClick={() => {
                      setIsView(false);
                      setServerError("");
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    key="form-submit-button"
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : isCreate ? "Add User" : "Update"}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddJobSeeker;