// src/pages/admin/job/CreateJobDescription.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronsLeft, Loader2, Pencil } from "lucide-react";
import jdApi from "../../../api/Services/jdfornonregistercompanyApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import jobCategoryApi from "../../../api/Services/jobCategoryApi";
import jobRoleApi from "../../../api/Services/jobRoleApi";
import employmentTypeApi from "../../../api/Services/employmentTypeApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

/* ------------------------------ STYLES ------------------------------ */

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:cursor-not-allowed disabled:bg-slate-50";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:cursor-not-allowed disabled:bg-slate-50";

const DESCRIPTION_MAX = 500;

/* ------------------------------ HELPERS ------------------------------ */

// Reads a key case-insensitively, so "jQ_org_name" also matches "JQ_org_name".
const first = (item, ...keys) => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) return item[key];
    const actualKey = Object.keys(item || {}).find(
      (candidate) => candidate.toLowerCase() === key.toLowerCase()
    );
    if (actualKey !== undefined && item[actualKey] !== null) return item[actualKey];
  }
  return "";
};

// Finds the array inside a master API response, whatever the wrapper looks like.
const listFrom = (response) => {
  const root = response?.data ?? response;
  for (const value of [root?.data?.data, root?.Data?.Data, root?.data, root?.Data, root]) {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.Data)) return value.Data;
  }
  return [];
};

const options = (response, idKeys, nameKeys) =>
  listFrom(response)
    .map((item) => ({
      id: first(item, ...idKeys),
      name: first(item, ...nameKeys),
    }))
    .filter((item) => item.id !== "" && item.name !== "");

// Shows "—" for empty values in view mode.
const v = (value) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

const yesNo = (value) => (value ? "Yes" : "No");

const dateInput = (value) => (value ? String(value).slice(0, 10) : "");

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fileNameFromPath = (path) => {
  if (!path) return "";
  const part = String(path).split(/[\\/]/).pop() || String(path);
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
};

/* --------------------------- STATIC OPTIONS ---------------------------
   No master API was provided for job status, so it stays static.
   Replace these IDs with the real JobStatus IDs from your database. */
const JOB_STATUSES = [
  { id: 1, name: "Open" },
  { id: 2, name: "Draft" },
  { id: 3, name: "Paused" },
  { id: 4, name: "Closed" },
];

/* ------------------------------ FORM ------------------------------ */

const EMPTY = {
  organizationName: "",
  organizationTypeId: "",
  jobCategoryId: "",
  jobRoleId: "",
  employmentTypeId: "",
  jobStatusId: "",
  positionRequired: "",
  departmentSpeciality: "",
  numberOfVacancies: "",
  qualificationRequired: "",
  experienceRequired: "",
  salaryRange: "",
  dutyHours: "",
  accommodation: false,
  foodFacility: false,
  countryId: "",
  stateId: "",
  cityId: "",
  deadline: "",
  expectedJoiningDate: "",
  assignedTo: "",
  description: "",
  attachment: null,
};

// Maps the GET record (jQ_* keys) to form state, used for edit mode.
// Country and state IDs must come from the record so the dropdowns can load by ID.
const formFromRecord = (r) => ({
  organizationName: String(first(r, "jQ_org_name")),
  organizationTypeId: String(first(r, "jQ_institute_type_id", "jQ_org_type_id")),
  jobCategoryId: String(first(r, "jQ_job_category_id")),
  jobRoleId: String(first(r, "jQ_job_role_id")),
  employmentTypeId: String(first(r, "jQ_employment_type_id")),
  jobStatusId: String(first(r, "jQ_job_status_id")),
  positionRequired: String(first(r, "jQ_position_title")),
  departmentSpeciality: String(first(r, "jQ_department_speciality")),
  numberOfVacancies: String(first(r, "jQ_vacancies")),
  qualificationRequired: String(first(r, "jQ_qualification_required")),
  experienceRequired: String(first(r, "jQ_experience_required")),
  salaryRange: String(first(r, "jQ_salary_range")),
  dutyHours: String(first(r, "jQ_duty_hours")),
  accommodation: Boolean(first(r, "jQ_accommodation")),
  foodFacility: Boolean(first(r, "jQ_food_facility")),
  countryId: String(first(r, "jQ_country_id", "jQ_job_country_id")),
  stateId: String(first(r, "jQ_state_id", "jQ_job_state_id")),
  cityId: String(first(r, "jQ_job_location", "jQ_city_id")),
  deadline: dateInput(first(r, "jQ_deadline")),
  expectedJoiningDate: dateInput(first(r, "jQ_expected_joining_date")),
  assignedTo: String(first(r, "jQ_assigned_to")),
  description: String(first(r, "jQ_description")).slice(0, DESCRIPTION_MAX),
  attachment: null,
});

