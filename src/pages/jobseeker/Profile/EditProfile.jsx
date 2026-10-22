import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronsLeft } from "lucide-react";
import jobseekerApi from "../../../api/Services/adjobseekerApi";
import jobCategoryApi from "../../../api/Services/jobCategoryApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import jobRoleApi from "../../../api/Services/jobRoleApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";
import { getCurrentUserId } from "../../../utils/authUtils";
import StatusModal from "../../../components/common/StatusModal";

const MAX_FILE_MB = 5;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const FIELD_LABEL = "text-[13px] font-semibold text-black leading-tight";

const DOCUMENT_BASE_URL = (process.env.REACT_APP_DOCUMENT_BASE_URL || "").trim();

const toAbsoluteUrl = (url) => {
  if (!url) return url;
  const raw = String(url).trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  let clean = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  clean = clean.replace(/^wwwroot\//i, "").replace(/^api\//i, "").replace(/^\/+/, "");

  if (!DOCUMENT_BASE_URL) return `/${clean}`;
  return `${DOCUMENT_BASE_URL.replace(/\/+$/, "")}/${clean}`;
};

const extractList = (response) => {
  const root = response?.data ?? response;
  const candidates = [root?.data?.data, root?.Data?.Data, root?.data, root?.Data, root];

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
  return record && typeof record === "object" && !Array.isArray(record) ? record : null;
};

const firstValue = (item, ...keys) =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null) ?? "";

// Builds { value, label } options from a master list using several possible key names.
const toOptions = (list, idKeys, labelKeys) =>
  list
    .map((item) => ({
      value: String(firstValue(item, ...idKeys)),
      label: String(firstValue(item, ...labelKeys)),
    }))
    .filter((option) => option.value && option.label);

const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");

const toForm = (item) => ({
  fullName: firstValue(item, "fullName"),
  email: firstValue(item, "email"),
  mobile: firstValue(item, "mobile"),
  whatsapp: firstValue(item, "jB_whatsapp"),
  instituteType: String(firstValue(item, "jB_institute_type_id")),
  jobCategory: String(firstValue(item, "jB_job_category_id")),
  jobRole: String(firstValue(item, "jB_job_role_id")),
  countryId: String(firstValue(item, "jB_country_id")),
  stateId: String(firstValue(item, "jB_state_id")),
  cityId: String(firstValue(item, "jB_city_id")),
  highestQualification: firstValue(item, "jB_highest_qualification"),
  speciality: firstValue(item, "jB_speciality"),
  registrationNumber: firstValue(item, "jB_registration_number"),
  totalExperience: firstValue(item, "jB_total_experience"),
  currentDesignation: firstValue(item, "jB_current_designation"),
  currentEmployer: firstValue(item, "jB_current_employer"),
  currentSalary: firstValue(item, "jB_current_salary"),
  expectedSalary: firstValue(item, "jB_expected_salary"),
  preferredLocation: String(firstValue(item, "jB_preferred_location")),
  willingToRelocate: item?.jB_willing_to_relocate === true,
  availabilityToJoin: toDateInput(firstValue(item, "jB_availability_to_join")),
  consentGiven: item?.jB_consent_given === true,
  document: (() => {
    const path = firstValue(item, "jB_cv_file_path");
    if (!path) return null;
    return {
      name: String(path).split(/[\\/]/).pop() || "Resume / CV",
      url: toAbsoluteUrl(path),
    };
  })(),
});

