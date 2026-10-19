import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronsLeft,
  Plus,
  Paperclip,
  X as CloseIcon,
  Check as CheckIcon,
  ChevronDown,
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

const inputCls =
  "mt-1 w-full rounded-lg border bg-white px-3 text-[15px] text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] hover:border-[#2c6b8a] focus:border-[#2c6b8a] focus:ring-2 focus:ring-[#2c6b8a]/30 disabled:bg-slate-50 disabled:text-slate-500";

const EMPTY = {
  instituteTypeId: "",
  jobRoleId: "",
  jobCategoryId: "",
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
  status: "Open",
  joiningDate: "",
  deadline: "",
  description: "",
};

// When a parent selection changes, these child selections must be cleared
// so that stale values (e.g. a category from the previous role) are not submitted.
const CASCADE_RESETS = {
  jobRoleId: ["jobCategoryId"],
  countryId: ["stateId", "cityId"],
  stateId: ["cityId"],
};

const extractList = (response) => {
  let result = response?.data ?? response;

  // Unwrap standard API response: { success, message, data }
  if (result && !Array.isArray(result) && result.data !== undefined) {
    result = result.data;
  }

  if (result && !Array.isArray(result) && result.Data !== undefined) {
    result = result.Data;
  }

  // API may return a single category object instead of an array.
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

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  error?.message ||
  fallback;

const readField = (item, key) => {
  if (item?.[key] !== undefined && item?.[key] !== null) return item[key];

  const actualKey = Object.keys(item || {}).find(
    (candidate) => candidate.toLowerCase() === key.toLowerCase(),
  );

  return actualKey ? item[actualKey] : undefined;
};

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

const JobRequirementCreate = () => {
  const navigate = useNavigate();

  const [employer, setEmployer] = useState(null);
  const [loadingEmployer, setLoadingEmployer] = useState(true);

  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [jobRoles, setJobRoles] = useState([]);
  const [jobCategories, setJobCategories] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [loadingMasters, setLoadingMasters] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
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

  // Load the logged-in employer so its organization type can be used as the job type.
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
          setToast({
            tone: "bad",
            msg: getErrorMessage(error, "Failed to load employer details."),
          });
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

  // Load the master dropdown lists.
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
          setToast({
            tone: "bad",
            msg: getErrorMessage(error, "Failed to load master data."),
          });
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

  // Organization institute type -> Job Role.
  useEffect(() => {
    let cancelled = false;

    setJobRoles([]);
    setJobCategories([]);

    if (!form.instituteTypeId) return undefined;

    const loadRoles = async () => {
      setLoadingRoles(true);

      try {
        const response = await jobRoleApi.getByInstituteType(
          Number(form.instituteTypeId),
        );

        if (!cancelled) setJobRoles(extractList(response));
      } catch (error) {
        if (!cancelled) {
          setToast({
            tone: "bad",
            msg: getErrorMessage(error, "Failed to load job roles."),
          });
        }
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    };

    loadRoles();

    return () => {
      cancelled = true;
    };
  }, [form.instituteTypeId]);

  // Job Role -> Job Category (loaded by role, not from the full list).
  useEffect(() => {
    let cancelled = false;

    setJobCategories([]);

    if (!form.jobRoleId) return undefined;

    const loadCategories = async () => {
      setLoadingCategories(true);

      try {
        const response = await jobCategoryApi.getByJobRole(
          Number(form.jobRoleId),
        );

        if (!cancelled) setJobCategories(extractList(response));
      } catch (error) {
        if (!cancelled) {
          setToast({
            tone: "bad",
            msg: getErrorMessage(error, "Failed to load job categories."),
          });
        }
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [form.jobRoleId]);

  // Country -> State.
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
          setToast({
            tone: "bad",
            msg: getErrorMessage(error, "Failed to load states."),
          });
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

  // State -> City.
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
          setToast({
            tone: "bad",
            msg: getErrorMessage(error, "Failed to load cities."),
          });
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

  const onFile = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    const allowedExtensions = /\.(pdf|doc|docx)$/i;

    if (!allowedExtensions.test(selectedFile.name)) {
      setToast({
        tone: "bad",
        msg: "Only PDF, DOC, and DOCX files are allowed.",
      });
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setToast({
        tone: "bad",
        msg: "File must be 5 MB or smaller.",
      });
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
    setToast(null);
  };

  const resetForm = () => {
    setForm(buildInitialForm(organizationInstituteTypeId));
    setFile(null);
    setErrors({});
    setToast(null);
  };

  const submit = async (event) => {
    event.preventDefault();

    const clean = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ]),
    );

    const validationErrors = validateCreateForm(clean);

    if (!clean.jobRoleId) {
      validationErrors.jobRoleId = "Select a job role.";
    }

    if (!clean.jobCategoryId) {
      validationErrors.jobCategoryId = "Select a job category.";
    }

    if (!clean.countryId) {
      validationErrors.countryId = "Select a country.";
    }

    if (!clean.stateId) {
      validationErrors.stateId = "Select a state.";
    }

    if (!clean.cityId) {
      validationErrors.cityId = "Select a city.";
    }

    if (!clean.employmentTypeId) {
      validationErrors.employmentTypeId = "Select an employment type.";
    }

    setErrors(validationErrors);

    if (Object.values(validationErrors).some(Boolean)) {
      setToast({
        tone: "bad",
        msg: "Please fix the highlighted fields.",
      });
      return;
    }

    const employerId = Number(employer?.EM_employer_id);

    if (!Number.isInteger(employerId) || employerId <= 0) {
      setToast({
        tone: "bad",
        msg: "Unable to identify the logged-in employer. Please log in again.",
      });
      return;
    }

    // Job type is always the organization's institute type.
    const instituteTypeId = Number(organizationInstituteTypeId);

    if (!Number.isInteger(instituteTypeId) || instituteTypeId <= 0) {
      setToast({
        tone: "bad",
        msg: "Your organization's type is missing. Please update your profile first.",
      });
      return;
    }

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
    setToast(null);

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

      setToast({
        tone: "ok",
        msg:
          result?.Message ||
          result?.message ||
          "Job requirement created successfully.",
      });

      setTimeout(() => {
        navigate("/employer/job-requirement-list");
      }, 800);
    } catch (error) {
      setToast({
        tone: "bad",
        msg: getErrorMessage(error, "Failed to create job requirement."),
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const renderSelect = (
    name,
    label,
    value,
    options,
    idKey,
    labelKey,
    placeholder,
    disabled = false,
  ) => (
    <div>
      <label
        htmlFor={name}
        className="block text-[13px] font-semibold text-[#34445a]"
      >
        {label} <span className="text-rose-600">*</span>
      </label>

      <div className="relative">
        <select
          id={name}
          value={value}
          disabled={disabled}
          onChange={(event) => change(name, event.target.value)}
          className={`${inputCls} h-10 appearance-none border ${
            errors[name] ? "border-rose-500" : "border-[#c9d5dd]"
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map((item) => {
            const id = readField(item, idKey);
            const labelValue = readField(item, labelKey);

            return (
              <option key={id} value={String(id)}>
                {labelValue}
              </option>
            );
          })}
        </select>

        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
      </div>

      {errors[name] && (
        <p className="mt-1 text-[12px] text-rose-600">{errors[name]}</p>
      )}
    </div>
  );

  const renderInput = (
    name,
    label,
    type = "text",
    required = false,
    full = false,
  ) => (
    <div className={full ? "md:col-span-2" : ""}>
      <label
        htmlFor={name}
        className="block text-[13px] font-semibold text-[#34445a]"
      >
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>

      <input
        id={name}
        type={type}
        min={type === "number" ? 1 : undefined}
        value={form[name] ?? ""}
        onChange={(event) => change(name, event.target.value)}
        className={`${inputCls} h-10 border ${
          errors[name] ? "border-rose-500" : "border-[#c9d5dd]"
        }`}
      />

      {errors[name] && (
        <p className="mt-1 text-[12px] text-rose-600">{errors[name]}</p>
      )}
    </div>
  );

  return (
    <div className="text-[#1e2b36]">
      <header
        className="ep-hero relative mb-4 overflow-hidden rounded-2xl p-4 text-white shadow-sm sm:px-4 sm:py-2"
        style={{
          backgroundImage:
            "linear-gradient(110deg,#17405a 0%,#2f6b8a 40%,#4a9bb3 70%,#2f6b8a 100%)",
        }}
      >
        <div className="relative flex flex-wrap items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15 text-white hover:bg-white/25"
          >
            <ChevronsLeft size={18} />
          </button>
          <h1 className="m-0 text-[22px] font-extrabold sm:text-[26px]">
            Add Job Requirement
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px]">
        <form
          onSubmit={submit}
          noValidate
          autoComplete="off"
          className="rounded-xl border border-[#e2e8ee] bg-white p-5 shadow-sm"
        >
          {(loadingMasters || loadingEmployer) && (
            <p className="mb-4 text-sm text-slate-500">
              {loadingEmployer
                ? "Loading organization details..."
                : "Loading master data..."}
            </p>
          )}

          <h2 className="mb-4 border-b pb-2 text-sm font-bold text-[#2f6b8a]">
            Job Information
          </h2>

          <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
            <div>
              <label className="block text-[13px] font-semibold text-[#34445a]">
                Job Type <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={
                  employer?.InstituteTypeName ||
                  (loadingEmployer ? "Loading..." : "-")
                }
                className={`${inputCls} h-10 border border-[#c9d5dd] bg-slate-50`}
              />
            </div>

            {renderSelect(
              "jobRoleId",
              "Job Role",
              form.jobRoleId,
              jobRoles,
              "jR_job_role_id",
              "jR_name",
              loadingRoles ? "Loading job roles..." : "Select Job Role",
              !form.instituteTypeId || loadingRoles,
            )}

            {renderSelect(
              "jobCategoryId",
              "Job Category",
              form.jobCategoryId,
              jobCategories,
              "jC_job_category_id",
              "jC_name",
              loadingCategories
                ? "Loading job categories..."
                : "Select Job Category",
              !form.jobRoleId || loadingCategories,
            )}

            {renderInput("position", "Position Title", "text", true)}
            {renderInput("department", "Department / Speciality")}
            {renderInput("vacancies", "Number of Vacancies", "number", true)}
            {renderInput("qualification", "Qualification Required")}
            {renderInput("experience", "Experience Required")}
            {renderInput("salary", "Salary Range")}

            {renderSelect(
              "employmentTypeId",
              "Employment Type",
              form.employmentTypeId,
              employmentTypes,
              "eT_employment_type_id",
              "eT_name",
              "Select Employment Type",
              loadingMasters,
            )}

            {renderInput("dutyHours", "Duty Hours")}

            <div>
              <label className="block text-[13px] font-semibold text-[#34445a]">
                Accommodation
              </label>
              <select
                value={form.accommodation}
                onChange={(event) =>
                  change("accommodation", event.target.value)
                }
                className={`${inputCls} h-10 border border-[#c9d5dd]`}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#34445a]">
                Food Facility
              </label>
              <select
                value={form.food}
                onChange={(event) => change("food", event.target.value)}
                className={`${inputCls} h-10 border border-[#c9d5dd]`}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            {renderInput("deadline", "Application Deadline", "date")}
            {renderInput("joiningDate", "Expected Joining Date", "date")}

            <h2 className="mt-3 border-b pb-2 text-sm font-bold text-[#2f6b8a] md:col-span-2">
              Job Location
            </h2>

            {renderSelect(
              "countryId",
              "Country",
              form.countryId,
              countries,
              "cM_Id",
              "cM_CountryName",
              "Select Country",
              loadingMasters,
            )}

            {renderSelect(
              "stateId",
              "State",
              form.stateId,
              states,
              "sM_Id",
              "sM_StateName",
              loadingStates ? "Loading states..." : "Select State",
              !form.countryId || loadingStates,
            )}

            {renderSelect(
              "cityId",
              "City",
              form.cityId,
              cities,
              "ctM_Id",
              "ctM_CityName",
              loadingCities ? "Loading cities..." : "Select City",
              !form.stateId || loadingCities,
            )}

            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="block text-[13px] font-semibold text-[#34445a]"
              >
                Job Description
              </label>
              <textarea
                id="description"
                rows={5}
                value={form.description}
                onChange={(event) => change("description", event.target.value)}
                className={`${inputCls} border border-[#c9d5dd] py-2`}
              />
            </div>

            <div className="md:col-span-2">
              <span className="block text-[13px] font-semibold text-[#34445a]">
                Upload Job Description (optional)
              </span>

              <div className="mt-1 flex flex-wrap items-center gap-3">
                <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#2c6b8a] bg-[#f4f9fb] px-4 text-[14px] font-medium text-[#2c6b8a] hover:bg-[#e8f1f6]">
                  <Paperclip size={15} />
                  Choose file
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={onFile}
                    className="sr-only"
                  />
                </label>

                {file ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f1f6] px-3 py-1 text-[13px]">
                    {file.name}
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      aria-label="Remove file"
                      className="text-[#6b7a88] hover:text-rose-600"
                    >
                      <CloseIcon size={14} />
                    </button>
                  </span>
                ) : (
                  <span className="text-[13px] text-[#6b7a88]">
                    PDF or Word, up to 5 MB
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2.5 border-t border-[#e2e8ee] pt-4">
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="h-10 rounded-[10px] border border-[#dce3eb] bg-white px-5 text-[14px] font-semibold hover:bg-slate-50"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => navigate("/employer/job-requirement-list")}
              disabled={saving}
              className="h-10 rounded-[10px] border border-[#dce3eb] bg-white px-5 text-[14px] font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || loadingEmployer}
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-gradient-to-r from-[#16834f] to-[#2fb877] px-5 text-[14px] font-semibold text-white shadow-md hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} />
              {saving ? "Creating..." : "Create Job Requirement"}
            </button>
          </div>
        </form>
      </main>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="js-toast fixed bottom-5 right-5 z-[60] flex max-w-[calc(100%-2rem)] items-center gap-2.5 rounded-xl bg-[#1e2b36] px-4 py-3 text-sm font-medium text-white shadow-xl"
        >
          <span
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
              toast.tone === "ok" ? "bg-emerald-500" : "bg-rose-500"
            }`}
          >
            <CheckIcon size={12} strokeWidth={3.4} />
          </span>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default JobRequirementCreate;
