import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Globe,
  GraduationCap,
  Hotel,
  Layers,
  LoaderCircle,
  MapPin,
  Paperclip,
  Save,
  Tag,
  Timer,
  Users,
  Utensils,
  Wallet,
  Pencil,
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

import SelectField from "../../../components/common/SelectField";
import {
  ACCENT,
  Card,
  Field,
  IconField,
  PageHeader,
  Pill,
  Toast,
  inputClass,
} from "../../../components/common/FormUi";

/**
 * Deduplicate concurrent API calls.
 * Prevents React StrictMode from triggering duplicate requests
 * while an earlier request is still running.
 */
const inFlightRequests = new Map();

const requestOnce = (key, request) => {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const promise = Promise.resolve()
    .then(request)
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);
  return promise;
};

/**
 * Cache master-list requests for this page session.
 * State and city lists are reused by the initial page load
 * and their dependent dropdowns.
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
  jobRoleId: "",
  jobCategoryId: "",
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
  jobRoleId: ["jobCategoryId"],
  countryId: ["stateId", "cityId"],
  stateId: ["cityId"],
};

// Field names used by the master APIs. Values are checked case-insensitively by pick().
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

  // A single category object instead of an array.
  if (
    result &&
    typeof result === "object" &&
    pick(result, "jC_job_category_id", "JC_job_category_id") !== undefined
  ) {
    return [result];
  }

  return Array.isArray(result) ? result : [];
};

// Converts raw master rows into { value, label } options.
// parentValue filters rows by their parent ID (country for states, state for cities).
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

// const getMasterList = async (api) => extractList(await api.getAllList());

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

// Loads options for a dropdown whenever its parent value changes.
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

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  return (
    pick(data, "message", "Message", "title", "Title") ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};

export default function JobRequirementEdit() {
  const fileInputRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(undefined);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [toast, setToast] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [existingAttachmentPath, setExistingAttachmentPath] = useState("");
  const [masters, setMasters] = useState({
    institute: [],
    employment: [],
    country: [],
  });

  // Dependent dropdowns load from the parent selections.
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

  // Load the job requirement and the master lists it depends on.
  useEffect(() => {
    let cancelled = false;

    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setJob(null);
      setToast({ tone: "bad", msg: "Invalid job requirement ID." });
      setLoadingPage(false);
      return undefined;
    }

    const load = async () => {
      setLoadingPage(true);

      try {
        const [
          jobResponse,
          instituteRes,
          employmentRes,
          countryRes,
          stateRes,
          cityRes,
        ] = await Promise.all([
          requestOnce(`job-requirement:${numericId}`, () =>
            getJobRequirementById(numericId),
          ),
          getMasterList(instituteTypeApi),
          getMasterList(employmentTypeApi),
          getMasterList(countryMasterApi),
          getMasterList(stateMasterApi),
          getMasterList(cityMasterApi),
        ]);

        const item = unwrap(jobResponse);

        if (
          !item ||
          typeof item !== "object" ||
          !pick(item, "JQ_job_requirement_id", "id")
        ) {
          throw new Error("Job requirement not found.");
        }

        if (cancelled) return;

        // The job response only has the city ID, so derive state and country from the masters.
        const rawStates = stateRes;
        const rawCities = cityRes;
        const jobCityId = String(pick(item, "JQ_job_location") ?? "");

        const city = rawCities.find(
          (row) => String(pick(row, ...OPTION_CONFIG.city.id)) === jobCityId,
        );
        const stateId = city
          ? String(pick(city, ...OPTION_CONFIG.city.parent) ?? "")
          : "";

        const state = rawStates.find(
          (row) => String(pick(row, ...OPTION_CONFIG.state.id)) === stateId,
        );
        const countryId = state
          ? String(pick(state, ...OPTION_CONFIG.state.parent) ?? "")
          : "";

        setMasters({
          institute: toOptions(instituteRes, OPTION_CONFIG.institute),
          employment: toOptions(employmentRes, OPTION_CONFIG.employment),
          country: toOptions(countryRes, OPTION_CONFIG.country),
        });

        setJob(item);
        setForm({
          instituteTypeId: String(pick(item, "JQ_institute_type_id") ?? ""),
          jobRoleId: String(pick(item, "JQ_job_role_id") ?? ""),
          jobCategoryId: String(pick(item, "JQ_job_category_id") ?? ""),
          position: pick(item, "JQ_position_title") ?? "",
          department: pick(item, "JQ_department_speciality") ?? "",
          vacancies: String(pick(item, "JQ_vacancies") ?? ""),
          qualification: pick(item, "JQ_qualification_required") ?? "",
          experience: pick(item, "JQ_experience_required") ?? "",
          salary: pick(item, "JQ_salary_range") ?? "",
          countryId,
          stateId,
          cityId: jobCityId,
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
          setToast({ tone: "bad", msg: getErrorMessage(error) });
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

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const onAttachmentChange = (event) => {
    const selected = event.target.files?.[0] || null;

    if (selected) {
      const validExtension = /\.(pdf|doc|docx)$/i.test(selected.name);

      if (!validExtension) {
        setErrors((current) => ({
          ...current,
          attachment: "Only PDF, DOC, or DOCX files are allowed.",
        }));
        event.target.value = "";
        setAttachment(null);
        return;
      }

      if (selected.size > 5 * 1024 * 1024) {
        setErrors((current) => ({
          ...current,
          attachment: "Attachment must be 5 MB or smaller.",
        }));
        event.target.value = "";
        setAttachment(null);
        return;
      }
    }

    setAttachment(selected);
    setErrors((current) => ({ ...current, attachment: undefined }));
  };

  const validateForm = () => {
    const next = {};

    if (!form.jobRoleId) next.jobRoleId = "Job role is required.";
    if (!form.jobCategoryId) next.jobCategoryId = "Job category is required.";
    if (!form.position.trim()) next.position = "Position title is required.";
    if (!form.vacancies || Number(form.vacancies) < 1) {
      next.vacancies = "Enter at least one vacancy.";
    }
    if (!form.employmentTypeId)
      next.employmentTypeId = "Employment type is required.";
    if (!form.countryId) next.countryId = "Country is required.";
    if (!form.stateId) next.stateId = "State is required.";
    if (!form.cityId) next.cityId = "City is required.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      setToast({ tone: "bad", msg: "Please fix the highlighted fields." });
      return;
    }

    const employerId = Number(pick(job, "JQ_employer_id"));
    if (!Number.isInteger(employerId) || employerId <= 0) {
      setToast({
        tone: "bad",
        msg: "Unable to identify the employer. Please log in again.",
      });
      return;
    }

    const payload = new FormData();

    payload.append("JQ_employer_id", String(employerId));
    payload.append("JQ_institute_type_id", form.instituteTypeId);
    payload.append("JQ_job_role_id", form.jobRoleId);
    payload.append("JQ_job_category_id", form.jobCategoryId);
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
    setToast(null);

    try {
      await updateJobRequirement(id, payload);

      setToast({ tone: "ok", msg: "Job requirement updated successfully." });

      setTimeout(() => {
        navigate(`/employer/job-requirements/${id}`);
      }, 700);
    } catch (error) {
      setToast({ tone: "bad", msg: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------ FIELD RENDERING --------------------- */

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
    <Field
      label={label}
      htmlFor={name}
      required={required}
      error={errors[name]}
    >
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

  const renderInput = ({
    name,
    label,
    icon,
    type = "text",
    required = false,
    min,
  }) => (
    <Field
      label={label}
      htmlFor={name}
      required={required}
      error={errors[name]}
    >
      <IconField icon={icon}>
        <input
          id={name}
          type={type}
          min={min}
          value={form[name] ?? ""}
          disabled={saving}
          onChange={(event) => change(name, event.target.value)}
          className={inputClass(Boolean(errors[name]))}
        />
      </IconField>
    </Field>
  );

  if (loadingPage) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white p-6">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <LoaderCircle
            className="animate-spin"
            style={{ color: ACCENT }}
            size={20}
          />
          Loading job requirement...
        </div>
      </div>
    );
  }

  if (job === null) {
    return (
      <div className=" bg-white p-4">
        <button
          type="button"
          onClick={() => navigate("/employer/job-requirement-list")}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to list
        </button>
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-5 text-red-700 shadow-sm">
          <h1 className="font-semibold">Job requirement not found</h1>
          <p className="mt-1 text-sm">
            This job requirement could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  const interestedCount = Number(
    pick(job, "applicantsCount", "applicantCount", "applicants") || 0,
  );
  const instituteTypeName = pick(job, "instituteTypeName") ?? "-";
  const existingAttachmentName = existingAttachmentPath
    ? existingAttachmentPath.split("/").pop()
    : "";

  return (
    <div className=" bg-white text-slate-800">
      <PageHeader
        title="Edit Job Requirement"
        onBack={() => navigate(-1)}
        right={
          <div className="flex items-center gap-2">
            <Pill icon={Users}>{interestedCount} interested</Pill>
            <Pill icon={Pencil}>Editing</Pill>
          </div>
        }
      />

      <form onSubmit={save} noValidate>
        <div className="grid grid-cols-1 gap-4">
          <Card title="Job Information" icon={Briefcase}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Job Type" htmlFor="jobType">
                <IconField icon={Building2}>
                  <input
                    id="jobType"
                    type="text"
                    readOnly
                    disabled
                    value={instituteTypeName}
                    className={`${inputClass(false)} bg-slate-50`}
                  />
                </IconField>
              </Field>

              {renderSelect({
                name: "jobRoleId",
                label: "Job Role",
                icon: Briefcase,
                required: true,
                options: roles.options,
                loading: roles.loading,
                disabled: !form.instituteTypeId,
                placeholder: "Select Job Role",
              })}

              {renderSelect({
                name: "jobCategoryId",
                label: "Job Category",
                icon: Tag,
                required: true,
                options: categories.options,
                loading: categories.loading,
                disabled: !form.jobRoleId,
                placeholder: "Select Job Category",
              })}

              {renderInput({
                name: "position",
                label: "Position Title",
                icon: ClipboardList,
                required: true,
              })}
              {renderInput({
                name: "department",
                label: "Department / Speciality",
                icon: Layers,
              })}
              {renderInput({
                name: "vacancies",
                label: "Number of Vacancies",
                icon: Users,
                type: "number",
                required: true,
                min: 1,
              })}
              {renderSelect({
                name: "employmentTypeId",
                label: "Employment Type",
                icon: Activity,
                required: true,
                options: masters.employment,
                placeholder: "Select Employment Type",
              })}
              {renderInput({
                name: "qualification",
                label: "Qualification Required",
                icon: GraduationCap,
              })}
              {renderInput({
                name: "experience",
                label: "Experience Required",
                icon: Clock,
              })}
              {renderInput({
                name: "salary",
                label: "Salary Range",
                icon: Wallet,
              })}
              {renderInput({
                name: "dutyHours",
                label: "Duty Hours",
                icon: Timer,
              })}
            </div>
          </Card>

          <Card title="Facilities & Dates" icon={CalendarDays}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {renderSelect({
                name: "accommodation",
                label: "Accommodation",
                icon: Hotel,
                options: YES_NO,
                placeholder: "Select",
              })}
              {renderSelect({
                name: "food",
                label: "Food Facility",
                icon: Utensils,
                options: YES_NO,
                placeholder: "Select",
              })}
              {renderInput({
                name: "joiningDate",
                label: "Expected Joining Date",
                icon: CalendarDays,
                type: "date",
              })}
              {renderInput({
                name: "deadline",
                label: "Application Deadline",
                icon: CalendarDays,
                type: "date",
              })}
            </div>
          </Card>

          <Card title="Job Location" icon={MapPin}>
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
                placeholder: "Select State",
              })}
              {renderSelect({
                name: "cityId",
                label: "City",
                icon: MapPin,
                required: true,
                options: cities.options,
                loading: cities.loading,
                disabled: !form.stateId,
                placeholder: "Select City",
              })}
            </div>
          </Card>

          <Card title="Description & Attachment" icon={FileText}>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Job Description" htmlFor="description">
                <textarea
                  id="description"
                  rows={5}
                  value={form.description}
                  disabled={saving}
                  onChange={(event) =>
                    change("description", event.target.value)
                  }
                  className={`${inputClass(false, false)} resize-y`}
                />
              </Field>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-slate-500">
                  Upload Job Description (optional)
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
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={onAttachmentChange}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(`/employer/job-requirements/${id}`)}
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
            {saving ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      <Toast toast={toast} />
    </div>
  );
}
