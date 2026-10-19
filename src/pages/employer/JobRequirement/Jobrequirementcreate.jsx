import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Plus,
  Tag,
  Timer,
  Users,
  Utensils,
  Wallet,
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

// Converts raw master rows into { value, label } options for SelectField.
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

const JobRequirementCreate = () => {
  const fileInputRef = useRef(null);
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

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

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

    if (!clean.jobRoleId) validationErrors.jobRoleId = "Select a job role.";
    if (!clean.jobCategoryId)
      validationErrors.jobCategoryId = "Select a job category.";
    if (!clean.countryId) validationErrors.countryId = "Select a country.";
    if (!clean.stateId) validationErrors.stateId = "Select a state.";
    if (!clean.cityId) validationErrors.cityId = "Select a city.";
    if (!clean.employmentTypeId)
      validationErrors.employmentTypeId = "Select an employment type.";

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
    full = false,
  }) => (
    <Field
      label={label}
      htmlFor={name}
      required={required}
      error={errors[name]}
      className={full ? "sm:col-span-2" : ""}
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

  return (
    <div className="w-full bg-white text-slate-800">
      <PageHeader
        title="Add Job Requirement"
        onBack={() => navigate(-1)}
        right={<Pill icon={Plus}>New requirement</Pill>}
      />

      <form onSubmit={submit} noValidate autoComplete="off">
        <div className="grid grid-cols-1 gap-4">
          {(loadingMasters || loadingEmployer) && (
            <p className="text-sm text-slate-500">
              {loadingEmployer
                ? "Loading organization details..."
                : "Loading master data..."}
            </p>
          )}

          <Card title="Job Information" icon={Briefcase}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Job Type" htmlFor="jobType">
                <IconField icon={Building2}>
                  <input
                    id="jobType"
                    type="text"
                    readOnly
                    disabled
                    value={
                      employer?.InstituteTypeName ||
                      (loadingEmployer ? "Loading..." : "-")
                    }
                    className={inputClass(false)}
                  />
                </IconField>
              </Field>

              {renderSelect({
                name: "jobRoleId",
                label: "Job Role",
                icon: Briefcase,
                required: true,
                options: toOptions(jobRoles, "jR_job_role_id", "jR_name"),
                loading: loadingRoles,
                disabled: !form.instituteTypeId,
                placeholder: "Select Job Role",
              })}

              {renderSelect({
                name: "jobCategoryId",
                label: "Job Category",
                icon: Tag,
                required: true,
                options: toOptions(
                  jobCategories,
                  "jC_job_category_id",
                  "jC_name",
                ),
                loading: loadingCategories,
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
                name: "deadline",
                label: "Application Deadline",
                icon: CalendarDays,
                type: "date",
              })}
              {renderInput({
                name: "joiningDate",
                label: "Expected Joining Date",
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
                options: toOptions(countries, "cM_Id", "cM_CountryName"),
                loading: loadingMasters,
                placeholder: "Select Country",
              })}
              {renderSelect({
                name: "stateId",
                label: "State",
                icon: MapPin,
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
                icon: MapPin,
                required: true,
                options: toOptions(cities, "ctM_Id", "ctM_CityName"),
                loading: loadingCities,
                disabled: !form.stateId,
                placeholder: form.stateId
                  ? "Select City"
                  : "Select State First",
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
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={onFile}
                    className="hidden"
                  />

                  {file ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#eaf3f7] px-3 py-1 text-xs text-slate-700">
                      {file.name}
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
                        }}
                        aria-label="Remove file"
                        className="text-slate-500 hover:text-red-600"
                      >
                        <CloseIcon size={14} />
                      </button>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">
                      PDF or Word, up to 5 MB
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={resetForm}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => navigate("/employer/job-requirement-list")}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || loadingEmployer}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {saving ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            {saving ? "Creating..." : "Create Job Requirement"}
          </button>
        </div>
      </form>

      <Toast toast={toast} />
    </div>
  );
};

export default JobRequirementCreate;
