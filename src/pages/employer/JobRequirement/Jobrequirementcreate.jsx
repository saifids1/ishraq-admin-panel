import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronsLeft,
  LoaderCircle,
  Paperclip,
  Plus,
  X as CloseIcon,
} from "lucide-react";

import { validate } from "./Jobrequirementdata";
import { createJobRequirement } from "../../../api/jobRequirementApi";

import jobRoleApi from "../../../api/Services/jobRoleApi";
import jobCategoryApi from "../../../api/Services/jobCategoryApi";
import employmentTypeApi from "../../../api/Services/employmentTypeApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";

import { getCurrentUserId } from "../../../utils/authUtils";
import {
  getPayload,
  extractEmployerRecord,
  normalizeEmployer,
  getEmployerRequest,
} from "../../../utils/employerProfile";

import StatusModal from "../../../components/common/StatusModal";

const LIST_PATH = "/employer/job-requirement-list";
const MAX_FILE_MB = 5;

const selectClass = (hasError) =>
  `w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500 ${
    hasError ? "border-red-400" : "border-slate-300"
  }`;

const inputClass = (hasError) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500 ${
    hasError ? "border-red-400" : "border-slate-300"
  }`;

const FIELD_LABEL = "text-[13px] font-semibold text-black leading-tight";

const EMPTY = {
  instituteTypeId: "",
  jobCategoryId: "",
  jobRoleId: "",
  position: "",
  department: "",
  vacancies: "1",
  qualification: "",
  experience: "",
  salary: "",
  countryId: "",
  stateId: "",
  cityId: "",
  employmentTypeId: "",
  dutyHours: "",
  accommodation: "No",
  food: "No",
  joiningDate: "",
  deadline: "",
  description: "",
};

// When a parent selection changes, these child selections must be cleared
// so that stale values (e.g. a role from the previous category) are not submitted.
const CASCADE_RESETS = {
  instituteTypeId: ["jobCategoryId", "jobRoleId"],
  jobCategoryId: ["jobRoleId"],
  countryId: ["stateId", "cityId"],
  stateId: ["cityId"],
};

const YES_NO = [
  { value: "No", label: "No" },
  { value: "Yes", label: "Yes" },
];

const extractList = (response) => {
  let result = response?.data ?? response;

  if (result && !Array.isArray(result) && result.data !== undefined) {
    result = result.data;
  }

  if (result && !Array.isArray(result) && result.Data !== undefined) {
    result = result.Data;
  }

  if (result && !Array.isArray(result) && typeof result === "object") {
    if (result.jC_job_category_id !== undefined) {
      return [result];
    }
  }

  if (Array.isArray(result)) return result;

  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.Data)) return result.Data;

  return [];
};

// Converts raw master rows into { value, label } options for the select inputs.
const toOptions = (list, idKey, labelKey) =>
  list
    .map((item) => ({
      value: String(item[idKey] ?? item[idKey.toUpperCase()] ?? ""),
      label: String(item[labelKey] ?? item[labelKey.toUpperCase()] ?? ""),
    }))
    .filter((option) => option.value);

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  error?.message ||
  fallback;

// Runs the shared validator and maps its keys onto this form's field names.
// The shared validator checks organizationName and mobile, which this form
// does not have, so those are dropped. location and employmentType are
// renamed to cityId and employmentTypeId so the errors show on the right fields.
const validateCreateForm = (clean) => {
  const shared = validate({
    position: clean.position,
    vacancies: clean.vacancies,
    qualification: clean.qualification,
    experience: clean.experience,
    salary: clean.salary,
    location: clean.cityId,
    employmentType: clean.employmentTypeId,
    dutyHours: clean.dutyHours,
    joiningDate: clean.joiningDate,
    description: clean.description,
  });

  const { organizationName, mobile, location, employmentType, ...rest } =
    shared;

  const errors = { ...rest };

  if (location) errors.cityId = location;
  if (employmentType) errors.employmentTypeId = employmentType;

  return errors;
};

/* ---------------- Layout helpers (same as EditJobSeeker) ---------------- */

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

const SelectInput = ({ value, onChange, disabled, placeholder, options, hasError }) => (
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

const JobRequirementCreate = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [employer, setEmployer] = useState(null);
  const [loadingEmployer, setLoadingEmployer] = useState(true);

  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);

  const [jobCategories, setJobCategories] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [loadingMasters, setLoadingMasters] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // The organization's institute type is always used as the job type.
  const organizationInstituteTypeId =
    employer?.EM_institute_type_id != null
      ? String(employer.EM_institute_type_id)
      : "";

  const buildInitialForm = (instituteTypeId = "") => ({
    ...EMPTY,
    instituteTypeId,
  });

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

  /* ---------- field change with cascade resets ---------- */

  const change = (name, value) => {
    setForm((previous) => {
      const next = { ...previous, [name]: value };

      (CASCADE_RESETS[name] || []).forEach((childKey) => {
        next[childKey] = "";
      });

      return next;
    });

    setErrors((previous) => ({
      ...previous,
      [name]: undefined,
    }));
  };

  /* ---------- load the logged-in employer ---------- */

  useEffect(() => {
    let cancelled = false;

    const loadEmployer = async () => {
      setLoadingEmployer(true);

      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error(
            "Your login session could not be identified. Please sign in again.",
          );
        }

        const response = await getEmployerRequest(userId);
        const record = normalizeEmployer(
          extractEmployerRecord(getPayload(response)),
        );

        if (!record || record.EM_employer_id === undefined) {
          throw new Error("Employer details were not returned by the API.");
        }

        if (cancelled) return;

        setEmployer(record);
        setForm(
          buildInitialForm(
            record.EM_institute_type_id != null
              ? String(record.EM_institute_type_id)
              : "",
          ),
        );
      } catch (error) {
        if (!cancelled) {
          openStatus(
            "error",
            getErrorMessage(error, "Failed to load employer details."),
          );
        }
      } finally {
        if (!cancelled) setLoadingEmployer(false);
      }
    };

    loadEmployer();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- load employment types and countries ---------- */

  useEffect(() => {
    let cancelled = false;

    const loadMasters = async () => {
      setLoadingMasters(true);

      try {
        const [employmentResponse, countryResponse] = await Promise.all([
          employmentTypeApi.getAllList(),
          countryMasterApi.getAllList(),
        ]);

        if (cancelled) return;

        setEmploymentTypes(extractList(employmentResponse));
        setCountries(extractList(countryResponse));
      } catch (error) {
        if (!cancelled) {
          openStatus(
            "error",
            getErrorMessage(error, "Failed to load master data."),
          );
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

  /* ---------- Institute type -> Job Category ---------- */

  useEffect(() => {
    let cancelled = false;

    setJobCategories([]);
    setJobRoles([]);

    if (!form.instituteTypeId) return undefined;

    const loadCategories = async () => {
      setLoadingCategories(true);

      try {
        const response = await jobCategoryApi.getByInstituteType(
          Number(form.instituteTypeId),
        );

        if (!cancelled) setJobCategories(extractList(response));
      } catch (error) {
        if (!cancelled) {
          openStatus(
            "error",
            getErrorMessage(error, "Failed to load job categories."),
          );
        }
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [form.instituteTypeId]);

  /* ---------- Job Category -> Job Role ---------- */

  useEffect(() => {
    let cancelled = false;

    setJobRoles([]);

    if (!form.jobCategoryId) return undefined;

    const loadRoles = async () => {
      setLoadingRoles(true);

      try {
        const response = await jobRoleApi.getByJobCategory(
          Number(form.jobCategoryId),
        );

        if (!cancelled) setJobRoles(extractList(response));
      } catch (error) {
        if (!cancelled) {
          openStatus(
            "error",
            getErrorMessage(error, "Failed to load job roles."),
          );
        }
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    };

    loadRoles();

    return () => {
      cancelled = true;
    };
  }, [form.jobCategoryId]);

  /* ---------- Country -> State ---------- */

  useEffect(() => {
    let cancelled = false;

    setStates([]);
    setCities([]);

    if (!form.countryId) return undefined;

    const loadStates = async () => {
      setLoadingStates(true);

      try {
        const response = await stateMasterApi.getAllList();
        const allStates = extractList(response);

        if (!cancelled) {
          setStates(
            allStates.filter(
              (item) =>
                String(item.sM_CountryId ?? item.SM_CountryId) ===
                String(form.countryId),
            ),
          );
        }
      } catch (error) {
        if (!cancelled) {
          openStatus("error", getErrorMessage(error, "Failed to load states."));
        }
      } finally {
        if (!cancelled) setLoadingStates(false);
      }
    };

    loadStates();

    return () => {
      cancelled = true;
    };
  }, [form.countryId]);

  /* ---------- State -> City ---------- */

  useEffect(() => {
    let cancelled = false;

    setCities([]);

    if (!form.stateId) return undefined;

    const loadCities = async () => {
      setLoadingCities(true);

      try {
        const response = await cityMasterApi.getAllList();
        const allCities = extractList(response);

        if (!cancelled) {
          setCities(
            allCities.filter(
              (item) =>
                String(item.ctM_StateId ?? item.CTM_StateId) ===
                String(form.stateId),
            ),
          );
        }
      } catch (error) {
        if (!cancelled) {
          openStatus("error", getErrorMessage(error, "Failed to load cities."));
        }
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    };

    loadCities();

    return () => {
      cancelled = true;
    };
  }, [form.stateId]);

  /* ---------- file ---------- */

  const onFile = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    const allowedExtensions = /\.(pdf|doc|docx)$/i;

    if (!allowedExtensions.test(selectedFile.name)) {
      openStatus("warning", "Only PDF, DOC, and DOCX files are allowed.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_MB * 1024 * 1024) {
      openStatus("warning", `File must be ${MAX_FILE_MB} MB or smaller.`);
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setForm(buildInitialForm(organizationInstituteTypeId));
    setFile(null);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ---------- save ---------- */

  const save = async (clean) => {
    const employerId = Number(employer?.EM_employer_id);
    const instituteTypeId = Number(organizationInstituteTypeId);

    const payload = new FormData();

    payload.append("JQ_employer_id", String(employerId));
    payload.append("JQ_institute_type_id", String(instituteTypeId));
    payload.append("JQ_job_role_id", clean.jobRoleId);
    payload.append("JQ_job_category_id", clean.jobCategoryId);
    payload.append("JQ_position_title", clean.position);
    payload.append("JQ_vacancies", clean.vacancies);
    payload.append("JQ_employment_type_id", clean.employmentTypeId);

    // Backend expects the city master ID, not a city name.
    payload.append("JQ_job_location", clean.cityId);

    payload.append("JQ_accommodation", String(clean.accommodation === "Yes"));
    payload.append("JQ_food_facility", String(clean.food === "Yes"));

    if (clean.department) {
      payload.append("JQ_department_speciality", clean.department);
    }

    if (clean.qualification) {
      payload.append("JQ_qualification_required", clean.qualification);
    }

    if (clean.experience) {
      payload.append("JQ_experience_required", clean.experience);
    }

    if (clean.salary) {
      payload.append("JQ_salary_range", clean.salary);
    }

    if (clean.dutyHours) {
      payload.append("JQ_duty_hours", clean.dutyHours);
    }

    if (clean.deadline) {
      payload.append("JQ_deadline", `${clean.deadline}T00:00:00`);
    }

    if (clean.joiningDate) {
      payload.append(
        "JQ_expected_joining_date",
        `${clean.joiningDate}T00:00:00`,
      );
    }

    if (clean.description) {
      payload.append("JQ_description", clean.description);
    }

    if (file) {
      payload.append("Attachment", file);
    }

    setSaving(true);

    try {
      const response = await createJobRequirement(payload);
      const result = response?.data ?? response;

      if (result?.Success === false || result?.success === false) {
        throw new Error(
          result?.Message ||
            result?.message ||
            "Failed to create job requirement.",
        );
      }

      openStatus(
        "update",
        result?.Message ||
          result?.message ||
          "Job requirement created successfully.",
        {
          confirmText: "Continue",
          onConfirm: () => navigate(LIST_PATH),
        },
      );
    } catch (error) {
      openStatus(
        "error",
        getErrorMessage(error, "Failed to create job requirement."),
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------- submit ---------- */

  const submit = (event) => {
    event.preventDefault();
    if (saving) return;

    const clean = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ]),
    );

    const validationErrors = validateCreateForm(clean);

    if (!clean.jobCategoryId)
      validationErrors.jobCategoryId = "Select a job category.";
    if (!clean.jobRoleId) validationErrors.jobRoleId = "Select a job role.";
    if (!clean.countryId) validationErrors.countryId = "Select a country.";
    if (!clean.stateId) validationErrors.stateId = "Select a state.";
    if (!clean.cityId) validationErrors.cityId = "Select a city.";
    if (!clean.employmentTypeId)
      validationErrors.employmentTypeId = "Select an employment type.";

    setErrors(validationErrors);

    if (Object.values(validationErrors).some(Boolean)) {
      openStatus(
        "warning",
        Object.values(validationErrors).find(Boolean) ||
          "Please correct the highlighted fields.",
      );
      return;
    }

    const employerId = Number(employer?.EM_employer_id);

    if (!Number.isInteger(employerId) || employerId <= 0) {
      openStatus(
        "error",
        "Unable to identify the logged-in employer. Please log in again.",
      );
      return;
    }

    // Job type is always the organization's institute type.
    const instituteTypeId = Number(organizationInstituteTypeId);

    if (!Number.isInteger(instituteTypeId) || instituteTypeId <= 0) {
      openStatus(
        "error",
        "Your organization's type is missing. Please update your profile first.",
      );
      return;
    }

    openConfirm({
      title: "Confirm create",
      message: "Are you sure you want to create this job requirement?",
      confirmText: "Create",
      onConfirm: () => save(clean),
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

  /* ----------------------------- UI ----------------------------- */

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
                Add Job Requirement
              </h2>
            </div>
          </div>

          {loadingEmployer ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading organization details...
            </div>
          ) : (
            <form
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
                      value={
                        employer?.InstituteTypeName ||
                        employer?.instituteTypeName ||
                        "-"
                      }
                      className={inputClass(false)}
                    />
                  </FieldRow>

                  {renderSelect({
                    name: "jobCategoryId",
                    label: "Job Category",
                    required: true,
                    options: toOptions(
                      jobCategories,
                      "jC_job_category_id",
                      "jC_name",
                    ),
                    loading: loadingCategories,
                    disabled: !form.instituteTypeId,
                    placeholder: form.instituteTypeId
                      ? "Select Job Category"
                      : "Select Job Type First",
                  })}

                  {renderSelect({
                    name: "jobRoleId",
                    label: "Job Role",
                    required: true,
                    options: toOptions(jobRoles, "jR_job_role_id", "jR_name"),
                    loading: loadingRoles,
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
                    options: toOptions(
                      employmentTypes,
                      "eT_employment_type_id",
                      "eT_name",
                    ),
                    loading: loadingMasters,
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
                    name: "deadline",
                    label: "Application Deadline",
                    type: "date",
                  })}

                  {renderInput({
                    name: "joiningDate",
                    label: "Expected Joining Date",
                    type: "date",
                  })}
                </div>
              </section>

              {/* LOCATION */}
              <section>
                <SectionTitle>Job Location</SectionTitle>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  {renderSelect({
                    name: "countryId",
                    label: "Country",
                    required: true,
                    options: toOptions(countries, "cM_Id", "cM_CountryName"),
                    loading: loadingMasters,
                    placeholder: "Select Country",
                  })}

                  {renderSelect({
                    name: "stateId",
                    label: "State",
                    required: true,
                    options: toOptions(states, "sM_Id", "sM_StateName"),
                    loading: loadingStates,
                    disabled: !form.countryId,
                    placeholder: form.countryId
                      ? "Select State"
                      : "Select Country First",
                  })}

                  {renderSelect({
                    name: "cityId",
                    label: "City",
                    required: true,
                    options: toOptions(cities, "ctM_Id", "ctM_CityName"),
                    loading: loadingCities,
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
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx"
                      onChange={onFile}
                    />

                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={saving}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#2f6b8a] bg-white px-4 py-2 text-sm font-medium text-[#2f6b8a] transition hover:bg-[#eaf2f7] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Paperclip size={15} />
                        {file ? "Change file" : "Choose file"}
                      </button>

                      <span className="truncate text-sm text-slate-600">
                        {file ? file.name : "No file chosen"}
                      </span>

                      {file && (
                        <button
                          type="button"
                          onClick={removeFile}
                          disabled={saving}
                          aria-label="Remove file"
                          className="text-slate-500 hover:text-red-600 disabled:opacity-60"
                        >
                          <CloseIcon size={14} />
                        </button>
                      )}
                    </div>
                    <span className="mt-1 block text-xs text-slate-500">
                      PDF, DOC or DOCX, up to {MAX_FILE_MB} MB. Optional.
                    </span>
                  </FieldRow>
                </div>
              </section>

              {/* FOOTER */}
              <div className="flex justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(LIST_PATH)}
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
                    {saving ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <Plus size={15} />
                    )}
                    {saving ? "Creating..." : "Create Job Requirement"}
                  </button>
                </div>
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
};

export default JobRequirementCreate;