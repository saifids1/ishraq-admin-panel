import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronsLeft,
  LoaderCircle,
  Paperclip,
  Save,
  X as CloseIcon,
} from "lucide-react";

import {
  getJobRequirementById,
  updateJobRequirement,
} from "../../../api/jobRequirementApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import jobRoleApi from "../../../api/Services/jobRoleApi";
import jobCategoryApi from "../../../api/Services/jobCategoryApi";
import employmentTypeApi from "../../../api/Services/employmentTypeApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";

import StatusModal from "../../../components/common/StatusModal";

const MAX_FILE_MB = 5;
const LIST_PATH = "/employer/job-requirement-list";
const FORM_ID = "job-requirement-form";
const detailPath = (id) => `/employer/job-requirements/${id}`;

const selectClass = (hasError) =>
  `w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500 ${
    hasError ? "border-red-400" : "border-slate-300"
  }`;

const inputClass = (hasError) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500 ${
    hasError ? "border-red-400" : "border-slate-300"
  }`;

const FIELD_LABEL = "text-[13px] font-semibold text-black leading-tight";

/**
 * Deduplicate concurrent API calls (protects against React StrictMode
 * double-invoking effects while a request is still running).
 */
const inFlightRequests = new Map();

const requestOnce = (key, request) => {
  if (inFlightRequests.has(key)) return inFlightRequests.get(key);

  const promise = Promise.resolve()
    .then(request)
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);
  return promise;
};

/**
 * Cache full master lists (institute types, employment types, countries)
 * for the page session. States and cities are NOT loaded as full lists
 * except for the one-time fallback that finds a job's parent country/state.
 */
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

const emptyForm = {
  instituteTypeId: "",
  jobCategoryId: "",
  jobRoleId: "",
  position: "",
  department: "",
  vacancies: "",
  qualification: "",
  experience: "",
  salary: "",
  countryId: "",
  stateId: "",
  cityId: "",
  employmentTypeId: "",
  dutyHours: "",
  accommodation: "false",
  food: "false",
  joiningDate: "",
  deadline: "",
  description: "",
};

// When a parent selection changes, these children are cleared.
const CASCADE_RESETS = {
  instituteTypeId: ["jobCategoryId", "jobRoleId"],
  jobCategoryId: ["jobRoleId"],
  countryId: ["stateId", "cityId"],
  stateId: ["cityId"],
};

// Field names used by the master APIs. pick() also matches case-insensitively.
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
  employment: {
    id: ["eT_employment_type_id", "ET_employment_type_id"],
    label: ["eT_name", "ET_name"],
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

const YES_NO = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const pick = (obj, ...keys) => {
  if (!obj || typeof obj !== "object") return undefined;

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }

  // Case-insensitive fallback for PascalCase/camelCase differences.
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

  return Array.isArray(result) ? result : [];
};

// Converts raw master rows into { value, label } options.
const toOptions = (list, config) =>
  (Array.isArray(list) ? list : [])
    .map((item) => ({
      value: String(pick(item, ...config.id) ?? ""),
      label: String(pick(item, ...config.label) ?? ""),
    }))
    .filter((option) => option.value && option.label);

// Institute type -> Job Category.
const fetchCategories = (instituteTypeId) =>
  requestOnce(`categories:${instituteTypeId}`, async () =>
    toOptions(
      extractList(
        await jobCategoryApi.getByInstituteType(Number(instituteTypeId)),
      ),
      OPTION_CONFIG.category,
    ),
  );

// Job Category -> Job Role.
const fetchRoles = (jobCategoryId) =>
  requestOnce(`roles:${jobCategoryId}`, async () =>
    toOptions(
      extractList(await jobRoleApi.getByJobCategory(Number(jobCategoryId))),
      OPTION_CONFIG.role,
    ),
  );

// Country -> State: GET /StateMaster/all?countryId=
const fetchStates = (countryId) =>
  requestOnce(`states:${countryId}`, async () =>
    toOptions(
      extractList(await stateMasterApi.getByCountry(Number(countryId))),
      OPTION_CONFIG.state,
    ),
  );

// State -> City: GET /CityMaster/all?stateId=
const fetchCities = (stateId) =>
  requestOnce(`cities:${stateId}`, async () =>
    toOptions(
      extractList(await cityMasterApi.getByState(Number(stateId))),
      OPTION_CONFIG.city,
    ),
  );

// Loads options for a dropdown whenever its parent value changes.
const useDependentOptions = (parentValue, fetcher) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setOptions([]);
    if (!parentValue) {
      setLoading(false);
      return undefined;
    }

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

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  return (
    pick(data, "message", "Message", "title", "Title") ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};

/**
 * Resolve the job's country and state IDs.
 * Uses JQ_country_id / JQ_state_id when the API returns them. Otherwise
 * it looks up the city in the master list once to find its parents.
 */
const resolveLocation = async (item) => {
  let countryId = String(pick(item, "JQ_country_id") ?? "");
  let stateId = String(pick(item, "JQ_state_id") ?? "");
  const cityId = String(pick(item, "JQ_job_location") ?? "");

  if (countryId && stateId) return { countryId, stateId, cityId };

  if (!stateId && cityId) {
    const cityRows = await getMasterList(cityMasterApi);
    const cityRow = cityRows.find(
      (row) => String(pick(row, ...OPTION_CONFIG.city.id)) === cityId,
    );
    stateId = cityRow
      ? String(pick(cityRow, ...OPTION_CONFIG.city.parent) ?? "")
      : "";
  }

  if (!countryId && stateId) {
    const stateRows = await getMasterList(stateMasterApi);
    const stateRow = stateRows.find(
      (row) => String(pick(row, ...OPTION_CONFIG.state.id)) === stateId,
    );
    countryId = stateRow
      ? String(pick(stateRow, ...OPTION_CONFIG.state.parent) ?? "")
      : "";
  }

  return { countryId, stateId, cityId };
};

/* ---------------- Layout helpers ---------------- */

const FieldRow = ({ label, required, error, children, fullWidth }) => (
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

const SelectInput = ({
  value,
  onChange,
  disabled,
  placeholder,
  options,
  hasError,
}) => (
  <div className="relative">
    <select
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

const SectionTitle = ({ children }) => (
  <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
    {children}
  </h3>
);

/* ========================================================= */

export default function JobRequirementEdit() {
  const fileInputRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(undefined);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [modal, setModal] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [existingAttachmentPath, setExistingAttachmentPath] = useState("");
  const [masters, setMasters] = useState({
    institute: [],
    employment: [],
    country: [],
  });

  // Dependent dropdowns load from their parent selections.
  const categories = useDependentOptions(form.instituteTypeId, fetchCategories);
  const roles = useDependentOptions(form.jobCategoryId, fetchRoles);
  const states = useDependentOptions(form.countryId, fetchStates);
  const cities = useDependentOptions(form.stateId, fetchCities);

  /* ---------- modal helpers ---------- */

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

  /* ---------- field change with cascade resets ---------- */

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

  /* ---------- load job requirement and master lists ---------- */

  useEffect(() => {
    let cancelled = false;

    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setJob(null);
      openStatus("error", "Invalid job requirement ID.");
      setLoadingPage(false);
      return undefined;
    }

    const load = async () => {
      setLoadingPage(true);

      try {
        const [jobResponse, instituteRes, employmentRes, countryRes] =
          await Promise.all([
            requestOnce(`job-requirement:${numericId}`, () =>
              getJobRequirementById(numericId),
            ),
            getMasterList(instituteTypeApi),
            getMasterList(employmentTypeApi),
            getMasterList(countryMasterApi),
          ]);

        const item = unwrap(jobResponse);

        if (
          !item ||
          typeof item !== "object" ||
          !pick(item, "JQ_job_requirement_id", "id")
        ) {
          throw new Error("Job requirement not found.");
        }

        const { countryId, stateId, cityId } = await resolveLocation(item);

        if (cancelled) return;

        setMasters({
          institute: toOptions(instituteRes, OPTION_CONFIG.institute),
          employment: toOptions(employmentRes, OPTION_CONFIG.employment),
          country: toOptions(countryRes, OPTION_CONFIG.country),
        });

        setJob(item);
        setForm({
          instituteTypeId: String(pick(item, "JQ_institute_type_id") ?? ""),
          jobCategoryId: String(pick(item, "JQ_job_category_id") ?? ""),
          jobRoleId: String(pick(item, "JQ_job_role_id") ?? ""),
          position: pick(item, "JQ_position_title") ?? "",
          department: pick(item, "JQ_department_speciality") ?? "",
          vacancies: String(pick(item, "JQ_vacancies") ?? ""),
          qualification: pick(item, "JQ_qualification_required") ?? "",
          experience: pick(item, "JQ_experience_required") ?? "",
          salary: pick(item, "JQ_salary_range") ?? "",
          countryId,
          stateId,
          cityId,
          employmentTypeId: String(pick(item, "JQ_employment_type_id") ?? ""),
          dutyHours: pick(item, "JQ_duty_hours") ?? "",
          accommodation: toBooleanString(pick(item, "JQ_accommodation")),
          food: toBooleanString(pick(item, "JQ_food_facility")),
          joiningDate: toDateInput(pick(item, "JQ_expected_joining_date")),
          deadline: toDateInput(pick(item, "JQ_deadline")),
          description: pick(item, "JQ_description") ?? "",
        });

        setExistingAttachmentPath(pick(item, "JQ_jd_file_path") ?? "");
      } catch (error) {
        if (!cancelled) {
          setJob(null);
          openStatus("error", getErrorMessage(error));
        }
      } finally {
        if (!cancelled) setLoadingPage(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ---------- attachment ---------- */

  const onAttachmentChange = (event) => {
    const selected = event.target.files?.[0] || null;

    if (selected) {
      const validExtension = /\.(pdf|doc|docx)$/i.test(selected.name);

      if (!validExtension) {
        openStatus("warning", "Only PDF, DOC, or DOCX files are allowed.");
        event.target.value = "";
        setAttachment(null);
        return;
      }

      if (selected.size > MAX_FILE_MB * 1024 * 1024) {
        openStatus("warning", `Attachment must be ${MAX_FILE_MB} MB or smaller.`);
        event.target.value = "";
        setAttachment(null);
        return;
      }
    }

    setAttachment(selected);
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ---------- validation ---------- */

  const validateForm = () => {
    const next = {};

    if (!form.jobCategoryId) next.jobCategoryId = "Job category is required.";
    if (!form.jobRoleId) next.jobRoleId = "Job role is required.";
    if (!form.position.trim()) next.position = "Position title is required.";
    if (!form.vacancies || Number(form.vacancies) < 1) {
      next.vacancies = "Enter at least one vacancy.";
    }
    if (!form.employmentTypeId) {
      next.employmentTypeId = "Employment type is required.";
    }
    if (!form.countryId) next.countryId = "Country is required.";
    if (!form.stateId) next.stateId = "State is required.";
    if (!form.cityId) next.cityId = "City is required.";

    // Each selected value must exist in the list loaded for its parent.
    // Skipped while that list is still loading.
    if (
      form.countryId &&
      !masters.country.some((c) => c.value === form.countryId)
    ) {
      next.countryId = "Select a valid country.";
    }
    if (
      form.stateId &&
      !states.loading &&
      !states.options.some((s) => s.value === form.stateId)
    ) {
      next.stateId = "Select a state for the selected country.";
    }
    if (
      form.cityId &&
      !cities.loading &&
      !cities.options.some((c) => c.value === form.cityId)
    ) {
      next.cityId = "Select a city for the selected state.";
    }

    setErrors(next);
    return next;
  };

  /* ---------- save ---------- */

  const save = async () => {
    const employerId = Number(pick(job, "JQ_employer_id"));

    const payload = new FormData();

    payload.append("JQ_employer_id", String(employerId));
    payload.append("JQ_institute_type_id", form.instituteTypeId);
    payload.append("JQ_job_category_id", form.jobCategoryId);
    payload.append("JQ_job_role_id", form.jobRoleId);
    payload.append("JQ_position_title", form.position.trim());
    payload.append("JQ_vacancies", String(Number(form.vacancies)));
    payload.append("JQ_employment_type_id", form.employmentTypeId);
    payload.append("JQ_job_location", form.cityId);
    payload.append("JQ_accommodation", String(form.accommodation === "true"));
    payload.append("JQ_food_facility", String(form.food === "true"));

    // Optional fields are always sent, so a cleared value is saved as empty.
    payload.append("JQ_department_speciality", form.department.trim());
    payload.append("JQ_qualification_required", form.qualification.trim());
    payload.append("JQ_experience_required", form.experience.trim());
    payload.append("JQ_salary_range", form.salary.trim());
    payload.append("JQ_duty_hours", form.dutyHours.trim());
    payload.append("JQ_description", form.description.trim());
    payload.append(
      "JQ_deadline",
      form.deadline ? `${form.deadline}T00:00:00` : "",
    );
    payload.append(
      "JQ_expected_joining_date",
      form.joiningDate ? `${form.joiningDate}T00:00:00` : "",
    );

    if (attachment) payload.append("Attachment", attachment);

    setSaving(true);

    try {
      await updateJobRequirement(id, payload);

      openStatus("update", "Job requirement updated successfully.", {
        confirmText: "Continue",
        onConfirm: () => navigate(detailPath(id)),
      });
    } catch (error) {
      openStatus("error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (saving) return;

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length) {
      openStatus(
        "warning",
        Object.values(validationErrors)[0] || "Please fix the highlighted fields.",
      );
      return;
    }

    const employerId = Number(pick(job, "JQ_employer_id"));
    if (!Number.isInteger(employerId) || employerId <= 0) {
      openStatus(
        "error",
        "Unable to identify the employer. Please log in again.",
      );
      return;
    }

    openConfirm({
      title: "Confirm update",
      message: "Are you sure you want to update this job requirement?",
      confirmText: "Update",
      onConfirm: save,
    });
  };

  /* ---------- field helpers ---------- */

  const renderSelect = ({
    name,
    label,
    required = false,
    options,
    loading = false,
    disabled = false,
    placeholder,
    fullWidth = false,
  }) => (
    <FieldRow
      label={label}
      required={required}
      error={errors[name]}
      fullWidth={fullWidth}
    >
      <SelectInput
        value={form[name] ?? ""}
        onChange={(event) => change(name, event.target.value)}
        disabled={saving || disabled || loading}
        placeholder={loading ? "Loading..." : placeholder}
        options={options}
        hasError={Boolean(errors[name])}
      />
    </FieldRow>
  );

  const renderInput = ({
    name,
    label,
    type = "text",
    required = false,
    min,
    fullWidth = false,
  }) => (
    <FieldRow
      label={label}
      required={required}
      error={errors[name]}
      fullWidth={fullWidth}
    >
      <input
        type={type}
        min={min}
        value={form[name] ?? ""}
        disabled={saving}
        onChange={(event) => change(name, event.target.value)}
        className={inputClass(Boolean(errors[name]))}
      />
    </FieldRow>
  );

  /* ---------- loading / error states ---------- */

  const modalElement = (
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
  );

  const header = (
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
        <h2 className="font-semibold text-slate-800">Edit Job Requirement</h2>
      </div>
    </div>
  );

  if (loadingPage) {
    return (
      <div className="min-h-full bg-[#f4f8fb]">
        <div className="mx-auto">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {header}
            <div className="p-8 text-center text-sm text-slate-500">
              Loading job requirement...
            </div>
          </div>
        </div>
        {modalElement}
      </div>
    );
  }

  if (job === null) {
    return (
      <div className="min-h-full bg-[#f4f8fb]">
        <div className="mx-auto">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {header}
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                Job requirement not found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                This job requirement could not be loaded.
              </p>
              <button
                type="button"
                onClick={() => navigate(LIST_PATH)}
                className="mt-4 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
              >
                Back to list
              </button>
            </div>
          </div>
        </div>
        {modalElement}
      </div>
    );
  }

  const instituteTypeName = pick(job, "instituteTypeName") ?? "-";
  const existingAttachmentName = existingAttachmentPath
    ? existingAttachmentPath.split(/[\\/]/).pop()
    : "";

  /* ----------------------------- UI ----------------------------- */

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* HEADER */}
          <div className="flex flex-wrap justify-between gap-3 border-b border-slate-200 px-6 py-4">
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
                Edit Job Requirement
              </h2>
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate(detailPath(id))}
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              {/* Submit button lives outside the form, so it targets the form by id */}
              <button
                type="submit"
                form={FORM_ID}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <form
            id={FORM_ID}
            onSubmit={submit}
            noValidate
            autoComplete="off"
            className="space-y-6 p-4"
          >
            {/* JOB INFORMATION */}
            <section>
              <SectionTitle>Job Information</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow label="Job Type">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={instituteTypeName}
                    className={`${inputClass(false)} bg-slate-50`}
                  />
                </FieldRow>

                {renderSelect({
                  name: "jobCategoryId",
                  label: "Job Category",
                  required: true,
                  options: categories.options,
                  loading: categories.loading,
                  disabled: !form.instituteTypeId,
                  placeholder: form.instituteTypeId
                    ? "Select Job Category"
                    : "Select Job Type First",
                })}

                {renderSelect({
                  name: "jobRoleId",
                  label: "Job Role",
                  required: true,
                  options: roles.options,
                  loading: roles.loading,
                  disabled: !form.jobCategoryId,
                  placeholder: form.jobCategoryId
                    ? "Select Job Role"
                    : "Select Job Category First",
                })}

                {renderInput({
                  name: "position",
                  label: "Position Title",
                  required: true,
                })}

                {renderInput({
                  name: "department",
                  label: "Department / Speciality",
                })}

                {renderInput({
                  name: "vacancies",
                  label: "Number of Vacancies",
                  type: "number",
                  required: true,
                  min: 1,
                })}

                {renderSelect({
                  name: "employmentTypeId",
                  label: "Employment Type",
                  required: true,
                  options: masters.employment,
                  placeholder: "Select Employment Type",
                })}

                {renderInput({
                  name: "qualification",
                  label: "Qualification Required",
                })}

                {renderInput({
                  name: "experience",
                  label: "Experience Required",
                })}

                {renderInput({
                  name: "salary",
                  label: "Salary Range",
                })}

                {renderInput({
                  name: "dutyHours",
                  label: "Duty Hours",
                })}
              </div>
            </section>

            {/* FACILITIES & DATES */}
            <section>
              <SectionTitle>Facilities & Dates</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                {renderSelect({
                  name: "accommodation",
                  label: "Accommodation",
                  options: YES_NO,
                  placeholder: "Select",
                })}

                {renderSelect({
                  name: "food",
                  label: "Food Facility",
                  options: YES_NO,
                  placeholder: "Select",
                })}

                {renderInput({
                  name: "joiningDate",
                  label: "Expected Joining Date",
                  type: "date",
                })}

                {renderInput({
                  name: "deadline",
                  label: "Application Deadline",
                  type: "date",
                })}
              </div>
            </section>

            {/* LOCATION: Country -> State -> City */}
            <section>
              <SectionTitle>Job Location</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                {renderSelect({
                  name: "countryId",
                  label: "Country",
                  required: true,
                  options: masters.country,
                  placeholder: "Select Country",
                })}

                {renderSelect({
                  name: "stateId",
                  label: "State",
                  required: true,
                  options: states.options,
                  loading: states.loading,
                  disabled: !form.countryId,
                  placeholder: form.countryId
                    ? "Select State"
                    : "Select Country First",
                })}

                {renderSelect({
                  name: "cityId",
                  label: "City",
                  required: true,
                  options: cities.options,
                  loading: cities.loading,
                  disabled: !form.stateId,
                  placeholder: form.stateId
                    ? "Select City"
                    : "Select State First",
                })}
              </div>
            </section>

            {/* DESCRIPTION & ATTACHMENT */}
            <section>
              <SectionTitle>Description & Attachment</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow label="Job Description" fullWidth>
                  <textarea
                    rows={5}
                    value={form.description}
                    disabled={saving}
                    onChange={(event) =>
                      change("description", event.target.value)
                    }
                    className={`${inputClass(false)} resize-y`}
                  />
                </FieldRow>

                <FieldRow label="Upload Job Description" fullWidth>
                  {existingAttachmentName && (
                    <p className="mb-2 text-xs text-slate-500">
                      Current file: {existingAttachmentName}. Choose a new file
                      to replace it.
                    </p>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx"
                    onChange={onAttachmentChange}
                  />

                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#2f6b8a] bg-white px-4 py-2 text-sm font-medium text-[#2f6b8a] transition hover:bg-[#eaf2f7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Paperclip size={15} />
                      {attachment ? "Change file" : "Choose file"}
                    </button>

                    <span className="truncate text-sm text-slate-600">
                      {attachment ? attachment.name : "No new file chosen"}
                    </span>

                    {attachment && (
                      <button
                        type="button"
                        onClick={removeAttachment}
                        disabled={saving}
                        aria-label="Remove file"
                        className="text-slate-500 hover:text-red-600 disabled:opacity-60"
                      >
                        <CloseIcon size={14} />
                      </button>
                    )}
                  </div>

                  <span className="mt-1 block text-xs text-slate-500">
                    PDF, DOC or DOCX, up to {MAX_FILE_MB} MB. Leave unchanged to
                    keep the current file.
                  </span>
                </FieldRow>
              </div>
            </section>
          </form>
        </div>
      </div>

      {modalElement}
    </div>
  );
}