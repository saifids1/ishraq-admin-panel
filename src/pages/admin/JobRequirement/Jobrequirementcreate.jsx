import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronsLeft, Pencil, Plus } from "lucide-react";
import jobRequirementApi from "../../../api/Services/jobRequirementApi";
import { getAllEmployers } from "../../../api/employerApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import jobRoleApi from "../../../api/Services/jobRoleApi";
import jobCategoryApi from "../../../api/Services/jobCategoryApi";
import employmentTypeApi from "../../../api/Services/employmentTypeApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import { useStatusModal } from "../../../components/common/StatusModalProvider";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

/* ------------------------------ STYLES ------------------------------ */

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const DESCRIPTION_MAX = 500;

/* ------------------------------ HELPERS ------------------------------ */

const first = (item, ...keys) => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) return item[key];
    // case-insensitive fallback
    const actualKey = Object.keys(item || {}).find(
      (candidate) => candidate.toLowerCase() === key.toLowerCase(),
    );
    if (actualKey !== undefined && item[actualKey] !== null) {
      return item[actualKey];
    }
  }
  return "";
};

const listFrom = (response) => {
  const root = response?.data ?? response;
  for (const value of [
    root?.data?.data,
    root?.Data?.Data,
    root?.data,
    root?.Data,
    root,
  ]) {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.Data)) return value.Data;
  }
  return [];
};

const options = (response, ids, names) =>
  listFrom(response)
    .map((item) => ({
      id: first(item, ...ids),
      name: first(item, ...names),
      raw: item,
    }))
    .filter((item) => item.id !== "" && item.name !== "");

/* ------------------------------ FORM SHAPE ------------------------------ */

const EMPTY = {
  JQ_employer_id: "",
  JQ_institute_type_id: "",
  JQ_job_category_id: "",
  JQ_job_role_id: "",
  JQ_deadline: "",
  JQ_position_title: "",
  JQ_department_speciality: "",
  JQ_vacancies: "",
  JQ_qualification_required: "",
  JQ_experience_required: "",
  JQ_salary_range: "",
  JQ_country_id: "",
  JQ_state_id: "",
  JQ_job_location: "",
  JQ_employment_type_id: "",
  JQ_duty_hours: "",
  JQ_accommodation: false,
  JQ_food_facility: false,
  JQ_expected_joining_date: "",
  JQ_description: "",
  JQ_assigned_to: "",
  Attachment: null,
  /** Existing uploaded file (from API) — read-only display */
  existingAttachmentPath: "",
};

const recordFrom = (response) => {
  const root = response?.data ?? response;
  const payload = root?.data ?? root?.Data ?? root;
  return payload?.data ?? payload?.Data ?? payload;
};

const dateInput = (value) => (value ? String(value).slice(0, 10) : "");

