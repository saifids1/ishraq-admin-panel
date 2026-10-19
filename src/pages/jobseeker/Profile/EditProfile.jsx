import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Globe,
  GraduationCap,
  Hash,
  LoaderCircle,
  Mail,
  MapPin,
  Paperclip,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Tag,
  Type,
  UserRound,
  Wallet,
  X as CloseIcon,
} from "lucide-react";

import jobseekerApi from "../../../api/Services/adjobseekerApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import jobRoleApi from "../../../api/Services/jobRoleApi";
import jobCategoryApi from "../../../api/Services/jobCategoryApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";

import SelectField from "../../../components/common/SelectField";
import {
  ACCENT,
  Card,
  Field,
  IconField,
  PageHeader,
  Toast,
  inputClass,
} from "../../../components/common/FormUi";

const MAX_FILE = 5 * 1024 * 1024;

const YES_NO = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const emptyForm = {
  fullName: "",
  mobile: "",
  whatsapp: "",
  email: "",
  instituteTypeId: "",
  jobRoleId: "",
  jobCategoryId: "",
  highestQualification: "",
  speciality: "",
  registrationNumber: "",
  totalExperience: "",
  currentDesignation: "",
  currentEmployer: "",
  currentSalary: "",
  countryId: "",
  stateId: "",
  cityId: "",
  expectedSalary: "",
  preferredLocationId: "",
  willingToRelocate: "false",
  availabilityToJoin: "",
};

// When a parent selection changes, these children are cleared.
const CASCADE_RESETS = {
  instituteTypeId: ["jobRoleId", "jobCategoryId"],
  jobRoleId: ["jobCategoryId"],
  countryId: ["stateId", "cityId"],
  stateId: ["cityId"],
};

/* ---------------- Helpers (same pattern as Edit Job Requirement) ---------------- */

// Deduplicates concurrent calls, including StrictMode double effects.
const inFlightRequests = new Map();

const requestOnce = (key, request) => {
  if (inFlightRequests.has(key)) return inFlightRequests.get(key);

  const promise = Promise.resolve()
    .then(request)
    .finally(() => inFlightRequests.delete(key));

  inFlightRequests.set(key, promise);
  return promise;
};

// Caches master lists for the session so dependent dropdowns reuse them.
const masterListCache = new WeakMap();

const getMasterList = (api) => {
  if (!masterListCache.has(api)) {
    const promise = Promise.resolve()
      .then(() => api.getAllList())
      .then(extractList)
      .catch((error) => {
        masterListCache.delete(api);
        throw error;
      });

    masterListCache.set(api, promise);
  }

  return masterListCache.get(api);
};

const pick = (obj, ...keys) => {
  if (!obj || typeof obj !== "object") return undefined;

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }

  const existingKeys = Object.keys(obj);
  for (const key of keys) {
    const match = existingKeys.find(
      (existing) => existing.toLowerCase() === key.toLowerCase(),
    );
    if (match && obj[match] !== undefined && obj[match] !== null) {
      return obj[match];
    }
  }

  return undefined;
};

const unwrap = (response) => {
  let result = response;

  for (let i = 0; i < 3; i += 1) {
    if (!result || typeof result !== "object" || Array.isArray(result)) break;

    const nested = pick(result, "data", "Data");
    if (nested === undefined) break;
    result = nested;
  }

  return result;
};

const extractList = (response) => {
  let result = response;

  for (let i = 0; i < 4; i += 1) {
    if (Array.isArray(result)) return result;
    if (!result || typeof result !== "object") return [];

    const nested = pick(result, "data", "Data", "items", "Items", "results");
    if (nested === undefined || nested === result) break;
    result = nested;
  }

  if (
    result &&
    typeof result === "object" &&
    pick(result, "jC_job_category_id", "JC_job_category_id") !== undefined
  ) {
    return [result];
  }

  return Array.isArray(result) ? result : [];
};

