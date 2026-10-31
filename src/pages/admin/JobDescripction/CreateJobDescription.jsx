// src/pages/admin/job/CreateJobDescription.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { ChevronDown, ChevronsLeft, Loader2, Pencil } from "lucide-react";
import {
  getJDByAdminById,
  createJDByAdmin,
  updateJDByAdmin,
} from "../../../api/Services/jdfornonregistercompanyApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import jobCategoryApi from "../../../api/Services/jobCategoryApi";
import jobRoleApi from "../../../api/Services/jobRoleApi";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

/* ------------------------------ CONSTANTS ------------------------------ */

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:cursor-not-allowed disabled:bg-slate-50";

const DESCRIPTION_MAX = 500;

const QUILL_MODULES = {
  toolbar: [
    [{ header: [false] }],
    ["bold", "italic", "underline", "blockquote"],
    [{ color: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    [{ align: [] }],
    ["link", "clean"],
  ],
};

const QUILL_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "blockquote",
  "color",
  "list",
  "indent",
  "align",
  "link",
];

/* ------------------------------ HELPERS ------------------------------ */

// Reads a key case-insensitively, so "categoryId" also matches "CategoryId".
const first = (item, ...keys) => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) return item[key];
    const actualKey = Object.keys(item || {}).find(
      (candidate) => candidate.toLowerCase() === key.toLowerCase(),
    );
    if (actualKey !== undefined && item[actualKey] !== null)
      return item[actualKey];
  }
  return "";
};

// Finds the array inside a master API response, whatever the wrapper looks like.
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

// Finds the single job description object inside a GET response.
const recordFrom = (response) => {
  const root = response?.data ?? response;
  for (const candidate of [root?.data, root?.Data, root]) {
    if (
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      ("jdbA_Id" in candidate || "id" in candidate || "roleId" in candidate)
    ) {
      return candidate;
    }
  }
  return null;
};

const options = (response, idKeys, nameKeys) =>
  listFrom(response)
    .map((item) => ({
      id: first(item, ...idKeys),
      name: first(item, ...nameKeys),
    }))
    .filter((item) => item.id !== "" && item.name !== "");

// Shows "—" for empty values.
const v = (value) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

// Format used in the reference screenshot: 28-04-25 12:19 PM
const fmtDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  const hours24 = d.getHours();
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  const yy = String(d.getFullYear()).slice(-2);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${yy} ${pad(hours12)}:${pad(d.getMinutes())} ${ampm}`;
};

// Strips HTML tags so rich text can be measured and checked for emptiness.
const plainText = (html) =>
  String(html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

/* ------------------------------ FORM ------------------------------ */

const EMPTY = {
  organizationTypeId: "",
  jobCategoryId: "",
  jobRoleId: "",
  description: "",
};

// Maps the GET record (camelCase or PascalCase) into form state.
const formFromRecord = (r) => ({
  organizationTypeId: String(
    first(r, "instituteTypeId", "InstituteTypeId", "jQ_institute_type_id"),
  ),
  jobCategoryId: String(
    first(r, "categoryId", "CategoryId", "jQ_job_category_id"),
  ),
  jobRoleId: String(first(r, "roleId", "RoleId", "jQ_job_role_id")),
  description: String(first(r, "description", "Description", "jQ_description")),
});

const validate = (f) => {
  const errors = {};
  if (!f.organizationTypeId) errors.organizationTypeId = "Select an organization type";
  if (!f.jobCategoryId) errors.jobCategoryId = "Select a job category";
  if (!f.jobRoleId) errors.jobRoleId = "Select a job role";

  const text = plainText(f.description);
  if (!text) errors.description = "Job description is required";
  else if (text.length > DESCRIPTION_MAX)
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or less`;

  return errors;
};

