// src/pages/admin/job/CreateJobDescription.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
import { getCurrentUserId2 } from "../../../utils/authUtils.js";
import StatusModal from "../../../components/common/StatusModal";
import { useStatusToast } from "../../../components/common/StatusModalProvider";

/* ------------------------------ CONSTANTS ------------------------------ */

const LIST_PATH = "/admin/jdbyadmin";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:cursor-not-allowed disabled:bg-slate-50";

const readOnlyInputClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none cursor-default";

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

const first = (item, ...keys) => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) return item[key];
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

const v = (value) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

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
  if (!f.organizationTypeId)
    errors.organizationTypeId = "Select an organization type";
  if (!f.jobCategoryId) errors.jobCategoryId = "Select a job category";
  if (!f.jobRoleId) errors.jobRoleId = "Select a job role";

  const text = plainText(f.description);
  if (!text) errors.description = "Job description is required";
  else if (text.length > DESCRIPTION_MAX)
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or less`;

  return errors;
};

const toPayload = (f, userId, isCreate) => {
  const base = {
    InstituteTypeId: Number(f.organizationTypeId),
    CategoryId: Number(f.jobCategoryId),
    RoleId: Number(f.jobRoleId),
    Description: f.description,
  };

  return isCreate
    ? { ...base, CreatedBy: userId }
    : { ...base, UpdatedBy: userId };
};

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
      {error && (
        <span className="mt-1 block text-xs text-red-500">{error}</span>
      )}
    </div>
  </div>
);

const ReadOnly = ({ children }) => (
  <div className="min-h-[38px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 break-words">
    {children}
  </div>
);

const ReadOnlyInput = ({ label, value }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <input type="text" readOnly value={value} className={readOnlyInputClass} />
  </label>
);

const SelectField = ({
  value,
  onChange,
  items,
  placeholder,
  disabled,
  loading,
}) => (
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
  const location = useLocation();
  const { id } = useParams();

  const isCreate = !id;
  const isView = !isCreate && !location.pathname.endsWith("/edit");

  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [savedForm, setSavedForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loadingRecord, setLoadingRecord] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Same toast hook the list pages use
  const [toast, setToast] = useStatusToast();

  const [sources, setSources] = useState({
    institutes: [],
    categories: [],
    roles: [],
  });
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  /* ----- auto-dismiss toast (same behavior as list pages) ----- */
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  /* ----- load the record (view and edit) ----- */
  useEffect(() => {
    if (isCreate) {
      setRecord(null);
      setForm(EMPTY);
      setSavedForm(EMPTY);
      setLoadingRecord(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingRecord(true);
    setError("");

    getJDByAdminById(id)
      .then((res) => {
        if (cancelled) return;
        const data = recordFrom(res);
        if (!data) throw new Error("Job description was not found.");
        const mapped = formFromRecord(data);
        setRecord(data);
        setForm(mapped);
        setSavedForm(mapped);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err) || "Unable to load job description.");
      })
      .finally(() => {
        if (!cancelled) setLoadingRecord(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isCreate]);

  /* ----- organization types: edit and create only ----- */
  useEffect(() => {
    if (isView) return undefined;
    let cancelled = false;

    instituteTypeApi
      .getAllList()
      .then((res) => {
        if (cancelled) return;
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
        if (!cancelled) {
          setError(
            getApiErrorMessage(err) || "Unable to load organization types.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isView]);

  /* ----- categories follow organization type ----- */
  useEffect(() => {
    if (isView) return undefined;
    let cancelled = false;

    setSources((s) => ({ ...s, categories: [] }));

    if (!form.organizationTypeId) {
      setLoadingCategories(false);
      return undefined;
    }

    setLoadingCategories(true);
    jobCategoryApi
      .getByInstituteType(Number(form.organizationTypeId))
      .then((res) => {
        if (cancelled) return;
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
        if (!cancelled) {
          setError(getApiErrorMessage(err) || "Unable to load job categories.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isView, form.organizationTypeId]);

  /* ----- roles follow job category ----- */
  useEffect(() => {
    if (isView) return undefined;
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
        if (cancelled) return;
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
        if (!cancelled) {
          setError(getApiErrorMessage(err) || "Unable to load job roles.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRoles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isView, form.jobCategoryId]);

  /* ----- handlers ----- */

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
    navigate(`/admin/jdbyadmin/${id}/edit`);
  };

  const handleCancel = () => {
    setError("");
    if (isCreate) {
      navigate(LIST_PATH);
      return;
    }
    setForm(savedForm);
    setErrors({});
    navigate(`/admin/jdbyadmin/${id}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isView || saving) return;

    setError("");
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    const userId = Number(getCurrentUserId2());

    if (!Number.isInteger(userId) || userId <= 0) {
      setConfirmOpen(false);
      setError("Unable to identify the current user. Please log in again.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = toPayload(form, userId, isCreate);

      if (isCreate) {
        await createJDByAdmin(payload);
        setConfirmOpen(false);
        setToast({
          id: Date.now(),
          tone: "ok",
          msg: "Job description created successfully",
        });
        navigate(LIST_PATH, { replace: true });
      } else {
        await updateJDByAdmin(id, payload);
        setConfirmOpen(false);
        setToast({
          id: Date.now(),
          tone: "ok",
          msg: "Job description updated successfully",
        });
        navigate(`/admin/jdbyadmin`, { replace: true });
      }
    } catch (err) {
      setConfirmOpen(false);
      setError(getApiErrorMessage(err) || "Unable to save job description.");
      setToast({
        id: Date.now(),
        tone: "err",
        msg: getApiErrorMessage(err) || "Could not save job description",
      });
    } finally {
      setSaving(false);
    }
  };

  const closeConfirm = () => {
    if (!saving) setConfirmOpen(false);
  };

  /* ----- render ----- */
  const rec = record ?? {};
  const title = isCreate
    ? "Create Job Description"
    : isView
      ? "View Details"
      : "Edit Job Description";
  const descriptionLength = plainText(form.description).length;
  const descriptionHtml = first(rec, "description", "Description");

  const createdAt = fmtDateTime(first(rec, "createdAt", "CreatedAt"));
  const createdBy = v(first(rec, "createdByName", "CreatedByName"));
  const updatedAt = fmtDateTime(first(rec, "updatedAt", "UpdatedAt"));
  const updatedBy = v(first(rec, "updatedByName", "UpdatedByName"));

  const isBusy = saving || loadingCategories || loadingRoles;

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
            <form onSubmit={handleSubmit} noValidate className="p-4">
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
                        <div className="px-3 py-2 text-sm text-slate-800">
                          —
                        </div>
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

                {isView && (
                  <>
                    <div className="md:col-span-2 mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <ReadOnlyInput label="Created At" value={createdAt} />
                      <ReadOnlyInput label="Created By" value={createdBy} />
                      <ReadOnlyInput label="Updated At" value={updatedAt} />
                      <ReadOnlyInput label="Updated By" value={updatedBy} />
                    </div>
                  </>
                )}
              </div>

              {/* FOOTER */}
              <div
                className={`mt-6 flex gap-3 border-t border-slate-100 pt-4 ${
                  isView ? "justify-end" : "justify-between"
                }`}
              >
                {isView ? (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      {saving
                        ? "Saving..."
                        : isCreate
                          ? "Create"
                          : "Save Changes"}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* CONFIRMATION POPUP — shared StatusModal */}
      {confirmOpen && (
        <StatusModal
          isOpen
          type="confirm"
          title={isCreate ? "Create job description?" : "Save changes?"}
          message={
            isCreate
              ? "This will create a new job description. Do you want to continue?"
              : "This will update the job description. Do you want to save your changes?"
          }
          showCancel
          busy={saving}
          confirmText={isCreate ? "Yes, create" : "Yes, save"}
          onCancel={closeConfirm}
          onConfirm={handleConfirm}
        />
      )}

      {/* SUCCESS / ERROR TOAST — same markup as list pages */}
      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="js-toast fixed bottom-3 left-3 right-3 z-[60] flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#1e2b36] px-4 py-3 text-[14px] font-medium text-white shadow-2xl sm:bottom-5 sm:left-auto sm:right-5 sm:text-[15px]"
        >
          <span
            className={`grid h-5 w-5 place-items-center rounded-full ${
              toast.tone === "ok"
                ? "bg-emerald-500"
                : toast.tone === "warn"
                  ? "bg-amber-500"
                  : "bg-rose-500"
            }`}
          >
            ✓
          </span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}