// Field names used by the master APIs. Matched case-insensitively by pick().
const OPTION_CONFIG = {
  institute: {
    id: ["iT_institute_type_id", "IT_institute_type_id"],
    label: ["iT_name", "IT_name"],
  },
  role: {
    id: ["jR_job_role_id", "JR_job_role_id"],
    label: ["jR_name", "JR_name"],
  },
  category: {
    id: ["jC_job_category_id", "JC_job_category_id"],
    label: ["jC_name", "JC_name"],
  },
  country: {
    id: ["cM_Id", "CM_Id"],
    label: ["cM_CountryName", "CM_CountryName"],
  },
  state: {
    id: ["sM_Id", "SM_Id"],
    label: ["sM_StateName", "SM_StateName"],
    parent: ["sM_CountryId", "SM_CountryId"],
  },
  city: {
    id: ["ctM_Id", "CTM_Id"],
    label: ["ctM_CityName", "CTM_CityName"],
    parent: ["ctM_StateId", "CTM_StateId"],
  },
};

// Converts master rows into { value, label } options. parentValue filters by parent ID.
const toOptions = (list, config, parentValue) =>
  list
    .filter(
      (item) =>
        parentValue === undefined ||
        (config.parent &&
          String(pick(item, ...config.parent) ?? "") === String(parentValue)),
    )
    .map((item) => ({
      value: String(pick(item, ...config.id) ?? ""),
      label: String(pick(item, ...config.label) ?? ""),
    }))
    .filter((option) => option.value);

const fetchRoles = (instituteTypeId) =>
  requestOnce(`roles:${instituteTypeId}`, async () =>
    toOptions(
      extractList(await jobRoleApi.getByInstituteType(Number(instituteTypeId))),
      OPTION_CONFIG.role,
    ),
  );

const fetchCategories = (jobRoleId) =>
  requestOnce(`categories:${jobRoleId}`, async () =>
    toOptions(
      extractList(await jobCategoryApi.getByJobRole(Number(jobRoleId))),
      OPTION_CONFIG.category,
    ),
  );

const fetchStates = async (countryId) =>
  toOptions(
    await getMasterList(stateMasterApi),
    OPTION_CONFIG.state,
    String(countryId),
  );

const fetchCities = async (stateId) =>
  toOptions(
    await getMasterList(cityMasterApi),
    OPTION_CONFIG.city,
    String(stateId),
  );

// Loads a dropdown's options whenever its parent value changes.
const useDependentOptions = (parentValue, fetcher) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setOptions([]);
    if (!parentValue) return undefined;

    setLoading(true);

    fetcher(parentValue)
      .then((list) => {
        if (!cancelled) setOptions(list);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [parentValue, fetcher]);

  return { options, loading };
};

const toDateInput = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const toBooleanString = (value) => {
  if (value === true || value === 1) return "true";
  const text = String(value ?? "").toLowerCase();
  return text === "true" || text === "yes" || text === "1" ? "true" : "false";
};

const toText = (value) => (value === null || value === undefined ? "" : String(value));

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  return (
    pick(data, "message", "Message", "title", "Title") ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};

/* ---------------- Page ---------------- */

