import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronsLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import jobCategoryApi from "../../../../api/Services/jobCategoryApi";
import jobRoleApi from "../../../../api/Services/jobRoleApi";
import instituteTypeApi from "../../../../api/Services/instituteTypeApi";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

/* ----------------------------- CONFIG ----------------------------- */

const config = {
  singular: "Job Category",
  api: jobCategoryApi,
  idField: "jC_job_category_id",
  nameField: "jC_name",
  activeField: "jC_is_active",
  createdAtField: "jC_created_at",
  updatedAtField: "jC_updated_at",
  createdByField: "jC_created_by",
  updatedByField: "jC_updated_by",
  createdByNameField: "jC_created_by_name",
  updatedByNameField: "jC_updated_by_name",
  jobRoleField: "jC_job_role_id",
  responsibilityField: "jC_job_responsibility",
};

const listPath = "/admin/settings/master/jobCategory";

/* --------------------------- DATE HELPERS ------------------------- */

const formatDate = (value) => {
  if (value === null || value === undefined || value === "") return "";

  const s = String(value).trim();
  if (s.startsWith("0001-01-01")) return "";

  let d;
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (plain) {
    d = new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));
  } else {
    d = value instanceof Date ? value : new Date(s);
  }

  if (Number.isNaN(d.getTime())) return "";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${dd}-${mm}-${yyyy}`;
};

const extractRecord = (response) => {
  let result = response?.data ?? response;

  if (result?.data !== undefined) {
    result = result.data;
  } else if (result?.Data !== undefined) {
    result = result.Data;
  }

  if (result?.data && !Array.isArray(result.data)) {
    result = result.data;
  } else if (result?.Data && !Array.isArray(result.Data)) {
    result = result.Data;
  }

  return result;
};

const extractList = (response) => {
  const root = response?.data ?? response;

  const candidates = [
    root?.data?.data,
    root?.Data?.Data,
    root?.data,
    root?.Data,
    root,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (Array.isArray(candidate?.data)) return candidate.data;
    if (Array.isArray(candidate?.Data)) return candidate.Data;
  }

  return [];
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  fallback;

/**
 * Prefer the display name if present, otherwise fall back to the raw id.
 */
const pickUserDisplay = (item, nameKey, idKey) => {
  const name = item?.[nameKey];
  if (name !== undefined && name !== null && String(name).trim() !== "") {
    return String(name);
  }

  const id = item?.[idKey];
  if (id === undefined || id === null || id === "") return "";

  return String(id);
};

const CreateJobCategory = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const isCreate = mode === "create";

  // Driven by state so the Edit button can flip view → edit in place.
  const [isView, setIsView] = useState(mode === "view");
  const [isEdit, setIsEdit] = useState(mode === "edit");

  const [name, setName] = useState("");
  const [status, setStatus] = useState("Active");
  const [jobResponsibility, setJobResponsibility] = useState("");

  const needsInstituteType = isCreate;

  const [instituteTypes, setInstituteTypes] = useState([]);
  const [instituteTypeId, setInstituteTypeId] = useState("");

  const [jobRoles, setJobRoles] = useState([]);
  const [jobRoleId, setJobRoleId] = useState("");

  const [audit, setAudit] = useState({
    createdAt: "",
    createdBy: "",
    updatedAt: "",
    updatedBy: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 1. Load institute types for the create form.
  useEffect(() => {
    if (!needsInstituteType) {
      setInstituteTypes([]);
      return;
    }

    let cancelled = false;

    const loadInstituteTypes = async () => {
      try {
        const response = await instituteTypeApi.getAllList();
        const types = extractList(response);

        if (!cancelled) setInstituteTypes(types);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load institute types:", err);
          setError("Failed to load institute types.");
        }
      }
    };

    loadInstituteTypes();

    return () => {
      cancelled = true;
    };
  }, [needsInstituteType]);

  // 2. Reset create form or load the existing record for edit/view.
  useEffect(() => {
    let cancelled = false;

    if (isCreate) {
      setName("");
      setStatus("Active");
      setJobResponsibility("");
      setInstituteTypeId("");
      setJobRoleId("");

      setAudit({
        createdAt: "",
        createdBy: "",
        updatedAt: "",
        updatedBy: "",
      });

      setError("");
      setLoading(false);
      return;
    }

    if (!id) {
      setError("Record ID is missing.");
      return;
    }

    const loadRecord = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await config.api.getById(id);
        const item = extractRecord(response);

        if (cancelled) return;

        if (
          !item ||
          typeof item !== "object" ||
          item[config.nameField] === undefined
        ) {
          throw new Error("Record not found in API response.");
        }

        setName(item[config.nameField] ?? "");
        setStatus(item[config.activeField] ? "Active" : "Inactive");

        const savedRoleId = String(item[config.jobRoleField] ?? "");
        setJobRoleId(savedRoleId);

        setJobResponsibility(item[config.responsibilityField] ?? "");

        // Resolve the related job role's institute type for edit & view.
        if (savedRoleId) {
          const roleResponse = await jobRoleApi.getById(savedRoleId);
          const role = extractRecord(roleResponse);

          if (!cancelled) {
            setInstituteTypeId(String(role?.jR_institute_type_id ?? ""));
          }
        }

        setAudit({
          createdAt: formatDate(item[config.createdAtField]),
          createdBy: pickUserDisplay(
            item,
            config.createdByNameField,
            config.createdByField,
          ),
          updatedAt: formatDate(item[config.updatedAtField]),
          updatedBy: pickUserDisplay(
            item,
            config.updatedByNameField,
            config.updatedByField,
          ),
        });
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Failed to load record."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRecord();

    return () => {
      cancelled = true;
    };
  }, [id, isCreate]);

  // 3. Load job roles whenever an institute type is selected.
  useEffect(() => {
    if (!instituteTypeId) {
      setJobRoles([]);
      return;
    }

    let cancelled = false;

    const loadJobRoles = async () => {
      try {
        const response = await jobRoleApi.getByInstituteType(
          Number(instituteTypeId),
        );
        const roles = extractList(response);

        if (!cancelled) setJobRoles(roles);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load job roles:", err);
          setJobRoles([]);
        }
      }
    };

    loadJobRoles();

    return () => {
      cancelled = true;
    };
  }, [instituteTypeId]);

  const handleInstituteTypeChange = (value) => {
    setInstituteTypeId(value);
    setJobRoleId("");
    setJobRoles([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    if (needsInstituteType && !instituteTypeId) {
      setError("Institute Type is required.");
      return;
    }

    if (!jobRoleId) {
      setError("Job Role is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (isCreate) {
        // POST /JobCategory
        const payload = {
          [config.activeField]: status === "Active",
          [config.nameField]: trimmedName,
          [config.jobRoleField]: Number(jobRoleId),
          [config.responsibilityField]: jobResponsibility.trim(),
        };

        await config.api.create(payload);
      } else {
        // PUT /JobCategory — id lives inside the body.
        const payload = {
          [config.activeField]: status === "Active",
          [config.nameField]: trimmedName,
          [config.jobRoleField]: Number(jobRoleId),
          [config.responsibilityField]: jobResponsibility.trim(),
          [config.idField]: Number(id),
        };

        await config.api.update(payload);
      }

      navigate(listPath);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          `Failed to ${isCreate ? "create" : "update"} job category.`,
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = () => {
    setIsView(false);
    setIsEdit(true);
    setError("");
  };

  const title = config.singular;
  const disabled = isView || loading || saving;

  const pageTitle = isCreate
    ? `Create ${title}`
    : isEdit
      ? `Update ${title}`
      : `View ${title}`;

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(listPath)}
                title="Back"
                aria-label="Back"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f]"
              >
                <ChevronsLeft size={18} strokeWidth={2} />
              </button>

              <h2 className="font-semibold text-slate-800">{pageTitle}</h2>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {needsInstituteType && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Institute Type
                    {!isView && <span className="ml-1 text-red-500">*</span>}
                  </label>

                  <div className="relative">
                    <select
                      value={instituteTypeId}
                      onChange={(event) =>
                        handleInstituteTypeChange(event.target.value)
                      }
                      disabled={disabled}
                      required={!isView}
                      className={selectClass}
                    >
                      <option value="">Select Institute Type</option>
                      {instituteTypes.map((item) => (
                        <option
                          key={item.iT_institute_type_id}
                          value={String(item.iT_institute_type_id)}
                        >
                          {item.iT_name}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={17}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Job Role
                  {!isView && <span className="ml-1 text-red-500">*</span>}
                </label>

                <div className="relative">
                  <select
                    value={jobRoleId}
                    onChange={(event) => setJobRoleId(event.target.value)}
                    disabled={disabled || !instituteTypeId}
                    required={!isView}
                    className={selectClass}
                  >
                    <option value="">
                      {!instituteTypeId
                        ? "Select Institute Type first"
                        : "Select Job Role"}
                    </option>
                    {jobRoles.map((role) => (
                      <option
                        key={role.jR_job_role_id}
                        value={String(role.jR_job_role_id)}
                      >
                        {role.jR_name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Category Name
                  {!isView && <span className="ml-1 text-red-500">*</span>}
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={disabled}
                  required={!isView}
                  placeholder={`Enter ${title}`}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Status
                </label>

                <div className="relative">
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    disabled={disabled}
                    className={selectClass}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Job Responsibility
                </label>

                <textarea
                  value={jobResponsibility}
                  onChange={(event) =>
                    setJobResponsibility(event.target.value)
                  }
                  disabled={disabled}
                  rows={3}
                  placeholder="Enter job responsibility"
                  className={inputClass}
                />
              </div>

              {!isCreate && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Created At
                  </label>
                  <input
                    type="text"
                    value={audit.createdAt || "—"}
                    readOnly
                    disabled
                    className={inputClass}
                  />
                </div>
              )}

              {!isCreate && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Created By
                  </label>
                  <input
                    type="text"
                    value={audit.createdBy || "—"}
                    readOnly
                    disabled
                    className={inputClass}
                  />
                </div>
              )}

              {!isCreate && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Updated At
                  </label>
                  <input
                    type="text"
                    value={audit.updatedAt || "—"}
                    readOnly
                    disabled
                    className={inputClass}
                  />
                </div>
              )}

              {!isCreate && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Updated By
                  </label>
                  <input
                    type="text"
                    value={audit.updatedBy || "—"}
                    readOnly
                    disabled
                    className={inputClass}
                  />
                </div>
              )}
            </div>

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
                  Edit
                </button>
              )}

              {!isView && (
                <button
                  type="submit"
                  disabled={disabled}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : isCreate ? "Create" : "Update"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateJobCategory;