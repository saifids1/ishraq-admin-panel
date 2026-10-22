import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronsLeft,
  Pencil,
  Paperclip,
  Plus,
  X as CloseIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import jobRequirementApi from "../../../api/Services/jobRequirementApi";
import { getAllEmployers } from "../../../api/employerApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import jobRoleApi from "../../../api/Services/jobRoleApi";
import jobCategoryApi from "../../../api/Services/jobCategoryApi";
import employmentTypeApi from "../../../api/Services/employmentTypeApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";
import { useStatusModal } from "../../../components/common/StatusModalProvider";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const first = (item, ...keys) => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) return item[key];

    const actualKey = Object.keys(item || {}).find(
      (candidate) => candidate.toLowerCase() === key.toLowerCase(),
    );
    if (actualKey) return item[actualKey];
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
    .filter((item) => item.id && item.name);

const EMPTY = {
  employerId: "",
  instituteTypeId: "",
  roleId: "",
  categoryId: "",
  employmentTypeId: "",
  positionTitle: "",
  departmentSpeciality: "",
  vacancies: "",
  qualificationRequired: "",
  experienceRequired: "",
  salaryRange: "",
  jobLocation: "",
  dutyHours: "",
  accommodation: false,
  foodFacility: false,
  expectedJoiningDate: "",
  postExpireDedline: "",
  description: "",
  assignedTo: "",
};

const recordFrom = (response) => {
  const root = response?.data ?? response;
  const payload = root?.data ?? root?.Data ?? root;
  return payload?.data ?? payload?.Data ?? payload;
};

const dateInput = (value) => (value ? String(value).slice(0, 10) : "");

const formFromRecord = (item) => ({
  ...EMPTY,
  employerId: String(
    first(item, "jQ_employer_id", "JQ_employer_id", "employerId"),
  ),
  instituteTypeId: String(
    first(
      item,
      "jQ_institute_type_id",
      "JQ_institute_type_id",
      "instituteTypeId",
    ),
  ),
  roleId: String(first(item, "jQ_job_role_id", "JQ_job_role_id", "jobRoleId")),
  categoryId: String(
    first(item, "jQ_job_category_id", "JQ_job_category_id", "jobCategoryId"),
  ),
  employmentTypeId: String(
    first(
      item,
      "jQ_employment_type_id",
      "JQ_employment_type_id",
      "employmentTypeId",
    ),
  ),
  positionTitle: String(
    first(item, "jQ_position_title", "JQ_position_title", "position") || "",
  ),
  departmentSpeciality: String(
    first(
      item,
      "jQ_department_speciality",
      "JQ_department_speciality",
      "department",
    ) || "",
  ),
  vacancies: String(
    first(item, "jQ_vacancies", "JQ_vacancies", "vacancies") || "",
  ),
  qualificationRequired: String(
    first(item, "jQ_qualification_required", "JQ_qualification_required") || "",
  ),
  experienceRequired: String(
    first(item, "jQ_experience_required", "JQ_experience_required") || "",
  ),
  salaryRange: String(first(item, "jQ_salary_range", "JQ_salary_range") || ""),
  jobLocation: String(
    first(item, "jQ_job_location", "JQ_job_location", "jobLocation") || "",
  ),
  dutyHours: String(first(item, "jQ_duty_hours", "JQ_duty_hours") || ""),
  accommodation: Boolean(first(item, "jQ_accommodation", "JQ_accommodation")),
  foodFacility: Boolean(first(item, "jQ_food_facility", "JQ_food_facility")),
  expectedJoiningDate: dateInput(
    first(item, "jQ_expected_joining_date", "JQ_expected_joining_date"),
  ),
  postExpireDedline: dateInput(first(item, "jQ_deadline", "JQ_deadline")),
  description: String(first(item, "jQ_description", "JQ_description") || ""),
  assignedTo: String(
    first(item, "jQ_assigned_to", "JQ_assigned_to", "assignedTo") || "",
  ),
});