export default function JobseekerEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [seeker, setSeeker] = useState(undefined); // undefined = loading, null = not found
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [existingCvPath, setExistingCvPath] = useState("");
  const [masters, setMasters] = useState({
    institute: [],
    country: [],
    allCities: [],
  });

  // Dependent dropdowns, loaded from the parent selections.
  const roles = useDependentOptions(form.instituteTypeId, fetchRoles);
  const categories = useDependentOptions(form.jobRoleId, fetchCategories);
  const states = useDependentOptions(form.countryId, fetchStates);
  const cities = useDependentOptions(form.stateId, fetchCities);

  const change = (name, value) => {
    setForm((current) => {
      const next = { ...current, [name]: value };
      (CASCADE_RESETS[name] || []).forEach((child) => {
        next[child] = "";
      });
      return next;
    });

    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      (CASCADE_RESETS[name] || []).forEach((child) => delete next[child]);
      return next;
    });
  };

  /* LOAD JOBSEEKER + MASTER DATA */
  useEffect(() => {
    let cancelled = false;

    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setSeeker(null);
      setToast({ tone: "bad", msg: "Invalid jobseeker ID." });
      return undefined;
    }

    const load = async () => {
      try {
        const [response, institutes, countries, allCities] = await Promise.all([
          requestOnce(`jobseeker:${numericId}`, () => jobseekerApi.getById(numericId)),
          getMasterList(instituteTypeApi),
          getMasterList(countryMasterApi),
          getMasterList(cityMasterApi),
        ]);

        const item = unwrap(response);

        if (!item || typeof item !== "object" || !pick(item, "jB_jobseeker_id")) {
          throw new Error("Jobseeker not found.");
        }

        if (cancelled) return;

        setMasters({
          institute: toOptions(institutes, OPTION_CONFIG.institute),
          country: toOptions(countries, OPTION_CONFIG.country),
          allCities: toOptions(allCities, OPTION_CONFIG.city),
        });

        setSeeker(item);
        setForm({
          fullName: toText(pick(item, "fullName")),
          mobile: toText(pick(item, "mobile")),
          whatsapp: toText(pick(item, "jB_whatsapp")),
          email: toText(pick(item, "email")),
          instituteTypeId: toText(pick(item, "jB_institute_type_id")),
          jobRoleId: toText(pick(item, "jB_job_role_id")),
          jobCategoryId: toText(pick(item, "jB_job_category_id")),
          highestQualification: toText(pick(item, "jB_highest_qualification")),
          speciality: toText(pick(item, "jB_speciality")),
          registrationNumber: toText(pick(item, "jB_registration_number")),
          totalExperience: toText(pick(item, "jB_total_experience")),
          currentDesignation: toText(pick(item, "jB_current_designation")),
          currentEmployer: toText(pick(item, "jB_current_employer")),
          currentSalary: toText(pick(item, "jB_current_salary")),
          countryId: toText(pick(item, "jB_country_id")),
          stateId: toText(pick(item, "jB_state_id")),
          cityId: toText(pick(item, "jB_city_id")),
          expectedSalary: toText(pick(item, "jB_expected_salary")),
          preferredLocationId: toText(pick(item, "jB_preferred_location")),
          willingToRelocate: toBooleanString(pick(item, "jB_willing_to_relocate")),
          availabilityToJoin: toDateInput(pick(item, "jB_availability_to_join")),
        });

        setExistingCvPath(pick(item, "jB_cv_file_path") ?? "");
      } catch (error) {
        if (!cancelled) {
          setSeeker(null);
          setToast({ tone: "bad", msg: getErrorMessage(error) });
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!toast || toast.tone === "ok") return undefined;

    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  /* CV FILE */
  const onCvChange = (event) => {
    const selected = event.target.files?.[0] || null;

    if (selected) {
      if (!/\.(pdf|doc|docx|jpg|jpeg|png)$/i.test(selected.name)) {
        setToast({ tone: "bad", msg: "Only PDF, Word, or image files are allowed." });
        event.target.value = "";
        return;
      }

      if (selected.size > MAX_FILE) {
        setToast({ tone: "bad", msg: "File must be 5 MB or smaller." });
        event.target.value = "";
        return;
      }
    }

    setCvFile(selected);
  };

  const removeCv = () => {
    setCvFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* VALIDATION */
  const validateForm = () => {
    const next = {};

    if (!form.fullName.trim()) next.fullName = "Full name is required.";
    if (!form.mobile.trim()) next.mobile = "Mobile number is required.";
    if (!form.instituteTypeId) next.instituteTypeId = "Select an institute type.";
    if (!form.jobRoleId) next.jobRoleId = "Select a job role.";
    if (!form.jobCategoryId) next.jobCategoryId = "Select a job category.";
    if (!form.countryId) next.countryId = "Select a country.";
    if (!form.stateId) next.stateId = "Select a state.";
    if (!form.cityId) next.cityId = "Select a city.";

    if (form.totalExperience !== "" && Number(form.totalExperience) < 0) {
      next.totalExperience = "Experience cannot be negative.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /* SAVE */
  const save = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      setToast({ tone: "bad", msg: "Please fix the highlighted fields." });
      return;
    }

    const payload = new FormData();

    payload.append("fullName", form.fullName.trim());
    payload.append("mobile", form.mobile.trim());
    payload.append("JB_whatsapp", form.whatsapp.trim());
    payload.append("JB_institute_type_id", form.instituteTypeId);
    payload.append("JB_job_role_id", form.jobRoleId);
    payload.append("JB_job_category_id", form.jobCategoryId);
    payload.append("JB_highest_qualification", form.highestQualification.trim());
    payload.append("JB_speciality", form.speciality.trim());
    payload.append("JB_registration_number", form.registrationNumber.trim());
    payload.append("JB_total_experience", form.totalExperience || "0");
    payload.append("JB_current_designation", form.currentDesignation.trim());
    payload.append("JB_current_employer", form.currentEmployer.trim());
    payload.append("JB_current_salary", form.currentSalary || "");
    payload.append("JB_country_id", form.countryId);
    payload.append("JB_state_id", form.stateId);
    payload.append("JB_city_id", form.cityId);
    payload.append("JB_expected_salary", form.expectedSalary || "");
    payload.append("JB_preferred_location", form.preferredLocationId);
    payload.append("JB_willing_to_relocate", form.willingToRelocate);
    payload.append(
      "JB_availability_to_join",
      form.availabilityToJoin ? `${form.availabilityToJoin}T00:00:00` : "",
    );

    if (cvFile) payload.append("Attachment", cvFile);

    setSaving(true);
    setToast(null);

    try {
      await jobseekerApi.update(id, payload);

      setToast({ tone: "ok", msg: "Jobseeker profile updated successfully." });

      setTimeout(() => {
        navigate(`/jobseeker/profile/${id}`);
      }, 700);
    } catch (error) {
      setToast({ tone: "bad", msg: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  /* FIELD RENDERING */
  const renderInput = ({ name, label, icon, type = "text", required = false, disabled = false, min, step }) => (
    <Field label={label} htmlFor={name} required={required} error={errors[name]}>
      <IconField icon={icon}>
        <input
          id={name}
          type={type}
          min={min}
          step={step}
          value={form[name] ?? ""}
          disabled={saving || disabled}
          onChange={(event) => change(name, event.target.value)}
          className={`${inputClass(Boolean(errors[name]))} ${disabled ? "bg-slate-50" : ""}`}
        />
      </IconField>
    </Field>
  );

  const renderSelect = ({
    name,
    label,
    icon,
    required = false,
    options,
    loading = false,
    disabled = false,
    placeholder,
  }) => (
    <Field label={label} htmlFor={name} required={required} error={errors[name]}>
      <IconField icon={icon}>
        <SelectField
          value={form[name] ?? ""}
          onChange={(next) => change(name, next)}
          options={options}
          placeholder={loading ? "Loading..." : placeholder}
          disabled={disabled || loading || saving}
          hasError={Boolean(errors[name])}
        />
      </IconField>
    </Field>
  );

  if (seeker === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white p-6">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <LoaderCircle className="animate-spin" style={{ color: ACCENT }} size={20} />
          Loading jobseeker...
        </div>
      </div>
    );
  }

  if (seeker === null) {
    return (
      <div className="bg-white p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Go back
        </button>
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-5 text-red-700 shadow-sm">
          <h1 className="font-semibold">Jobseeker not found</h1>
          <p className="mt-1 text-sm">The record may have been removed.</p>
        </div>
        <Toast toast={toast} />
      </div>
    );
  }

  const consent = Boolean(pick(seeker, "jB_consent_given"));
  const existingCvName = existingCvPath ? existingCvPath.split("/").pop() : "";

  return (
    <div className="bg-white text-slate-800">
      <PageHeader title="Edit Jobseeker Profile" onBack={() => navigate(-1)} />

      <form onSubmit={save} noValidate>
        <div className="grid grid-cols-1 gap-4">
          <Card title="Personal Details" icon={UserRound}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {renderInput({ name: "fullName", label: "Full Name", icon: Type, required: true })}
              {renderInput({ name: "email", label: "Email", icon: Mail, type: "email", disabled: true })}
              {renderInput({ name: "mobile", label: "Mobile Number", icon: Phone, type: "tel", required: true })}
              {renderInput({ name: "whatsapp", label: "WhatsApp Number", icon: Phone, type: "tel" })}
            </div>
          </Card>

          <Card title="Location" icon={MapPin}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {renderSelect({
                name: "countryId",
                label: "Country",
                icon: Globe,
                required: true,
                options: masters.country,
                placeholder: "Select Country",
              })}
              {renderSelect({
                name: "stateId",
                label: "State",
                icon: MapPin,
                required: true,
                options: states.options,
                loading: states.loading,
                disabled: !form.countryId,
                placeholder: form.countryId ? "Select State" : "Select Country First",
              })}
              {renderSelect({
                name: "cityId",
                label: "City",
                icon: MapPin,
                required: true,
                options: cities.options,
                loading: cities.loading,
                disabled: !form.stateId,
                placeholder: form.stateId ? "Select City" : "Select State First",
              })}
            </div>
          </Card>

          <Card title="Professional Details" icon={Briefcase}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {renderSelect({
                name: "instituteTypeId",
                label: "Institute Type",
                icon: Building2,
                required: true,
                options: masters.institute,
                placeholder: "Select Institute Type",
              })}
              {renderSelect({
                name: "jobRoleId",
                label: "Job Role",
                icon: Briefcase,
                required: true,
                options: roles.options,
                loading: roles.loading,
                disabled: !form.instituteTypeId,
                placeholder: form.instituteTypeId ? "Select Job Role" : "Select Institute Type First",
              })}
              {renderSelect({
                name: "jobCategoryId",
                label: "Job Category",
                icon: Tag,
                required: true,
                options: categories.options,
                loading: categories.loading,
                disabled: !form.jobRoleId,
                placeholder: form.jobRoleId ? "Select Job Category" : "Select Job Role First",
              })}
              {renderInput({ name: "highestQualification", label: "Highest Qualification", icon: GraduationCap })}
              {renderInput({ name: "speciality", label: "Speciality / Department", icon: ClipboardList })}
              {renderInput({ name: "registrationNumber", label: "Registration Number", icon: Hash })}
              {renderInput({
                name: "totalExperience",
                label: "Total Experience (Years)",
                icon: CalendarDays,
                type: "number",
                min: 0,
                step: 0.5,
              })}
              {renderInput({ name: "currentDesignation", label: "Current Designation", icon: Briefcase })}
              {renderInput({ name: "currentEmployer", label: "Current Employer", icon: Building2 })}
              {renderInput({
                name: "currentSalary",
                label: "Current Salary",
                icon: Wallet,
                type: "number",
                min: 0,
              })}
            </div>
          </Card>

          <Card title="Preferences" icon={ClipboardList}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {renderInput({
                name: "expectedSalary",
                label: "Expected Salary",
                icon: Wallet,
                type: "number",
                min: 0,
              })}
              {renderSelect({
                name: "preferredLocationId",
                label: "Preferred Job Location",
                icon: MapPin,
                options: masters.allCities,
                placeholder: "Select Location",
              })}
              {renderSelect({
                name: "willingToRelocate",
                label: "Willing to Relocate",
                icon: Globe,
                options: YES_NO,
                placeholder: "Select",
              })}
              {renderInput({
                name: "availabilityToJoin",
                label: "Availability to Join",
                icon: CalendarDays,
                type: "date",
              })}
            </div>
          </Card>

          <Card title="CV / Resume" icon={FileText}>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">
                Upload CV (optional)
              </span>

              {existingCvName && (
                <p className="mb-2 text-xs text-slate-500">
                  Current file: {existingCvName}. Choose a new file to replace it.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed bg-[#f4f9fb] px-4 text-sm font-medium transition hover:bg-[#eaf3f7]"
                  style={{ color: ACCENT, borderColor: ACCENT }}
                >
                  <Paperclip size={15} />
                  Choose file
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={onCvChange}
                  className="hidden"
                />

                {cvFile ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#eaf3f7] px-3 py-1 text-xs text-slate-700">
                    {cvFile.name}
                    <button
                      type="button"
                      onClick={removeCv}
                      aria-label="Remove CV"
                      className="text-slate-500 hover:text-red-600"
                    >
                      <CloseIcon size={14} />
                    </button>
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">PDF, Word or image, up to 5 MB</span>
                )}
              </div>
            </div>
          </Card>

          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                consent ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}
            >
              <ShieldCheck size={16} />
            </span>
            <p className="m-0 pt-1">
              {consent
                ? "You authorized Ishraq HR to share your profile and documents with potential employers."
                : "You have not given consent to share your profile with employers."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(`/jobseeker/profile/${id}`)}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      <Toast toast={toast} />
    </div>
  );
}