// Field names match the existing backend DTOs exactly.
const toPayload = (f) => ({
  InstituteTypeId: Number(f.organizationTypeId),
  CategoryId: Number(f.jobCategoryId),
  RoleId: Number(f.jobRoleId),
  Description: f.description,
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

const ReadOnly = ({ children }) => (
  <div className="min-h-[38px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 break-words">
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

// Audit header shown at the top of the card, as in the reference screenshot.
const AuditHeader = ({ rec }) => {
  const createdBy = first(rec, "createdBy", "CreatedBy", "jQ_created_by");
  const createdAt = first(rec, "createdAt", "CreatedAt", "jQ_created_at");
  const updatedBy = first(rec, "updatedBy", "UpdatedBy", "jQ_updated_by");
  const updatedAt = first(rec, "updatedAt", "UpdatedAt", "jQ_updated_at");

  return (
    <div className="flex flex-col gap-1 border-b border-slate-200 px-6 py-4 text-sm text-slate-700 md:flex-row md:justify-between">
      <div className="flex flex-col gap-1">
        <p>
          <span className="font-medium">Created By :</span> {v(createdBy)}
        </p>
        <p>
          <span className="font-medium">Created Date :</span>{" "}
          {fmtDateTime(createdAt)}
        </p>
      </div>
      <div className="flex flex-col gap-1 md:text-right">
        <p>
          <span className="font-medium">Last Updated By :</span> {v(updatedBy)}
        </p>
        <p>
          <span className="font-medium">Last Updated Date :</span>{" "}
          {fmtDateTime(updatedAt)}
        </p>
      </div>
    </div>
  );
};

/* ------------------------------ COMPONENT ------------------------------ */

export default function CreateJobDescription() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isCreate = !id;

  const [isView, setIsView] = useState(Boolean(id));
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [savedForm, setSavedForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loadingRecord, setLoadingRecord] = useState(!isCreate);
  const [saving, setSaving] = useState(false);

  const [sources, setSources] = useState({
    institutes: [],
    categories: [],
    roles: [],
  });
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const mastersLoadedRef = useRef(false);
  const categoryReqId = useRef(0);
  const roleReqId = useRef(0);

  /* ----- load the record (view and edit) ----- */
  const loadRecord = async (recordId) => {
    setLoadingRecord(true);
    setError("");
    try {
      const res = await getJDByAdminById(recordId);
      const data = recordFrom(res);
      if (!data) {
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

  /* ----- organization types: loaded once, create and edit only ----- */
  useEffect(() => {
    if (isView || mastersLoadedRef.current) return;
    mastersLoadedRef.current = true;

    instituteTypeApi
      .getAllList()
      .then((res) => {
        setSources((s) => ({
          ...s,
          institutes: options(
            res,
            ["iT_institute_type_id", "instituteTypeId", "id"],
            ["iT_name", "instituteTypeName", "name"],
          ),
        }));
      })
      .catch((err) => {
        setError(getApiErrorMessage(err) || "Unable to load organization types.");
      });
  }, [isView]);

  /* ----- categories depend on organization type (create and edit) ----- */
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
          categories: options(
            res,
            ["jC_job_category_id", "categoryId", "id"],
            ["jC_name", "categoryName", "name"],
          ),
        }));
      })
      .catch((err) => {
        if (cancelled || reqId !== categoryReqId.current) return;
        setError(getApiErrorMessage(err) || "Unable to load job categories.");
      })
      .finally(() => {
        if (!cancelled && reqId === categoryReqId.current)
          setLoadingCategories(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isView, form.organizationTypeId]);

  /* ----- roles depend on job category (create and edit) ----- */
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
          roles: options(
            res,
            ["jR_job_role_id", "roleId", "id"],
            ["jR_name", "roleName", "name"],
          ),
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
  // Changing a parent clears its dependent child.
  const setField = (name, value) => {
    setForm((cur) => {
      const next = { ...cur, [name]: value };
      if (name === "organizationTypeId") {
        next.jobCategoryId = "";
        next.jobRoleId = "";
      }
      if (name === "jobCategoryId") next.jobRoleId = "";
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
        await createJDByAdmin(payload);
        navigate("/admin/jdbyadmin", { replace: true });
      } else {
        await updateJDByAdmin(id, payload);
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
  const descriptionLength = plainText(form.description).length;
  const descriptionHtml = first(rec, "description", "Description");

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

          {/* AUDIT INFO (existing records only) */}
          {!isCreate && !loadingRecord && record && <AuditHeader rec={rec} />}

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
                <Field
                  label="Organization Type"
                  required
                  error={errors.organizationTypeId}
                >
                  {isView ? (
                    <ReadOnly>{v(first(rec, "instituteTypeName"))}</ReadOnly>
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

                <Field
                  label="Job Category"
                  required
                  error={errors.jobCategoryId}
                >
                  {isView ? (
                    <ReadOnly>{v(first(rec, "categoryName"))}</ReadOnly>
                  ) : (
                    <SelectField
                      value={form.jobCategoryId}
                      onChange={(val) => setField("jobCategoryId", val)}
                      items={sources.categories}
                      placeholder={
                        form.organizationTypeId
                          ? "Select job category"
                          : "Select organization type first"
                      }
                      loading={loadingCategories}
                      disabled={saving || !form.organizationTypeId}
                    />
                  )}
                </Field>

                <Field label="Job Role" required error={errors.jobRoleId}>
                  {isView ? (
                    <ReadOnly>{v(first(rec, "roleName"))}</ReadOnly>
                  ) : (
                    <SelectField
                      value={form.jobRoleId}
                      onChange={(val) => setField("jobRoleId", val)}
                      items={sources.roles}
                      placeholder={
                        form.jobCategoryId
                          ? "Select job role"
                          : "Select job category first"
                      }
                      loading={loadingRoles}
                      disabled={saving || !form.jobCategoryId}
                    />
                  )}
                </Field>

                <Field
                  label="Job Description"
                  required
                  full
                  alignTop
                  error={errors.description}
                >
                  {isView ? (
                    <div className="min-h-[38px] rounded-lg border border-slate-200 bg-slate-50 break-words">
                      {plainText(descriptionHtml) ? (
                        <div
                          className="ql-editor !px-3 !py-2 !text-sm !text-slate-800"
                          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                        />
                      ) : (
                        <div className="px-3 py-2 text-sm text-slate-800">—</div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <ReactQuill
                        theme="snow"
                        value={form.description}
                        onChange={(html) => setField("description", html)}
                        modules={QUILL_MODULES}
                        formats={QUILL_FORMATS}
                        readOnly={saving}
                        placeholder="Describe the role, responsibilities, and expectations..."
                        className="h-[200px]"
                      />
                      <div className="mt-1 flex justify-end">
                        <span
                          className={`text-[11px] ${
                            descriptionLength > DESCRIPTION_MAX
                              ? "text-red-500"
                              : "text-slate-500"
                          }`}
                        >
                          {descriptionLength}/{DESCRIPTION_MAX}
                        </span>
                      </div>
                    </div>
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
                      disabled={saving || loadingCategories || loadingRoles}
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