export default function JobRequirementCreate({ mode = "create" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const listPath = "/admin/job-requirement-list";
  const isCreate = mode === "create" || !id;
  const [isView, setIsView] = useState(mode === "view");
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [sources, setSources] = useState({
    employers: [],
    institutes: [],
    roles: [],
    categories: [],
    employmentTypes: [],
    cities: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [loadingRecord, setLoadingRecord] = useState(!isCreate);

  const { showStatus } = useStatusModal();

  useEffect(() => {
    setIsView(mode === "view");
  }, [mode, id]);

  useEffect(() => {
    if (isCreate) {
      setForm(EMPTY);
      setLoadingRecord(false);
      return undefined;
    }

    let cancelled = false;
    const loadRecord = async () => {
      setLoadingRecord(true);
      setError("");
      try {
        const response = await jobRequirementApi.getById(id);
        const record = recordFrom(response);
        if (!record || typeof record !== "object") {
          throw new Error("Job requirement was not found.");
        }
        if (!cancelled) setForm(formFromRecord(record));
      } catch (err) {
        if (!cancelled)
          setError(
            getApiErrorMessage(err) || "Unable to load job requirement.",
          );
      } finally {
        if (!cancelled) setLoadingRecord(false);
      }
    };

    loadRecord();
    return () => {
      cancelled = true;
    };
  }, [id, isCreate]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAllEmployers(),
      instituteTypeApi.getAllList(),
      employmentTypeApi.getAllList(),
      cityMasterApi.getAllList(),
    ])
      .then(([employers, institutes, employmentTypes, cities]) => {
        if (cancelled) return;
        setSources({
          employers: options(
            employers,
            ["EM_employer_id", "employerId", "id"],
            ["EM_organization_name", "EM_name", "organizationName", "name"],
          ).map((employer) => ({
            ...employer,
            // Capture the institute type associated with each employer
            instituteTypeId: String(
              first(
                employer.raw,
                "EM_institute_type_id",
                "em_institute_type_id",
                "Employer_institute_type_id",
                "instituteTypeId",
                "IT_institute_type_id",
              ) || "",
            ),
          })),
          institutes: options(
            institutes,
            [
              "iT_institute_type_id",
              "IT_institute_type_id",
              "instituteTypeId",
              "id",
            ],
            ["iT_name", "IT_name", "IT_institute_type_name", "name"],
          ),
          roles: [],
          categories: [],
          employmentTypes: options(
            employmentTypes,
            [
              "eT_employment_type_id",
              "ET_employment_type_id",
              "employmentTypeId",
              "id",
            ],
            ["eT_name", "ET_name", "ET_employment_type_name", "name"],
          ),
          cities: options(
            cities,
            ["ctM_Id", "CTM_Id", "cityId", "id"],
            ["ctM_CityName", "CTM_Name", "CTM_name", "cityName", "name"],
          ),
        });
      })
      .catch(
        (err) =>
          !cancelled &&
          setError(getApiErrorMessage(err) || "Unable to load form options."),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const disabled =
    loading || loadingRecord || loadingRoles || loadingCategories || saving;

  const handleEditClick = () => {
    setIsView(false);
    setError("");
  };

  useEffect(() => {
    let cancelled = false;
    setSources((current) => ({ ...current, categories: [], roles: [] }));
    if (!form.instituteTypeId) {
      setLoadingCategories(false);
      return undefined;
    }

    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await jobCategoryApi.getByInstituteType(
          Number(form.instituteTypeId),
        );
        if (!cancelled) {
          setSources((current) => ({
            ...current,
            categories: options(
              response,
              [
                "jC_job_category_id",
                "JC_job_category_id",
                "jobCategoryId",
                "id",
              ],
              ["jC_name", "JC_name", "JC_job_category_name", "name"],
            ),
          }));
        }
      } catch (err) {
        if (!cancelled)
          setError(getApiErrorMessage(err) || "Unable to load job categories.");
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [form.instituteTypeId]);

  useEffect(() => {
    let cancelled = false;
    setSources((current) => ({ ...current, roles: [] }));
    if (!form.categoryId) {
      setLoadingRoles(false);
      return undefined;
    }

    const loadRoles = async () => {
      setLoadingRoles(true);
      try {
        const response = await jobRoleApi.getByJobCategory(
          Number(form.categoryId),
        );
        if (!cancelled) {
          setSources((current) => ({
            ...current,
            roles: options(
              response,
              ["jR_job_role_id", "JR_job_role_id", "jobRoleId", "id"],
              ["jR_name", "JR_name", "JR_job_role_name", "name"],
            ),
          }));
        }
      } catch (err) {
        if (!cancelled)
          setError(getApiErrorMessage(err) || "Unable to load job roles.");
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    };

    loadRoles();
    return () => {
      cancelled = true;
    };
  }, [form.categoryId]);

  const set = (name, value) => {
    setForm((current) => {
      const next = { ...current, [name]: value };

      // Auto-fill institute type when employer is selected
      if (name === "employerId") {
        const employer = sources.employers.find(
          (item) => String(item.id) === String(value),
        );
        const autoInstituteTypeId = employer?.instituteTypeId || "";
        next.instituteTypeId = autoInstituteTypeId;
        // Reset dependent fields because institute type (and its category/role) changed
        next.categoryId = "";
        next.roleId = "";
      }

      if (name === "instituteTypeId") {
        next.categoryId = "";
        next.roleId = "";
      }
      if (name === "categoryId") {
        next.roleId = "";
      }

      return next;
    });

    setErrors((current) => ({
      ...current,
      [name]: undefined,
      ...(name === "employerId"
        ? {
            instituteTypeId: undefined,
            categoryId: undefined,
            roleId: undefined,
          }
        : {}),
      ...(name === "instituteTypeId"
        ? { categoryId: undefined, roleId: undefined }
        : {}),
      ...(name === "categoryId" ? { roleId: undefined } : {}),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (isView) return;
    const required = [
      "employerId",
      "instituteTypeId",
      "roleId",
      "categoryId",
      "employmentTypeId",
      "positionTitle",
      "vacancies",
    ];
    const nextErrors = Object.fromEntries(
      required
        .filter((name) => !String(form[name]).trim())
        .map((name) => [name, "This field is required."]),
    );
    if (form.vacancies && Number(form.vacancies) <= 0)
      nextErrors.vacancies = "Vacancies must be greater than zero.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    if (
      !sources.categories.some(
        (category) => String(category.id) === String(form.categoryId),
      ) ||
      !sources.roles.some((role) => String(role.id) === String(form.roleId))
    ) {
      setErrors({
        categoryId: sources.categories.some(
          (category) => String(category.id) === String(form.categoryId),
        )
          ? undefined
          : "Select a Job Category for the selected Institute Type.",
        roleId: sources.roles.some(
          (role) => String(role.id) === String(form.roleId),
        )
          ? undefined
          : "Select a Job Role for the selected Job Category.",
      });
      return;
    }
    const payload = {
      JQ_employer_id: Number(form.employerId),
      JQ_institute_type_id: Number(form.instituteTypeId),
      JQ_job_category_id: Number(form.categoryId),
      JQ_job_role_id: Number(form.roleId),
      JQ_position_title: form.positionTitle.trim(),
      JQ_department_speciality: form.departmentSpeciality.trim(),
      JQ_vacancies: Number(form.vacancies),
      JQ_qualification_required: form.qualificationRequired.trim(),
      JQ_experience_required: form.experienceRequired.trim(),
      JQ_salary_range: form.salaryRange.trim(),
      JQ_deadline: form.postExpireDedline || "",
      JQ_job_location: form.jobLocation ? Number(form.jobLocation) : "",
      JQ_employment_type_id: Number(form.employmentTypeId),
      JQ_duty_hours: form.dutyHours.trim(),
      JQ_accommodation: Boolean(form.accommodation),
      JQ_food_facility: Boolean(form.foodFacility),
      JQ_expected_joining_date: form.expectedJoiningDate || "",
      JQ_description: form.description.trim(),
      JQ_assigned_to: form.assignedTo ? Number(form.assignedTo) : "",
    };
    const data = new FormData();
    Object.entries(payload).forEach(([key, value]) =>
      data.append(key, String(value ?? "")),
    );
    if (file) data.append("Attachment", file, file.name);
    try {
      setSaving(true);
      setError("");
      if (isCreate) {
        await jobRequirementApi.create(data);
        showStatus("success", `Created job requirement successfully.`);
      } else {
        await jobRequirementApi.update(id, data);
        showStatus("update", `Updated job requirement successfully.`);
      }
      navigate("/admin/job-requirement-list");
    } catch (err) {
      showStatus(
        "error",
        getApiErrorMessage(err) || "Unable to create job requirement.",
      );
      setError(
        getApiErrorMessage(err) || "Unable to create job requirement.",
      );
    } finally {
      setSaving(false);
    }
  };

  const star = <span className="ml-1 text-red-500">*</span>;

  const field = (name, label, children, { full = false, required = false } = {}) => (
    <div className={full ? "md:col-span-2" : ""} key={name}>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && star}
      </label>
      {children}
      {errors[name] && (
        <span className="mt-1 block text-xs text-red-500">{errors[name]}</span>
      )}
    </div>
  );

  const select = (name, items, placeholder, { lock = false } = {}) => (
    <div className="relative">
      <select
        value={form[name]}
        onChange={(e) => set(name, e.target.value)}
        className={selectClass}
        disabled={
          loading ||
          loadingRecord ||
          loadingRoles ||
          loadingCategories ||
          saving ||
          isView ||
          lock
        }
      >
        <option value="">
          {loading || loadingRoles || loadingCategories
            ? "Loading..."
            : placeholder}
        </option>
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
      type={type}
      value={form[name]}
      onChange={(e) => set(name, e.target.value)}
      min={type === "number" ? 1 : undefined}
      placeholder={placeholder}
      className={inputClass}
      disabled={saving || loadingRecord || isView}
    />
  );

  // Auto-filled institute type is locked while an employer is selected
  const instituteTypeLocked = Boolean(form.employerId);

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
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {field(
                "employerId",
                "Employer",
                select("employerId", sources.employers, "Select employer"),
                { required: true },
              )}
              {field(
                "instituteTypeId",
                "Organization Type",
                select(
                  "instituteTypeId",
                  sources.institutes,
                  form.employerId
                    ? "Auto-filled from employer"
                    : "organization type will selected as per employer",
                  { lock: instituteTypeLocked },
                ),
                { required: true },
              )}
              {field(
                "categoryId",
                "Job Category",
                select(
                  "categoryId",
                  sources.categories,
                  form.instituteTypeId
                    ? "Select job category"
                    : "Select institute type first",
                ),
                { required: true },
              )}
              {field(
                "roleId",
                "Job Role",
                select(
                  "roleId",
                  sources.roles,
                  form.categoryId
                    ? "Select job role"
                    : "Select job category first",
                ),
                { required: true },
              )}
              {field(
                "employmentTypeId",
                "Employment Type",
                select(
                  "employmentTypeId",
                  sources.employmentTypes,
                  "Select employment type",
                ),
                { required: true },
              )}
              {field(
                "positionTitle",
                "Position Title",
                text("positionTitle", "text", "e.g. Staff Nurse"),
                { required: true },
              )}
              {field(
                "departmentSpeciality",
                "Department / Speciality",
                text("departmentSpeciality", "text", "e.g. ICU, Cardiology"),
              )}
              {field(
                "vacancies",
                "Number of Vacancies",
                text("vacancies", "number", "e.g. 3"),
                { required: true },
              )}
              {field(
                "qualificationRequired",
                "Qualification Required",
                text("qualificationRequired", "text", "e.g. B.Sc Nursing"),
              )}
              {field(
                "experienceRequired",
                "Experience Required",
                text("experienceRequired", "text", "e.g. 2+ years"),
              )}
              {field(
                "salaryRange",
                "Salary Range",
                text("salaryRange", "text", "e.g. ₹25k–₹40k"),
              )}
              {field(
                "jobLocation",
                "Job Location",
                select("jobLocation", sources.cities, "Select city"),
              )}
              {field(
                "dutyHours",
                "Duty Hours",
                text("dutyHours", "text", "e.g. 8 hrs / shift"),
              )}
              {/* {field(
                "expectedJoiningDate",
                "Expected Joining Date",
                text("expectedJoiningDate", "date"),
              )} */}
              {/* {field(
                "postExpireDedline",
                "Post Expiry Date",
                text("postExpireDedline", "date"),
              )} */}
              {/* {field(
                "assignedTo",
                "Assign To (optional)",
                text("assignedTo", "number", "Recruiter ID"),
              )} */}

              {/* Toggles */}
              {field(
                "accommodation",
                "Accommodation",
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.accommodation}
                    onChange={(e) => set("accommodation", e.target.checked)}
                    disabled={saving || isView}
                    className="h-4 w-4 accent-[#2f6b8a]"
                  />
                  Available
                </label>,
              )}
              {field(
                "foodFacility",
                "Food Facility",
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.foodFacility}
                    onChange={(e) => set("foodFacility", e.target.checked)}
                    disabled={saving || isView}
                    className="h-4 w-4 accent-[#2f6b8a]"
                  />
                  Available
                </label>,
              )}

              {field(
                "description",
                "Job Description / Special Requirements",
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe responsibilities, shifts, special requirements..."
                  className={inputClass}
                  disabled={saving || isView}
                />,
                { full: true },
              )}

              {/* Attachment */}
              {/* <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Job Description Attachment
                </label>
                <input
                  id="job-attachment"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={saving || isView}
                  hidden
                />
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
                  <label
                    htmlFor="job-attachment"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#2f6b8a] bg-white px-4 py-2 text-sm font-medium text-[#2f6b8a] transition hover:bg-[#eaf2f7]"
                  >
                    <Paperclip size={15} />
                    {file ? "Change file" : "Choose file"}
                  </label>
                  <span className="truncate text-sm text-slate-600">
                    {file ? file.name : "No file chosen"}
                  </span>
                  {file && (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="ml-auto inline-flex h-7 w-7 cursor-pointer place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      title="Remove file"
                      aria-label="Remove file"
                    >
                      <CloseIcon size={16} />
                    </button>
                  )}
                </div>
                <span className="mt-1 block text-xs text-slate-500">
                  PDF, DOC or DOCX only
                </span>
              </div> */}
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

              {isView && (
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
                >
                  <Pencil size={16} />
                  Edit
                </button>
              )}

              {!isView && (
                <button
                  type="submit"
                  disabled={disabled}
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