/* The GET API returns jQ_* (lowercase j). Read with case-insensitive `first`. */
const formFromRecord = (item) => ({
  JQ_employer_id: String(first(item, "jQ_employer_id", "JQ_employer_id") ?? ""),
  JQ_institute_type_id: String(
    first(item, "jQ_institute_type_id", "JQ_institute_type_id") ?? "",
  ),
  JQ_job_category_id: String(
    first(item, "jQ_job_category_id", "JQ_job_category_id") ?? "",
  ),
  JQ_job_role_id: String(
    first(item, "jQ_job_role_id", "JQ_job_role_id") ?? "",
  ),
  JQ_deadline: dateInput(first(item, "jQ_deadline", "JQ_deadline")),
  JQ_position_title: String(
    first(item, "jQ_position_title", "JQ_position_title") ?? "",
  ),
  JQ_department_speciality: String(
    first(item, "jQ_department_speciality", "JQ_department_speciality") ?? "",
  ),
  JQ_vacancies: String(first(item, "jQ_vacancies", "JQ_vacancies") ?? ""),
  JQ_qualification_required: String(
    first(item, "jQ_qualification_required", "JQ_qualification_required") ?? "",
  ),
  JQ_experience_required: String(
    first(item, "jQ_experience_required", "JQ_experience_required") ?? "",
  ),
  JQ_salary_range: String(
    first(item, "jQ_salary_range", "JQ_salary_range") ?? "",
  ),
  // Country and state IDs must come from the record so their lists load by ID.
  JQ_country_id: String(first(item, "jQ_country_id", "JQ_country_id") ?? ""),
  JQ_state_id: String(first(item, "jQ_state_id", "JQ_state_id") ?? ""),
  JQ_job_location: String(
    first(item, "jQ_job_location", "JQ_job_location") ?? "",
  ),
  JQ_employment_type_id: String(
    first(item, "jQ_employment_type_id", "JQ_employment_type_id") ?? "",
  ),
  JQ_duty_hours: String(first(item, "jQ_duty_hours", "JQ_duty_hours") ?? ""),
  JQ_accommodation: Boolean(first(item, "jQ_accommodation", "JQ_accommodation")),
  JQ_food_facility: Boolean(
    first(item, "jQ_food_facility", "JQ_food_facility"),
  ),
  JQ_expected_joining_date: dateInput(
    first(item, "jQ_expected_joining_date", "JQ_expected_joining_date"),
  ),
  JQ_description: String(
    first(item, "jQ_description", "JQ_description") ?? "",
  ).slice(0, DESCRIPTION_MAX),
  JQ_assigned_to: String(
    first(item, "jQ_assigned_to", "JQ_assigned_to") ?? "",
  ),
  Attachment: null,
  existingAttachmentPath: String(
    first(item, "jQ_jd_file_path", "JQ_jd_file_path") ?? "",
  ),
});

const fileNameFromPath = (path) => {
  if (!path) return "";
  const s = String(path);
  const part = s.split("/").pop() || s;
  return decodeURIComponent(part);
};

/* ------------------------------ COMPONENT ------------------------------ */