const validate = (form) => {
  const errors = {};
  const digits = form.mobile.replace(/\D/g, "");

  if (!form.fullName.trim()) errors.fullName = "Full name is required";
  if (!form.mobile.trim()) errors.mobile = "Mobile number is required";
  else if (digits.length < 10 || digits.length > 15)
    errors.mobile = "Enter a valid mobile number, 10 to 15 digits";

  if (!form.email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errors.email = "Enter a valid email address";

  if (!form.instituteType) errors.instituteType = "Select an institute type";
  if (!form.jobCategory) errors.jobCategory = "Select a profession";
  if (!form.jobRole) errors.jobRole = "Select a job role";
  if (!form.countryId) errors.countryId = "Select a country";
  if (!form.stateId) errors.stateId = "Select a state";
  if (!form.cityId) errors.cityId = "Select a city";

  return errors;
};

const EMPTY_FORM = {
  fullName: "",
  email: "",
  mobile: "",
  whatsapp: "",
  instituteType: "",
  jobCategory: "",
  jobRole: "",
  countryId: "",
  stateId: "",
  cityId: "",
  highestQualification: "",
  speciality: "",
  registrationNumber: "",
  totalExperience: "",
  currentDesignation: "",
  currentEmployer: "",
  currentSalary: "",
  expectedSalary: "",
  preferredLocation: "",
  willingToRelocate: false,
  availabilityToJoin: "",
  consentGiven: false,
  document: null,
};

const FieldRow = ({ label, required, error, children, fullWidth }) => (
  <div className={`grid grid-cols-[160px_1fr] items-start gap-3 ${fullWidth ? "md:col-span-2" : ""}`}>
    <label className={`${FIELD_LABEL} pt-2`}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="min-w-0">
      {children}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </div>
  </div>
);

const SelectInput = ({ value, onChange, disabled, placeholder, options }) => (
  <div className="relative">
    <select value={value} onChange={onChange} disabled={disabled} className={selectClass}>
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

const SectionTitle = ({ children }) => (
  <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
    {children}
  </h3>
);

/* ========================================================= */

export default function EditJobSeeker() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();
  const fileRef = useRef(null);

  const isAdmin = pathname.startsWith("/admin");
  const detailPath = isAdmin ? `/admin/jobseekers` : `/jobseeker/profile`;

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [serverError, setServerError] = useState("");
  const [modal, setModal] = useState(null);

  const [instituteTypes, setInstituteTypes] = useState([]);
  const [jobCategories, setJobCategories] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  /* ---------- modal helpers (same pattern as AddJobSeeker) ---------- */

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

  /* ---------- load masters ---------- */

  useEffect(() => {
    let cancelled = false;

    const loadMasters = async () => {
      setLoadingMasters(true);
      try {
        const [institute, country, state, city] = await Promise.all([
          instituteTypeApi.getAllList(),
          countryMasterApi.getAllList(),
          stateMasterApi.getAllList(),
          cityMasterApi.getAllList(),
        ]);
        if (!cancelled) {
          setInstituteTypes(extractList(institute));
          setCountries(extractList(country));
          setStates(extractList(state));
          setCities(extractList(city));
        }
      } catch (err) {
        if (!cancelled) {
          openStatus("error", getApiErrorMessage(err) || "Unable to load dropdown options.");
        }
      } finally {
        if (!cancelled) setLoadingMasters(false);
      }
    };

    loadMasters();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- load jobseeker record ---------- */

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
          setServerError(getApiErrorMessage(err) || "Unable to load jobseeker details.");
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

  /* ---------- dependent dropdowns ---------- */

  useEffect(() => {
    let cancelled = false;
    setJobCategories([]);

    if (!form.instituteType) return undefined;

    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await jobCategoryApi.getByInstituteType(Number(form.instituteType));
        if (!cancelled) {
          setJobCategories(
            toOptions(
              extractList(response),
              ["jC_job_category_id", "JC_job_category_id"],
              ["jC_name", "JC_name", "name"],
            ),
          );
        }
      } catch (err) {
        if (!cancelled) setJobCategories([]);
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [form.instituteType]);

  useEffect(() => {
    let cancelled = false;
    setJobRoles([]);

    if (!form.jobCategory) return undefined;

    const loadRoles = async () => {
      setLoadingRoles(true);
      try {
        const response = await jobRoleApi.getByJobCategory(Number(form.jobCategory));
        if (!cancelled) {
          setJobRoles(
            toOptions(
              extractList(response),
              ["jR_job_role_id", "JR_job_role_id"],
              ["jR_name", "JR_name", "name"],
            ),
          );
        }
      } catch (err) {
        if (!cancelled) setJobRoles([]);
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    };

    loadRoles();
    return () => {
      cancelled = true;
    };
  }, [form.jobCategory]);

  /* ---------- derived options ---------- */

  const instituteOptions = toOptions(instituteTypes, ["iT_institute_type_id"], ["iT_name"]);
  const countryOptions = toOptions(countries, ["cM_Id"], ["cM_CountryName"]);
  const stateOptions = toOptions(
    states.filter((s) => String(s.sM_CountryId) === String(form.countryId)),
    ["sM_Id"],
    ["sM_StateName"],
  );
  const cityOptions = toOptions(
    cities.filter((c) => String(c.ctM_StateId) === String(form.stateId)),
    ["ctM_Id"],
    ["ctM_CityName"],
  );
  const allCityOptions = toOptions(cities, ["ctM_Id"], ["ctM_CityName"]);

  /* ---------- input handlers ---------- */

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((c) => ({ ...c, [key]: value }));
    setErrors((c) => ({ ...c, [key]: undefined }));
  };

  const setMasterData = (key) => (e) => {
    const value = e.target.value;
    setForm((c) => ({
      ...c,
      [key]: value,
      ...(key === "instituteType" ? { jobCategory: "", jobRole: "" } : {}),
      ...(key === "jobCategory" ? { jobRole: "" } : {}),
      ...(key === "countryId" ? { stateId: "", cityId: "" } : {}),
      ...(key === "stateId" ? { cityId: "" } : {}),
    }));
    setErrors((c) => ({ ...c, [key]: undefined }));
  };

  const onPhone = (key) => (e) => {
    const clean = e.target.value.replace(/[^\d+\s]/g, "");
    setForm((c) => ({ ...c, [key]: clean }));
    setErrors((c) => ({ ...c, [key]: undefined }));
  };

  /* ---------- file ---------- */

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((c) => ({ ...c, document: "Only PDF, JPG, PNG, DOC or DOCX files are allowed" }));
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrors((c) => ({ ...c, document: `File must be smaller than ${MAX_FILE_MB} MB` }));
      return;
    }

    setForm((c) => ({
      ...c,
      document: { name: file.name, url: URL.createObjectURL(file), file },
    }));
    setErrors((c) => ({ ...c, document: undefined }));
  };

  /* ---------- save ---------- */

  const save = async () => {
    setServerError("");
    setSaving(true);

    try {
      const currentUserId = getCurrentUserId();

      const payload = {
        JB_jobseeker_id: Number(id) || 0,
        JB_full_name: form.fullName.trim(),
        Email: form.email.trim(),
        JB_mobile: form.mobile.replace(/\D/g, ""),
        JB_whatsapp: (form.whatsapp || form.mobile).replace(/\D/g, ""),
        JB_city_id: Number(form.cityId) || 0,
        JB_state_id: Number(form.stateId) || 0,
        JB_country_id: Number(form.countryId) || 0,
        JB_institute_type_id: Number(form.instituteType) || 0,
        JB_job_category_id: Number(form.jobCategory) || 0,
        JB_job_role_id: Number(form.jobRole) || 0,
        JB_highest_qualification: form.highestQualification.trim(),
        JB_speciality: form.speciality.trim(),
        JB_registration_number: form.registrationNumber.trim(),
        JB_total_experience: Number(form.totalExperience) || 0,
        JB_current_designation: form.currentDesignation.trim(),
        JB_current_employer: form.currentEmployer.trim(),
        JB_current_salary: Number(form.currentSalary) || 0,
        JB_expected_salary: Number(form.expectedSalary) || 0,
        JB_preferred_location: Number(form.preferredLocation) || 0,
        JB_willing_to_relocate: Boolean(form.willingToRelocate),
        JB_availability_to_join: form.availabilityToJoin
          ? `${form.availabilityToJoin}T00:00:00`
          : null,
        JB_consent_given: Boolean(form.consentGiven),
        ...(currentUserId !== null ? { JB_updated_by: currentUserId } : {}),
      };

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        formData.append(key, String(value));
      });

      if (form.document?.file) {
        formData.append("CVFile", form.document.file, form.document.file.name);
      }

      const response = await jobseekerApi.update(id, formData);

      openStatus(
        "update",
        response?.data?.message ||
          response?.data?.Message ||
          "Jobseeker updated successfully.",
        {
          confirmText: "Continue",
          onConfirm: () => navigate(detailPath),
        },
      );
    } catch (err) {
      const msg = getApiErrorMessage(err) || "Failed to update jobseeker. Please try again.";
      setServerError(msg);
      openStatus("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (saving) return;

    const foundErrors = validate(form);
    setErrors(foundErrors);

    if (Object.keys(foundErrors).length) {
      openStatus("warning", Object.values(foundErrors)[0] || "Please correct the highlighted fields.");
      return;
    }

    openConfirm({
      title: "Confirm update",
      message: "Are you sure you want to update this jobseeker?",
      confirmText: "Update",
      onConfirm: save,
    });
  };

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
              <h2 className="font-semibold text-slate-800">Edit Jobseeker</h2>
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
            <form onSubmit={submit} noValidate className="space-y-6 p-4">
              {/* PERSONAL DETAILS */}
              <section>
                <SectionTitle>Personal Details</SectionTitle>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow label="Full Name" required error={errors.fullName}>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={set("fullName")}
                      disabled={saving}
                      placeholder="Your full name"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Email" required error={errors.email}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      disabled={saving}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Mobile Number" required error={errors.mobile}>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={form.mobile}
                      onChange={onPhone("mobile")}
                      disabled={saving}
                      placeholder="+91 98765 43210"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="WhatsApp Number">
                    <input
                      type="tel"
                      inputMode="tel"
                      value={form.whatsapp}
                      onChange={onPhone("whatsapp")}
                      disabled={saving}
                      placeholder="Same as mobile if left blank"
                      className={inputClass}
                    />
                  </FieldRow>
                </div>
              </section>

              {/* PROFESSIONAL DETAILS */}
              <section>
                <SectionTitle>Professional Details</SectionTitle>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow label="Institute Type" required error={errors.instituteType}>
                    <SelectInput
                      value={form.instituteType}
                      onChange={setMasterData("instituteType")}
                      disabled={saving || loadingMasters}
                      placeholder={loadingMasters ? "Loading institute types..." : "Select Institute Type"}
                      options={instituteOptions}
                    />
                  </FieldRow>

                  <FieldRow label="Job Category" required error={errors.jobCategory}>
                    <SelectInput
                      value={form.jobCategory}
                      onChange={setMasterData("jobCategory")}
                      disabled={saving || loadingCategories || !form.instituteType}
                      placeholder={
                        !form.instituteType
                          ? "Select Institute Type first"
                          : loadingCategories
                            ? "Loading professions..."
                            : "Select Profession"
                      }
                      options={jobCategories}
                    />
                  </FieldRow>

                  <FieldRow label="Job Role" required error={errors.jobRole}>
                    <SelectInput
                      value={form.jobRole}
                      onChange={setMasterData("jobRole")}
                      disabled={saving || loadingRoles || !form.jobCategory}
                      placeholder={
                        !form.jobCategory
                          ? "Select Profession first"
                          : loadingRoles
                            ? "Loading job roles..."
                            : "Select Job Role"
                      }
                      options={jobRoles}
                    />
                  </FieldRow>

                  <FieldRow label="Highest Qualification">
                    <input
                      type="text"
                      value={form.highestQualification}
                      onChange={set("highestQualification")}
                      disabled={saving}
                      placeholder="MBBS, B.Sc Nursing"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Speciality">
                    <input
                      type="text"
                      value={form.speciality}
                      onChange={set("speciality")}
                      disabled={saving}
                      placeholder="e.g. Cardiology"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Registration Number">
                    <input
                      type="text"
                      value={form.registrationNumber}
                      onChange={set("registrationNumber")}
                      disabled={saving}
                      placeholder="MMC Reg. No."
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Total Experience (Years)">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.totalExperience}
                      onChange={set("totalExperience")}
                      disabled={saving}
                      placeholder="e.g. 5"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Current Designation">
                    <input
                      type="text"
                      value={form.currentDesignation}
                      onChange={set("currentDesignation")}
                      disabled={saving}
                      placeholder="Senior Resident"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Current Employer">
                    <input
                      type="text"
                      value={form.currentEmployer}
                      onChange={set("currentEmployer")}
                      disabled={saving}
                      placeholder="Current employer name"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Current Salary">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.currentSalary}
                      onChange={set("currentSalary")}
                      disabled={saving}
                      placeholder="0"
                      className={inputClass}
                    />
                  </FieldRow>
                </div>
              </section>

              {/* LOCATION */}
              <section>
                <SectionTitle>Location</SectionTitle>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow label="Country" required error={errors.countryId}>
                    <SelectInput
                      value={form.countryId}
                      onChange={setMasterData("countryId")}
                      disabled={saving || loadingMasters}
                      placeholder={loadingMasters ? "Loading countries..." : "Select Country"}
                      options={countryOptions}
                    />
                  </FieldRow>

                  <FieldRow label="State" required error={errors.stateId}>
                    <SelectInput
                      value={form.stateId}
                      onChange={setMasterData("stateId")}
                      disabled={saving || loadingMasters || !form.countryId}
                      placeholder={!form.countryId ? "Select Country first" : "Select State"}
                      options={stateOptions}
                    />
                  </FieldRow>

                  <FieldRow label="City" required error={errors.cityId}>
                    <SelectInput
                      value={form.cityId}
                      onChange={setMasterData("cityId")}
                      disabled={saving || loadingMasters || !form.stateId}
                      placeholder={!form.stateId ? "Select State first" : "Select City"}
                      options={cityOptions}
                    />
                  </FieldRow>
                </div>
              </section>

              {/* PREFERENCES */}
              <section>
                <SectionTitle>Job Preferences</SectionTitle>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow label="Expected Salary">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.expectedSalary}
                      onChange={set("expectedSalary")}
                      disabled={saving}
                      placeholder="Expected annual salary"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Preferred Job Location">
                    <SelectInput
                      value={form.preferredLocation}
                      onChange={setMasterData("preferredLocation")}
                      disabled={saving || loadingMasters}
                      placeholder="Select Location"
                      options={allCityOptions}
                    />
                  </FieldRow>

                  <FieldRow label="Willing to Relocate">
                    <SelectInput
                      value={String(form.willingToRelocate)}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, willingToRelocate: e.target.value === "true" }))
                      }
                      disabled={saving}
                      placeholder="Select"
                      options={[
                        { value: "true", label: "Yes" },
                        { value: "false", label: "No" },
                      ]}
                    />
                  </FieldRow>

                  <FieldRow label="Availability to Join">
                    <input
                      type="date"
                      value={form.availabilityToJoin}
                      onChange={set("availabilityToJoin")}
                      disabled={saving}
                      className={inputClass}
                    />
                  </FieldRow>
                </div>
              </section>

              {/* DOCUMENT */}
              <section>
                <SectionTitle>Document Upload</SectionTitle>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow label="Resume / CV" error={errors.document} fullWidth>
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
                        disabled={saving}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#2f6b8a] bg-white px-4 py-2 text-sm font-medium text-[#2f6b8a] transition hover:bg-[#eaf2f7] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {form.document?.file ? "Change file" : "Replace file"}
                      </button>
                      <span className="truncate text-sm text-slate-600">
                        {form.document ? form.document.name : "No file chosen"}
                      </span>
                    </div>
                    <span className="mt-1 block text-xs text-slate-500">
                      PDF, JPG, PNG, DOC or DOCX, up to {MAX_FILE_MB} MB. Leave unchanged to keep the current file.
                    </span>
                  </FieldRow>
                </div>
              </section>

              {/* CONSENT */}
              <section>
                <div className="grid grid-cols-[160px_1fr] items-start gap-3">
                  <label className={FIELD_LABEL}>Consent</label>
                  <label className="flex items-start gap-2 text-[13px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.consentGiven}
                      onChange={(e) => setForm((c) => ({ ...c, consentGiven: e.target.checked }))}
                      disabled={saving}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2f6b8a] focus:ring-[#2f6b8a]"
                    />
                    <span>
                      I authorize Ishraq HR to use and share my professional profile and submitted
                      documents with potential employers for recruitment purposes.
                    </span>
                  </label>
                </div>
              </section>

              {/* FOOTER */}
              <div className="flex justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Update"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <StatusModal
        isOpen={Boolean(modal)}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        confirmText={modal?.confirmText}
        cancelText={modal?.cancelText}
        showCancel={modal?.showCancel}
        busy={saving}
        onConfirm={modal?.onConfirm}
        onCancel={modal?.onCancel}
      />
    </div>
  );
}