const REQUIRED = {
  organizationName: "Organization name is required",
  organizationTypeId: "Select an organization type",
  jobCategoryId: "Select a job category",
  jobRoleId: "Select a job role",
  employmentTypeId: "Select an employment type",
  jobStatusId: "Select a status",
  positionRequired: "Position is required",
  numberOfVacancies: "Number of vacancies is required",
  qualificationRequired: "Qualification is required",
  experienceRequired: "Experience is required",
  countryId: "Select a country",
  stateId: "Select a state",
  cityId: "Select a city",
  deadline: "Deadline is required",
  description: "Job description is required",
};

const validate = (f) => {
  const errors = {};
  Object.entries(REQUIRED).forEach(([key, msg]) => {
    if (!String(f[key] ?? "").trim()) errors[key] = msg;
  });
  if (f.numberOfVacancies !== "" && Number(f.numberOfVacancies) < 1) {
    errors.numberOfVacancies = "Must be at least 1";
  }
  return errors;
};

// Builds the payload with the PascalCase names the admin DTO expects.
const toPayload = (f) => ({
  OrganizationName: f.organizationName.trim(),
  OrganizationTypeId: Number(f.organizationTypeId),
  JobCategoryId: Number(f.jobCategoryId),
  JobRoleId: Number(f.jobRoleId),
  EmploymentTypeId: Number(f.employmentTypeId),
  JobStatusId: Number(f.jobStatusId),
  CountryId: Number(f.countryId),
  StateId: Number(f.stateId),
  CityId: Number(f.cityId),
  PositionRequired: f.positionRequired.trim(),
  DepartmentSpeciality: f.departmentSpeciality.trim(),
  NumberOfVacancies: Number(f.numberOfVacancies),
  QualificationRequired: f.qualificationRequired.trim(),
  ExperienceRequired: f.experienceRequired.trim(),
  SalaryRange: f.salaryRange.trim(),
  DutyHours: f.dutyHours.trim(),
  Accommodation: f.accommodation,
  FoodFacility: f.foodFacility,
  Deadline: f.deadline || null,
  ExpectedJoiningDate: f.expectedJoiningDate || null,
  AssignedTo: f.assignedTo ? Number(f.assignedTo) : null,
  Description: f.description.trim(),
  Attachment: f.attachment ?? null,
});

/* ------------------------------ UI PIECES ------------------------------ */

const Field = ({ label, required, error, full, alignTop, children }) => (
  <div
    className={`flex flex-col gap-1.5 md:flex-row md:gap-3 ${
      alignTop ? "md:items-start" : "md:items-center"
    } ${full ? "md:col-span-2" : ""}`}
  >
    <label
      className={`text-sm font-medium text-slate-700 md:w-44 md:shrink-0 ${
        alignTop ? "md:pt-2.5" : ""
      }`}
    >
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
    <div className="min-w-0 flex-1">
      {children}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </div>
  </div>
);

// Read-only display used in view mode.
const ReadOnly = ({ children, multiline = false }) => (
  <div
    className={`min-h-[38px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 break-words ${
      multiline ? "whitespace-pre-wrap" : ""
    }`}
  >
    {children}
  </div>
);

const SelectField = ({ value, onChange, items, placeholder, disabled, loading }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={selectClass}
    >
      <option value="">{loading ? "Loading..." : placeholder}</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
    {!disabled && (
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
    )}
  </div>
);

/* ------------------------------ COMPONENT ------------------------------ */

export default function CreateJobDescription() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isCreate = !id;

  const [isView, setIsView] = useState(Boolean(id));
  const [record, setRecord] = useState(null); // raw GET response, used for view mode
  const [form, setForm] = useState(EMPTY);
  const [savedForm, setSavedForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loadingRecord, setLoadingRecord] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [sources, setSources] = useState({
    institutes: [],
    categories: [],
    roles: [],
    employmentTypes: [],
    countries: [],
    states: [],
    cities: [],
  });
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const mastersLoadedRef = useRef(false);
  const categoryReqId = useRef(0);
  const roleReqId = useRef(0);

  /* ----- load the record (view and edit) ----- */
  const loadRecord = async (recordId) => {
    setLoadingRecord(true);
    setError("");
    try {
      const res = await jdApi.getJobDescriptionById(recordId);
      const data = res?.data ?? res?.Data ?? null;
      if (!data || typeof data !== "object") {
        throw new Error("Job description was not found.");
      }
      const mapped = formFromRecord(data);
      setRecord(data);
      setForm(mapped);
      setSavedForm(mapped);
    } catch (err) {
      setError(getApiErrorMessage(err) || "Unable to load job description.");
    } finally {
      setLoadingRecord(false);
    }
  };

  useEffect(() => {
    if (isCreate) {
      setRecord(null);
      setForm(EMPTY);
      setSavedForm(EMPTY);
      setLoadingRecord(false);
      return;
    }
    loadRecord(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ----- base master data: only in create and edit, loaded once ----- */
  useEffect(() => {
    if (isView || mastersLoadedRef.current) return;
    mastersLoadedRef.current = true;

    Promise.allSettled([
      instituteTypeApi.getAllList(),
      employmentTypeApi.getAllList(),
      countryMasterApi.getAllList(),
    ]).then(([inst, emp, ctry]) => {
      const ok = (r) => (r.status === "fulfilled" ? r.value : null);

      setSources((s) => ({
        ...s,
        institutes: options(ok(inst), ["iT_institute_type_id"], ["iT_name"]),
        employmentTypes: options(ok(emp), ["eT_employment_type_id"], ["eT_name"]),
        countries: options(ok(ctry), ["cM_Id"], ["cM_CountryName"]),
      }));

      const failed = [inst, emp, ctry].some((r) => r.status === "rejected");
      if (failed) setError("Some form options could not be loaded.");
    });
  }, [isView]);

  /* ----- states load by country ID (edit only) ----- */
  useEffect(() => {
    if (isView) return undefined;
    let cancelled = false;

    setSources((s) => ({ ...s, states: [], cities: [] }));

    if (!form.countryId) {
      setLoadingStates(false);
      return undefined;
    }

    setLoadingStates(true);
    stateMasterApi
      .getByCountry(Number(form.countryId))
      .then((res) => {
        if (cancelled) return;
        setSources((s) => ({
          ...s,
          states: options(res, ["sM_Id"], ["sM_StateName"]),
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err) || "Unable to load states.");
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isView, form.countryId]);

  /* ----- cities load by state ID (edit only) ----- */
  useEffect(() => {
    if (isView) return undefined;
    let cancelled = false;

    setSources((s) => ({ ...s, cities: [] }));

    if (!form.stateId) {
      setLoadingCities(false);
      return undefined;
    }

    setLoadingCities(true);
    cityMasterApi
      .getByState(Number(form.stateId))
      .then((res) => {
        if (cancelled) return;
        setSources((s) => ({
          ...s,
          cities: options(res, ["ctM_Id"], ["ctM_CityName"]),
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err) || "Unable to load cities.");
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isView, form.stateId]);

  /* ----- categories depend on organization type (edit only) ----- */
  useEffect(() => {
    if (isView) return undefined;
    const reqId = ++categoryReqId.current;
    let cancelled = false;

    setSources((s) => ({ ...s, categories: [], roles: [] }));

    if (!form.organizationTypeId) {
      setLoadingCategories(false);
      return undefined;
    }

    setLoadingCategories(true);
    jobCategoryApi
      .getByInstituteType(Number(form.organizationTypeId))
      .then((res) => {
        if (cancelled || reqId !== categoryReqId.current) return;
        setSources((s) => ({
          ...s,
          categories: options(res, ["jC_job_category_id"], ["jC_name"]),
        }));
      })
      .catch((err) => {
        if (cancelled || reqId !== categoryReqId.current) return;
        setError(getApiErrorMessage(err) || "Unable to load job categories.");
      })
      .finally(() => {
        if (!cancelled && reqId === categoryReqId.current) setLoadingCategories(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isView, form.organizationTypeId]);

  /* ----- roles depend on job category (edit only) ----- */
  useEffect(() => {
    if (isView) return undefined;
    const reqId = ++roleReqId.current;
    let cancelled = false;

    setSources((s) => ({ ...s, roles: [] }));

    if (!form.jobCategoryId) {
      setLoadingRoles(false);
      return undefined;
    }

    setLoadingRoles(true);
    jobRoleApi
      .getByJobCategory(Number(form.jobCategoryId))
      .then((res) => {
        if (cancelled || reqId !== roleReqId.current) return;
        setSources((s) => ({
          ...s,
          roles: options(res, ["jR_job_role_id"], ["jR_name"]),
        }));
      })
      .catch((err) => {
        if (cancelled || reqId !== roleReqId.current) return;
        setError(getApiErrorMessage(err) || "Unable to load job roles.");
      })
      .finally(() => {
        if (!cancelled && reqId === roleReqId.current) setLoadingRoles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isView, form.jobCategoryId]);

  /* ----- handlers ----- */
  // Changing a parent clears its dependent children. Only user actions do this.
  const setField = (name, value) => {
    setForm((cur) => {
      const next = { ...cur, [name]: value };
      if (name === "organizationTypeId") {
        next.jobCategoryId = "";
        next.jobRoleId = "";
      }
      if (name === "jobCategoryId") next.jobRoleId = "";
      if (name === "countryId") {
        next.stateId = "";
        next.cityId = "";
      }
      if (name === "stateId") next.cityId = "";
      return next;
    });

    setErrors((cur) => {
      const next = { ...cur };
      delete next[name];
      if (name === "organizationTypeId") {
        delete next.jobCategoryId;
        delete next.jobRoleId;
      }
      if (name === "jobCategoryId") delete next.jobRoleId;
      if (name === "countryId") {
        delete next.stateId;
        delete next.cityId;
      }
      if (name === "stateId") delete next.cityId;
      return next;
    });
  };

  const handleEdit = () => {
    setError("");
    setIsView(false);
  };

  const handleCancelEdit = () => {
    setForm(savedForm);
    setErrors({});
    setError("");
    setFileInputKey((k) => k + 1);
    setIsView(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (isView) return;
    setError("");

    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = toPayload(form);

      if (isCreate) {
        const res = await jdApi.createJobDescription(payload);
        const newId = first(res?.Data ?? res?.data ?? {}, "jQ_job_requirement_id", "id");
        if (newId !== "") {
          navigate(`/admin/job-descriptions/${newId}`, { replace: true });
        } else {
          navigate(-1);
        }
      } else {
        await jdApi.updateJobDescription(id, payload);
        setFileInputKey((k) => k + 1);
        setIsView(true);
        await loadRecord(id);
      }
    } catch (err) {
      setError(getApiErrorMessage(err) || "Unable to save job description.");
    } finally {
      setSaving(false);
    }
  };

  /* ----- render ----- */
  const rec = record ?? {};
  const title = isCreate
    ? "Create Job Description"
    : isView
    ? "View Job Description"
    : "Edit Job Description";

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto max-w-[1300px]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
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
              <h2 className="font-semibold text-slate-800">{title}</h2>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          {loadingRecord ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Loading job description...
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Organization Name" required error={errors.organizationName}>
                  {isView ? (
                    <ReadOnly>{v(rec.jQ_org_name)}</ReadOnly>
                  ) : (
                    <input
                      type="text"
                      value={form.organizationName}
                      onChange={(e) => setField("organizationName", e.target.value)}
                      placeholder="e.g. XYZ Pharma Pvt. Ltd."
                      className={inputClass}
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Organization Type" required error={errors.organizationTypeId}>
                  {isView ? (
                    <ReadOnly>{v(rec.instituteTypeName)}</ReadOnly>
                  ) : (
                    <SelectField
                      value={form.organizationTypeId}
                      onChange={(val) => setField("organizationTypeId", val)}
                      items={sources.institutes}
                      placeholder="Select organization type"
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Job Category" required error={errors.jobCategoryId}>
                  {isView ? (
                    <ReadOnly>{v(rec.jobCategoryName)}</ReadOnly>
                  ) : (
                    <SelectField
                      value={form.jobCategoryId}
                      onChange={(val) => setField("jobCategoryId", val)}
                      items={sources.categories}
                      placeholder={
                        form.organizationTypeId ? "Select job category" : "Select organization type first"
                      }
                      loading={loadingCategories}
                      disabled={saving || !form.organizationTypeId}
                    />
                  )}
                </Field>

                <Field label="Job Role" required error={errors.jobRoleId}>
                  {isView ? (
                    <ReadOnly>{v(rec.jobRoleName)}</ReadOnly>
                  ) : (
                    <SelectField
                      value={form.jobRoleId}
                      onChange={(val) => setField("jobRoleId", val)}
                      items={sources.roles}
                      placeholder={form.jobCategoryId ? "Select job role" : "Select job category first"}
                      loading={loadingRoles}
                      disabled={saving || !form.jobCategoryId}
                    />
                  )}
                </Field>

                <Field label="Employment Type" required error={errors.employmentTypeId}>
                  {isView ? (
                    <ReadOnly>{v(rec.employmentTypeName)}</ReadOnly>
                  ) : (
                    <SelectField
                      value={form.employmentTypeId}
                      onChange={(val) => setField("employmentTypeId", val)}
                      items={sources.employmentTypes}
                      placeholder="Select employment type"
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Position Required" required error={errors.positionRequired}>
                  {isView ? (
                    <ReadOnly>{v(rec.jQ_position_title)}</ReadOnly>
                  ) : (
                    <input
                      type="text"
                      value={form.positionRequired}
                      onChange={(e) => setField("positionRequired", e.target.value)}
                      placeholder="e.g. Senior Staff Nurse"
                      className={inputClass}
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Department / Speciality">
                  {isView ? (
                    <ReadOnly>{v(rec.jQ_department_speciality)}</ReadOnly>
                  ) : (
                    <input
                      type="text"
                      value={form.departmentSpeciality}
                      onChange={(e) => setField("departmentSpeciality", e.target.value)}
                      placeholder="e.g. ICU"
                      className={inputClass}
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Number of Vacancies" required error={errors.numberOfVacancies}>
                  {isView ? (
                    <ReadOnly>{v(rec.jQ_vacancies)}</ReadOnly>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      value={form.numberOfVacancies}
                      onChange={(e) => setField("numberOfVacancies", e.target.value)}
                      placeholder="e.g. 5"
                      className={inputClass}
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Qualification Required" required error={errors.qualificationRequired}>
                  {isView ? (
                    <ReadOnly>{v(rec.jQ_qualification_required)}</ReadOnly>
                  ) : (
                    <input
                      type="text"
                      value={form.qualificationRequired}
                      onChange={(e) => setField("qualificationRequired", e.target.value)}
                      placeholder="e.g. B.Sc Nursing"
                      className={inputClass}
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Experience Required" required error={errors.experienceRequired}>
                  {isView ? (
                    <ReadOnly>{v(rec.jQ_experience_required)}</ReadOnly>
                  ) : (
                    <input
                      type="text"
                      value={form.experienceRequired}
                      onChange={(e) => setField("experienceRequired", e.target.value)}
                      placeholder="e.g. 3-5 years"
                      className={inputClass}
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Salary Range">
                  {isView ? (
                    <ReadOnly>{v(rec.jQ_salary_range)}</ReadOnly>
                  ) : (
                    <input
                      type="text"
                      value={form.salaryRange}
                      onChange={(e) => setField("salaryRange", e.target.value)}
                      placeholder="e.g. 25,000 - 35,000"
                      className={inputClass}
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Duty Hours">
                  {isView ? (
                    <ReadOnly>{v(rec.jQ_duty_hours)}</ReadOnly>
                  ) : (
                    <input
                      type="text"
                      value={form.dutyHours}
                      onChange={(e) => setField("dutyHours", e.target.value)}
                      placeholder="e.g. 9 AM - 5 PM"
                      className={inputClass}
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Facilities">
                  {isView ? (
                    <ReadOnly>
                      Accommodation: {yesNo(rec.jQ_accommodation)} · Food Facility:{" "}
                      {yesNo(rec.jQ_food_facility)}
                    </ReadOnly>
                  ) : (
                    <div className="flex flex-wrap items-center gap-6 pt-2">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.accommodation}
                          onChange={(e) => setField("accommodation", e.target.checked)}
                          disabled={saving}
                          className="h-4 w-4 accent-[#2f6b8a]"
                        />
                        Accommodation
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.foodFacility}
                          onChange={(e) => setField("foodFacility", e.target.checked)}
                          disabled={saving}
                          className="h-4 w-4 accent-[#2f6b8a]"
                        />
                        Food Facility
                      </label>
                    </div>
                  )}
                </Field>

                <Field label="Country" required error={errors.countryId}>
                  {isView ? (
                    <ReadOnly>{v(rec.countryName)}</ReadOnly>
                  ) : (
                    <SelectField
                      value={form.countryId}
                      onChange={(val) => setField("countryId", val)}
                      items={sources.countries}
                      placeholder="Select country"
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="State" required error={errors.stateId}>
                  {isView ? (
                    <ReadOnly>{v(rec.stateName)}</ReadOnly>
                  ) : (
                    <SelectField
                      value={form.stateId}
                      onChange={(val) => setField("stateId", val)}
                      items={sources.states}
                      placeholder={form.countryId ? "Select state" : "Select country first"}
                      loading={loadingStates}
                      disabled={saving || !form.countryId || loadingStates}
                    />
                  )}
                </Field>

                <Field label="City" required error={errors.cityId}>
                  {isView ? (
                    <ReadOnly>{v(rec.jobLocationName)}</ReadOnly>
                  ) : (
                    <SelectField
                      value={form.cityId}
                      onChange={(val) => setField("cityId", val)}
                      items={sources.cities}
                      placeholder={form.stateId ? "Select city" : "Select state first"}
                      loading={loadingCities}
                      disabled={saving || !form.stateId || loadingCities}
                    />
                  )}
                </Field>

                <Field label="Deadline" required error={errors.deadline}>
                  {isView ? (
                    <ReadOnly>{fmtDate(rec.jQ_deadline)}</ReadOnly>
                  ) : (
                    <input
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setField("deadline", e.target.value)}
                      className={inputClass}
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Expected Joining Date">
                  {isView ? (
                    <ReadOnly>{fmtDate(rec.jQ_expected_joining_date)}</ReadOnly>
                  ) : (
                    <input
                      type="date"
                      value={form.expectedJoiningDate}
                      onChange={(e) => setField("expectedJoiningDate", e.target.value)}
                      className={inputClass}
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Assigned To (User ID)">
                  {isView ? (
                    <ReadOnly>{v(rec.assignedToName ?? rec.jQ_assigned_to)}</ReadOnly>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      value={form.assignedTo}
                      onChange={(e) => setField("assignedTo", e.target.value)}
                      placeholder="Optional"
                      className={inputClass}
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Status" required error={errors.jobStatusId}>
                  {isView ? (
                    <ReadOnly>{v(rec.jobStatusName)}</ReadOnly>
                  ) : (
                    <SelectField
                      value={form.jobStatusId}
                      onChange={(val) => setField("jobStatusId", val)}
                      items={JOB_STATUSES}
                      placeholder="Select status"
                      disabled={saving}
                    />
                  )}
                </Field>

                <Field label="Job Description" required full alignTop error={errors.description}>
                  {isView ? (
                    <ReadOnly multiline>{v(rec.jQ_description)}</ReadOnly>
                  ) : (
                    <div>
                      <textarea
                        rows={5}
                        maxLength={DESCRIPTION_MAX}
                        value={form.description}
                        onChange={(e) => setField("description", e.target.value)}
                        placeholder="Describe the role, responsibilities, and expectations..."
                        className={`${inputClass} resize-y`}
                        disabled={saving}
                      />
                      <div className="mt-1 flex justify-end">
                        <span className="text-[11px] text-slate-500">
                          {form.description.length}/{DESCRIPTION_MAX}
                        </span>
                      </div>
                    </div>
                  )}
                </Field>

                <Field label="Attachment (JD file)" full alignTop>
                  {isView ? (
                    <ReadOnly>
                      {rec.jQ_jd_file_path
                        ? fileNameFromPath(rec.jQ_jd_file_path)
                        : "No file attached"}
                    </ReadOnly>
                  ) : (
                    <>
                      <input
                        key={fileInputKey}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setField("attachment", e.target.files?.[0] ?? null)}
                        disabled={saving}
                        className="block w-full cursor-pointer text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#2f6b8a]/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#2f6b8a] hover:file:bg-[#2f6b8a]/20"
                      />
                      <p className="mt-1.5 text-xs text-slate-500">Optional. PDF / DOC / DOCX.</p>
                      {form.attachment ? (
                        <p className="mt-1 break-all text-xs text-slate-600">
                          Selected: {form.attachment.name}
                        </p>
                      ) : (
                        rec.jQ_jd_file_path && (
                          <p className="mt-1 break-all text-xs text-slate-500">
                            Current: {fileNameFromPath(rec.jQ_jd_file_path)} (upload a new file to replace it)
                          </p>
                        )
                      )}
                    </>
                  )}
                </Field>
              </div>

              {/* FOOTER */}
              <div className="mt-6 flex justify-between gap-3 border-t border-slate-100 pt-4">
                {isView ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={isCreate ? () => navigate(-1) : handleCancelEdit}
                      disabled={saving}
                      className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || loadingCategories || loadingRoles || loadingStates || loadingCities}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      {saving ? "Saving..." : isCreate ? "Create" : "Save Changes"}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}