export default function JobRequirementCreate({ mode = "create" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const listPath = "/admin/job-requirement-list";
  const isCreate = mode === "create" || !id;

  const [isView, setIsView] = useState(mode === "view");
  const [form, setForm] = useState(EMPTY);

  const [sources, setSources] = useState({
    employers: [],
    institutes: [],
    roles: [],
    categories: [],
    employmentTypes: [],
    countries: [],
    states: [],
    cities: [],
  });

  const [loadingRecord, setLoadingRecord] = useState(!isCreate);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});

  const { showStatus } = useStatusModal();

  /* Stale-response guards */
  const categoryReqId = useRef(0);
  const roleReqId = useRef(0);

  const autoSyncedInstitute = useRef(false);

  /* --------------------------- MODE SYNC --------------------------- */

  useEffect(() => {
    setIsView(mode === "view");
  }, [mode, id]);

  /* --------------------------- LOAD RECORD --------------------------- */

  useEffect(() => {
    if (isCreate) {
      setForm(EMPTY);
      setLoadingRecord(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingRecord(true);
    setError("");

    jobRequirementApi
      .getById(id)
      .then((response) => {
        if (cancelled) return;
        const record = recordFrom(response);
        if (!record || typeof record !== "object") {
          throw new Error("Job requirement was not found.");
        }
        setForm(formFromRecord(record));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err) || "Unable to load job requirement.");
      })
      .finally(() => {
        if (!cancelled) setLoadingRecord(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isCreate]);

  /* --------------------------- BASE OPTIONS (loaded once) --------------------------- */
  // Country is the only full-list master here. States and cities load by parent ID below.

  useEffect(() => {
    let cancelled = false;

    const load = (fetcher, extract, apply) => {
      fetcher()
        .then((res) => {
          if (!cancelled) apply(extract(res));
        })
        .catch((err) => {
          if (!cancelled) {
            setError(
              (prev) =>
                prev ||
                getApiErrorMessage(err) ||
                "Some form options could not be loaded.",
            );
          }
        });
    };

    load(
      getAllEmployers,
      (res) =>
        options(res, ["eM_employer_id"], ["eM_organization_name"]).map(
          (employer) => ({
            ...employer,
            instituteTypeId: String(
              first(employer.raw, "eM_institute_type_id") ?? "",
            ),
          }),
        ),
      (employers) => setSources((s) => ({ ...s, employers })),
    );

    load(
      () => instituteTypeApi.getAllList(),
      (res) => options(res, ["iT_institute_type_id"], ["iT_name"]),
      (institutes) => setSources((s) => ({ ...s, institutes })),
    );

    load(
      () => employmentTypeApi.getAllList(),
      (res) => options(res, ["eT_employment_type_id"], ["eT_name"]),
      (employmentTypes) => setSources((s) => ({ ...s, employmentTypes })),
    );

    load(
      () => countryMasterApi.getAllList(),
      (res) => options(res, ["cM_Id"], ["cM_CountryName"]),
      (countries) => setSources((s) => ({ ...s, countries })),
    );

    return () => {
      cancelled = true;
    };
  }, []);

  /* --------------------------- AUTO-SYNC INSTITUTE TYPE FROM EMPLOYER --------------------------- */

  useEffect(() => {
    if (!form.JQ_employer_id) return;
    if (!sources.employers.length) return;

    const employer = sources.employers.find(
      (item) => String(item.id) === String(form.JQ_employer_id),
    );
    if (!employer) return;

    const employerInstitute = String(employer.instituteTypeId || "");
    if (!employerInstitute) return;

    if (form.JQ_institute_type_id === employerInstitute) return;

    if (!form.JQ_institute_type_id || !autoSyncedInstitute.current) {
      autoSyncedInstitute.current = true;
      setForm((current) => ({
        ...current,
        JQ_institute_type_id: employerInstitute,
        JQ_job_category_id:
          current.JQ_institute_type_id === employerInstitute
            ? current.JQ_job_category_id
            : "",
        JQ_job_role_id:
          current.JQ_institute_type_id === employerInstitute
            ? current.JQ_job_role_id
            : "",
      }));
    }
  }, [form.JQ_employer_id, form.JQ_institute_type_id, sources.employers]);

  /* --------------------------- STATES BY COUNTRY ID --------------------------- */

  useEffect(() => {
    if (!form.JQ_country_id) {
      setSources((s) => ({ ...s, states: [] }));
      setLoadingStates(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingStates(true);

    stateMasterApi
      .getByCountry(Number(form.JQ_country_id))
      .then((res) => {
        if (cancelled) return;
        setSources((s) => ({
          ...s,
          states: options(res, ["sM_Id"], ["sM_StateName"]),
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        setSources((s) => ({ ...s, states: [] }));
        setError(getApiErrorMessage(err) || "Unable to load states.");
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.JQ_country_id]);

  /* --------------------------- CITIES BY STATE ID --------------------------- */

  useEffect(() => {
    if (!form.JQ_state_id) {
      setSources((s) => ({ ...s, cities: [] }));
      setLoadingCities(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingCities(true);

    cityMasterApi
      .getByState(Number(form.JQ_state_id))
      .then((res) => {
        if (cancelled) return;
        setSources((s) => ({
          ...s,
          cities: options(res, ["ctM_Id"], ["ctM_CityName"]),
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        setSources((s) => ({ ...s, cities: [] }));
        setError(getApiErrorMessage(err) || "Unable to load cities.");
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.JQ_state_id]);

  /* --------------------------- CATEGORIES --------------------------- */

  useEffect(() => {
    const reqId = ++categoryReqId.current;
    let cancelled = false;

    setSources((s) => ({ ...s, categories: [], roles: [] }));

    if (!form.JQ_institute_type_id) {
      setLoadingCategories(false);
      return undefined;
    }

    setLoadingCategories(true);

    jobCategoryApi
      .getByInstituteType(Number(form.JQ_institute_type_id))
      .then((response) => {
        if (cancelled || reqId !== categoryReqId.current) return;
        setSources((s) => ({
          ...s,
          categories: options(response, ["jC_job_category_id"], ["jC_name"]),
        }));
      })
      .catch((err) => {
        if (cancelled || reqId !== categoryReqId.current) return;
        setError(getApiErrorMessage(err) || "Unable to load job categories.");
      })
      .finally(() => {
        if (!cancelled && reqId === categoryReqId.current) {
          setLoadingCategories(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [form.JQ_institute_type_id]);

  /* --------------------------- ROLES --------------------------- */

  useEffect(() => {
    const reqId = ++roleReqId.current;
    let cancelled = false;

    setSources((s) => ({ ...s, roles: [] }));

    if (!form.JQ_job_category_id) {
      setLoadingRoles(false);
      return undefined;
    }

    setLoadingRoles(true);

    jobRoleApi
      .getByJobCategory(Number(form.JQ_job_category_id))
      .then((response) => {
        if (cancelled || reqId !== roleReqId.current) return;
        setSources((s) => ({
          ...s,
          roles: options(response, ["jR_job_role_id"], ["jR_name"]),
        }));
      })
      .catch((err) => {
        if (cancelled || reqId !== roleReqId.current) return;
        setError(getApiErrorMessage(err) || "Unable to load job roles.");
      })
      .finally(() => {
        if (!cancelled && reqId === roleReqId.current) {
          setLoadingRoles(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [form.JQ_job_category_id]);

  /* --------------------------- SETTER --------------------------- */
  // Only user actions go through here, so saved values are not cleared on load.

  const set = (name, value) => {
    setForm((current) => {
      const next = { ...current, [name]: value };

      if (name === "JQ_employer_id") {
        const employer = sources.employers.find(
          (item) => String(item.id) === String(value),
        );
        next.JQ_institute_type_id = employer?.instituteTypeId || "";
        next.JQ_job_category_id = "";
        next.JQ_job_role_id = "";
      }
      if (name === "JQ_institute_type_id") {
        next.JQ_job_category_id = "";
        next.JQ_job_role_id = "";
      }
      if (name === "JQ_job_category_id") {
        next.JQ_job_role_id = "";
      }
      if (name === "JQ_country_id") {
        next.JQ_state_id = "";
        next.JQ_job_location = "";
      }
      if (name === "JQ_state_id") {
        next.JQ_job_location = "";
      }
      if (name === "JQ_description") {
        next.JQ_description = String(value ?? "").slice(0, DESCRIPTION_MAX);
      }

      return next;
    });

    setErrors((current) => {
      const next = { ...current, [name]: undefined };
      if (name === "JQ_employer_id") {
        next.JQ_institute_type_id = undefined;
        next.JQ_job_category_id = undefined;
        next.JQ_job_role_id = undefined;
      }
      if (name === "JQ_institute_type_id") {
        next.JQ_job_category_id = undefined;
        next.JQ_job_role_id = undefined;
      }
      if (name === "JQ_job_category_id") {
        next.JQ_job_role_id = undefined;
      }
      if (name === "JQ_country_id") {
        next.JQ_state_id = undefined;
        next.JQ_job_location = undefined;
      }
      if (name === "JQ_state_id") {
        next.JQ_job_location = undefined;
      }
      return next;
    });
  };

  /* --------------------------- SUBMIT --------------------------- */

  const submit = async (event) => {
    event.preventDefault();
    if (isView) return;

    const required = [
      "JQ_employer_id",
      "JQ_institute_type_id",
      "JQ_job_role_id",
      "JQ_job_category_id",
      "JQ_employment_type_id",
      "JQ_position_title",
      "JQ_vacancies",
    ];

    const nextErrors = Object.fromEntries(
      required
        .filter((name) => !String(form[name]).trim())
        .map((name) => [name, "This field is required."]),
    );

    if (form.JQ_vacancies && Number(form.JQ_vacancies) <= 0) {
      nextErrors.JQ_vacancies = "Vacancies must be greater than zero.";
    }

    if (form.JQ_description && form.JQ_description.length > DESCRIPTION_MAX) {
      nextErrors.JQ_description = `Description cannot exceed ${DESCRIPTION_MAX} characters.`;
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const categoryOk = sources.categories.some(
      (category) => String(category.id) === String(form.JQ_job_category_id),
    );
    const roleOk = sources.roles.some(
      (role) => String(role.id) === String(form.JQ_job_role_id),
    );

    if (!categoryOk || !roleOk) {
      setErrors({
        JQ_job_category_id: categoryOk
          ? undefined
          : "Select a Job Category for the selected Institute Type.",
        JQ_job_role_id: roleOk
          ? undefined
          : "Select a Job Role for the selected Job Category.",
      });
      return;
    }

    const payload = {
      JQ_employer_id: Number(form.JQ_employer_id),
      JQ_institute_type_id: Number(form.JQ_institute_type_id),
      JQ_job_category_id: Number(form.JQ_job_category_id),
      JQ_job_role_id: Number(form.JQ_job_role_id),
      JQ_deadline: form.JQ_deadline || "",
      JQ_position_title: form.JQ_position_title.trim(),
      JQ_department_speciality: form.JQ_department_speciality.trim(),
      JQ_vacancies: Number(form.JQ_vacancies),
      JQ_qualification_required: form.JQ_qualification_required.trim(),
      JQ_experience_required: form.JQ_experience_required.trim(),
      JQ_salary_range: form.JQ_salary_range.trim(),
      JQ_job_location: form.JQ_job_location
        ? Number(form.JQ_job_location)
        : "",
      JQ_employment_type_id: Number(form.JQ_employment_type_id),
      JQ_duty_hours: form.JQ_duty_hours.trim(),
      JQ_accommodation: Boolean(form.JQ_accommodation),
      JQ_food_facility: Boolean(form.JQ_food_facility),
      JQ_expected_joining_date: form.JQ_expected_joining_date || "",
      JQ_description: form.JQ_description.trim(),
      JQ_assigned_to: form.JQ_assigned_to ? Number(form.JQ_assigned_to) : "",
    };

    const data = new FormData();
    Object.entries(payload).forEach(([key, value]) =>
      data.append(key, String(value ?? "")),
    );

    if (form.Attachment instanceof File) {
      data.append("Attachment", form.Attachment);
    }

    try {
      setSaving(true);
      setError("");
      if (isCreate) {
        await jobRequirementApi.create(data);
        showStatus("success", "Created job requirement successfully.");
      } else {
        await jobRequirementApi.update(id, data);
        showStatus("update", "Updated job requirement successfully.");
      }
      navigate(listPath);
    } catch (err) {
      const msg = getApiErrorMessage(err) || "Unable to save job requirement.";
      showStatus("error", msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------- UI HELPERS --------------------------- */

  const star = <span className="ml-1 text-red-500">*</span>;

  const field = (
    name,
    label,
    children,
    { full = false, required = false, alignTop = false } = {},
  ) => (
    <div
      key={name}
      className={`flex flex-col gap-1.5 md:flex-row md:gap-3 ${
        alignTop ? "md:items-start" : "md:items-center"
      } ${full ? "md:col-span-2" : ""}`}
    >
      <label
        htmlFor={name}
        className={`text-sm font-medium text-slate-700 md:w-44 md:shrink-0 ${
          alignTop ? "md:pt-2.5" : ""
        }`}
      >
        {label}
        {required && star}
      </label>

      <div className="min-w-0 flex-1">
        {children}
        {errors[name] && (
          <span className="mt-1 block text-xs text-red-500">
            {errors[name]}
          </span>
        )}
      </div>
    </div>
  );

  const select = (
    name,
    items,
    placeholder,
    { lock = false, isLoading = false } = {},
  ) => (
    <div className="relative">
      <select
        id={name}
        value={form[name]}
        onChange={(e) => set(name, e.target.value)}
        className={selectClass}
        disabled={loadingRecord || isLoading || saving || isView || lock}
      >
        <option value="">{isLoading ? "Loading..." : placeholder}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <ChevronDown
        size={17}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </div>
  );

  const text = (name, type = "text", placeholder = "") => (
    <input
      id={name}
      type={type}
      value={form[name]}
      onChange={(e) => set(name, e.target.value)}
      min={type === "number" ? 1 : undefined}
      placeholder={placeholder}
      className={inputClass}
      disabled={saving || loadingRecord || isView}
    />
  );

  const submitDisabled =
    loadingRecord ||
    loadingCategories ||
    loadingRoles ||
    loadingStates ||
    loadingCities ||
    saving;

  /* --------------------------- RENDER --------------------------- */

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

              <h2 className="font-semibold text-slate-800">
                {isCreate
                  ? "Add Job Requirement"
                  : isView
                    ? "View Job Requirement"
                    : "Edit Job Requirement"}
              </h2>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={submit} noValidate className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {field(
                "JQ_employer_id",
                "Employer",
                select("JQ_employer_id", sources.employers, "Select employer"),
                { required: true },
              )}

              {field(
                "JQ_institute_type_id",
                "Organization Type",
                select(
                  "JQ_institute_type_id",
                  sources.institutes,
                  "Select organization type",
                ),
                { required: true },
              )}

              {field(
                "JQ_job_category_id",
                "Job Category",
                select(
                  "JQ_job_category_id",
                  sources.categories,
                  form.JQ_institute_type_id
                    ? "Select job category"
                    : "Select organization type first",
                  { isLoading: loadingCategories },
                ),
                { required: true },
              )}

              {field(
                "JQ_job_role_id",
                "Job Role",
                select(
                  "JQ_job_role_id",
                  sources.roles,
                  form.JQ_job_category_id
                    ? "Select job role"
                    : "Select job category first",
                  { isLoading: loadingRoles },
                ),
                { required: true },
              )}

              {field(
                "JQ_employment_type_id",
                "Employment Type",
                select(
                  "JQ_employment_type_id",
                  sources.employmentTypes,
                  "Select employment type",
                ),
                { required: true },
              )}

              {field(
                "JQ_position_title",
                "Position Required",
                text("JQ_position_title", "text", "e.g. Staff Nurse"),
                { required: true },
              )}

              {field(
                "JQ_department_speciality",
                "Department / Speciality",
                text(
                  "JQ_department_speciality",
                  "text",
                  "e.g. ICU, Cardiology",
                ),
              )}

              {field(
                "JQ_vacancies",
                "Number of Vacancies",
                text("JQ_vacancies", "number", "e.g. 3"),
                { required: true },
              )}

              {field(
                "JQ_qualification_required",
                "Qualification Required",
                text(
                  "JQ_qualification_required",
                  "text",
                  "e.g. B.Sc Nursing",
                ),
              )}

              {field(
                "JQ_experience_required",
                "Experience Required",
                text("JQ_experience_required", "text", "e.g. 2+ years"),
              )}

              {field(
                "JQ_salary_range",
                "Salary / Salary Range",
                text("JQ_salary_range", "text", "e.g. ₹25k–₹40k"),
              )}

              {field(
                "JQ_country_id",
                "Country",
                select("JQ_country_id", sources.countries, "Select country"),
              )}

              {field(
                "JQ_state_id",
                "State",
                select(
                  "JQ_state_id",
                  sources.states,
                  form.JQ_country_id ? "Select state" : "Select country first",
                  {
                    lock: !form.JQ_country_id,
                    isLoading: loadingStates,
                  },
                ),
              )}

              {field(
                "JQ_job_location",
                "Job Location",
                select(
                  "JQ_job_location",
                  sources.cities,
                  form.JQ_state_id ? "Select city" : "Select state first",
                  {
                    lock: !form.JQ_state_id,
                    isLoading: loadingCities,
                  },
                ),
              )}

              {field(
                "JQ_duty_hours",
                "Duty Hours",
                text("JQ_duty_hours", "text", "e.g. 8 hrs / shift"),
              )}

              {field(
                "JQ_accommodation",
                "Accommodation",
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
                  <input
                    id="JQ_accommodation"
                    type="checkbox"
                    checked={form.JQ_accommodation}
                    onChange={(e) => set("JQ_accommodation", e.target.checked)}
                    disabled={saving || isView}
                    className="h-4 w-4 accent-[#2f6b8a]"
                  />
                  Available
                </label>,
              )}

              {field(
                "JQ_food_facility",
                "Food Facility",
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
                  <input
                    id="JQ_food_facility"
                    type="checkbox"
                    checked={form.JQ_food_facility}
                    onChange={(e) => set("JQ_food_facility", e.target.checked)}
                    disabled={saving || isView}
                    className="h-4 w-4 accent-[#2f6b8a]"
                  />
                  Available
                </label>,
              )}

              {field(
                "JQ_expected_joining_date",
                "Expected Joining Date",
                text("JQ_expected_joining_date", "date"),
              )}

              {field(
                "JQ_deadline",
                "Application Deadline",
                text("JQ_deadline", "date"),
              )}

              {/* === Side by side: Job Description | Upload Job Description === */}
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {field(
                    "JQ_description",
                    "Job Description",
                    <div className="min-w-0">
                      <textarea
                        id="JQ_description"
                        rows={6}
                        maxLength={DESCRIPTION_MAX}
                        value={form.JQ_description}
                        onChange={(e) => set("JQ_description", e.target.value)}
                        placeholder="Describe responsibilities, shifts, special requirements..."
                        className={inputClass}
                        disabled={saving || isView}
                      />
                      <div className="mt-1 flex justify-end">
                        <span className="text-[11px] text-slate-500">
                          {form.JQ_description.length}/{DESCRIPTION_MAX}
                        </span>
                      </div>
                    </div>,
                    { alignTop: true },
                  )}

                  {field(
                    "Attachment",
                    "Upload Job Description",
                    <div className="min-h-[9rem] rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                      {isView && !(form.Attachment instanceof File) && form.existingAttachmentPath ? (
                        <p className="break-all text-sm text-slate-700">
                          <span className="font-medium">Uploaded file: </span>
                          {fileNameFromPath(form.existingAttachmentPath)}
                        </p>
                      ) : (
                        <>
                          <input
                            id="Attachment"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) =>
                              set("Attachment", e.target.files?.[0] ?? null)
                            }
                            disabled={saving || isView}
                            className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-[#2f6b8a] file:px-3 file:py-2.5 file:text-sm file:font-medium file:text-white hover:file:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <p className="mt-1.5 text-xs text-slate-500">
                            Optional. PDF / DOC / DOCX.
                          </p>
                          {form.Attachment instanceof File && (
                            <p className="mt-1 break-all text-xs text-slate-600">
                              Selected: {form.Attachment.name}
                            </p>
                          )}
                          {!isView &&
                            !(form.Attachment instanceof File) &&
                            form.existingAttachmentPath && (
                              <p className="mt-1 break-all text-xs text-slate-500">
                                Current: {fileNameFromPath(form.existingAttachmentPath)}
                              </p>
                            )}
                        </>
                      )}
                    </div>,
                    { alignTop: true },
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-4 flex justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => navigate(listPath)}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                {isView ? "Back" : "Cancel"}
              </button>

              {isView ? (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    navigate(`/admin/job-requirements/${id}/edit`, {
                      replace: true,
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
                >
                  <Pencil size={16} />
                  Edit
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={16} />
                  {saving ? "Saving..." : isCreate ? "Create" : "Update"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}