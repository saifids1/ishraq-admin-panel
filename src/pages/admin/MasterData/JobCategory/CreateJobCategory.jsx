import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronsLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getCurrentUserId2 } from "../../../../utils/authUtils";

import StatusModal from "../../../../components/common/StatusModal";
import jobCategoryApi from "../../../../api/Services/jobCategoryApi";
import instituteTypeApi from "../../../../api/Services/instituteTypeApi";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

/* ---------- field row: label : input ---------- */
const FIELD_LABEL = "text-[14px] font-semibold text-black leading-tight";

const FieldRow = ({ label, required, children, fullWidth }) => (
  <div
    className={`grid grid-cols-[130px_1fr] items-start gap-3 ${
      fullWidth ? "md:col-span-2" : ""
    }`}
  >
    <label className={`${FIELD_LABEL} pt-2`}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="min-w-0">{children}</div>
  </div>
);

/* ----------------------------- CONFIG ----------------------------- */

const config = {
  singular: "Job Category",
  api: jobCategoryApi,
  idField: "jC_job_category_id",
  nameField: "jC_name",
  activeField: "jC_is_active",
  createdAtField: "jC_created_at",
  updatedAtField: "jC_updated_at",

  // ── Audit ID fields sent to the API (payload keys) ──
  createdByIdField: "jC_created_by",
  updatedByIdField: "jC_updated_by",

  // ── Audit display fields read from the API response ──
  createdByField: "jC_created_by",
  updatedByField: "jC_updated_by",
  createdByNameField: "createdByName",
  updatedByNameField: "updatedByName",

  instituteTypeField: "jC_institute_type_id",
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

const getSuccessMessage = (response, fallback) =>
  response?.data?.message ||
  response?.data?.Message ||
  response?.data?.data?.message ||
  response?.data?.data?.Message ||
  fallback;

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

  const needsInstituteType = isCreate || isEdit;

  const [instituteTypes, setInstituteTypes] = useState([]);
  const [instituteTypeId, setInstituteTypeId] = useState("");
  const [instituteTypeName, setInstituteTypeName] = useState("");

  const [audit, setAudit] = useState({
    createdAt: "",
    createdBy: "",
    updatedAt: "",
    updatedBy: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const openStatus = (type, message, extra = {}) => {
    setModal({
      type,
      message,
      confirmText: extra.confirmText || "OK",
      cancelText: extra.cancelText || "Cancel",
      showCancel: false,
      title: extra.title,
      onConfirm: () => {
        setModal(null);
        extra.onConfirm?.();
      },
      onCancel: () => {
        setModal(null);
        extra.onCancel?.();
      },
    });
  };

  const openConfirm = ({
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
  }) => {
    setModal({
      type: "confirm",
      title,
      message,
      confirmText: confirmText || "Confirm",
      cancelText: cancelText || "Cancel",
      showCancel: true,
      onConfirm: () => {
        setModal(null);
        onConfirm?.();
      },
      onCancel: () => {
        setModal(null);
        onCancel?.();
      },
    });
  };

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
      setInstituteTypeName("");

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

        setInstituteTypeId(String(item[config.instituteTypeField] ?? ""));
        let relatedInstituteTypeName = item.instituteTypeName ?? "";
        if (!relatedInstituteTypeName && item[config.instituteTypeField]) {
          try {
            const instituteResponse = await instituteTypeApi.getById(
              item[config.instituteTypeField],
            );
            const institute = extractRecord(instituteResponse);
            relatedInstituteTypeName = institute?.iT_name ?? "";
          } catch (relationshipError) {
            console.error(
              "Failed to resolve job category institute type:",
              relationshipError,
            );
            setError(
              "Job category loaded, but its Institute Type name could not be resolved.",
            );
          }
        }
        if (!cancelled) setInstituteTypeName(relatedInstituteTypeName);
        setJobResponsibility(item[config.responsibilityField] ?? "");

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

  const handleInstituteTypeChange = (value) => {
    setInstituteTypeId(value);
  };

  // ───────────────────────────────────────────────────────────────────
  // Core save (shared by create + update)
  // ───────────────────────────────────────────────────────────────────
  const runSave = async () => {
    const trimmedName = name.trim();
    // Current logged-in user id — used for jC_created_by AND jC_updated_by
    const currentUserId = getCurrentUserId2();

    setSaving(true);
    setError("");

    try {
      if (isCreate) {
        // POST /JobCategory — send BOTH jC_created_by AND jC_updated_by
        // when we have a valid user id.
        const payload = {
          [config.activeField]: status === "Active",
          [config.nameField]: trimmedName,
          [config.instituteTypeField]: Number(instituteTypeId),
          [config.responsibilityField]: jobResponsibility.trim(),
          ...(currentUserId > 0
            ? {
                [config.createdByIdField]: currentUserId, // jC_created_by
                [config.updatedByIdField]: currentUserId, // jC_updated_by
              }
            : {}),
        };

        const response = await config.api.create(payload);
        openStatus(
          "success",
          getSuccessMessage(
            response,
            `${config.singular} "${trimmedName}" created successfully.`,
          ),
          {
            title: "Created",
            onConfirm: () => navigate(listPath),
            onCancel: () => navigate(listPath),
          },
        );
      } else {
        // PUT /JobCategory — id lives inside the body.
        // Send jC_updated_by with the current user id.
        const payload = {
          [config.activeField]: status === "Active",
          [config.nameField]: trimmedName,
          [config.instituteTypeField]: Number(instituteTypeId),
          [config.responsibilityField]: jobResponsibility.trim(),
          [config.idField]: Number(id),
          ...(currentUserId > 0
            ? { [config.updatedByIdField]: currentUserId } // jC_updated_by
            : {}),
        };

        const response = await config.api.update(payload);

        openStatus(
          "update",
          getSuccessMessage(
            response,
            `${config.singular} "${trimmedName}" updated successfully.`,
          ),
          {
            title: "Updated",
            onConfirm: () => navigate(listPath),
            onCancel: () => navigate(listPath),
          },
        );
      }
    } catch (err) {
      const message = getErrorMessage(
        err,
        `Failed to ${isCreate ? "create" : "update"} job category.`,
      );
      setError(message);
      openStatus("error", message);
    } finally {
      setSaving(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────
  // Submit — validate, then either save (create) or confirm then save (update)
  // ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      const message = "Name is required.";
      setError(message);
      openStatus("warning", message);
      return;
    }

    if (!instituteTypeId) {
      const message = "Institute Type is required.";
      setError(message);
      openStatus("warning", message);
      return;
    }

    // Confirm before update — matches the other master screens.
    if (!isCreate) {
      openConfirm({
        title: `Update ${config.singular}?`,
        message: "Are you sure you want to save these changes?",
        confirmText: "Update",
        cancelText: "Cancel",
        onConfirm: runSave,
      });
      return;
    }

    await runSave();
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
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
              {/* Institute Type — selectable in edit, read-only in view */}
              {needsInstituteType ? (
                <FieldRow label="Institute Type" required={!isView}>
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
                </FieldRow>
              ) : (
                <FieldRow label="Institute Type">
                  <input
                    type="text"
                    value={instituteTypeName || "—"}
                    readOnly
                    disabled
                    className={inputClass}
                  />
                </FieldRow>
              )}

              {/* Category Name */}
              <FieldRow label="Category Name" required={!isView}>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={disabled}
                  required={!isView}
                  placeholder={`Enter ${title}`}
                  className={inputClass}
                />
              </FieldRow>

              {/* Status */}
              <FieldRow label="Status">
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
              </FieldRow>

              {/* Job Responsibility — full width */}
              <FieldRow label="Job Responsibility" fullWidth>
                <textarea
                  value={jobResponsibility}
                  onChange={(event) =>
                    setJobResponsibility(event.target.value)
                  }
                  disabled={disabled}
                  rows={3}
                  placeholder="Enter job responsibility"
                  className={`${inputClass} resize-none`}
                />
              </FieldRow>

              {/* Audit fields */}
              {!isCreate && (
                <>
                  <FieldRow label="Created At">
                    <input
                      type="text"
                      value={audit.createdAt || "—"}
                      readOnly
                      disabled
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Created By">
                    <input
                      type="text"
                      value={audit.createdBy || "—"}
                      readOnly
                      disabled
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Updated At">
                    <input
                      type="text"
                      value={audit.updatedAt || "—"}
                      readOnly
                      disabled
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Updated By">
                    <input
                      type="text"
                      value={audit.updatedBy || "—"}
                      readOnly
                      disabled
                      className={inputClass}
                    />
                  </FieldRow>
                </>
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
      <StatusModal
        isOpen={!!modal}
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

export default CreateJobCategory;