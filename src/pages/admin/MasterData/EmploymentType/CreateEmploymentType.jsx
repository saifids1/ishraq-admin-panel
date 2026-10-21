import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronsLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import StatusModal from "../../../../components/common/StatusModal";
import employmentTypeApi from "../../../../api/Services/employmentTypeApi";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

/* ----------------------------- CONFIG ----------------------------- */

const config = {
  singular: "Employment Type",
  api: employmentTypeApi,
  idField: "eT_employment_type_id",
  nameField: "eT_name",
  activeField: "eT_is_active",
  createdAtField: "eT_created_at",
  updatedAtField: "eT_updated_at",

  createdByField: "createdByName",
  updatedByField: "updatedByName",
  createdByNameField: "createdByName",
  updatedByNameField: "updatedByName",
  createdByNameField: "createdByName",
  updatedByNameField: "updatedByName",
};

const listPath = "/admin/settings/master/employmentType";

/* --------------------------- DATE HELPERS ------------------------- */

/**
 * Format a date value into dd-mm-yyyy.
 * Empty / invalid / .NET default (0001-01-01) → "".
 */
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

/**
 * Prefer the display name if present, otherwise fall back to the raw value.
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

const CreateEmploymentType = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const isCreate = mode === "create";

  // Driven by state so the Edit button can flip view → edit in place.
  const [isView, setIsView] = useState(mode === "view");
  const [isEdit, setIsEdit] = useState(mode === "edit");

  const [name, setName] = useState("");
  const [status, setStatus] = useState("Active");

  const [audit, setAudit] = useState({
    createdAt: "",
    createdBy: "",
    updatedAt: "",
    updatedBy: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ─────────────────────────────────────────────────────────────────────
  // Local StatusModal state (replaces StatusModalProvider)
  // modal = { type, title, message, confirmText, cancelText, showCancel,
  //           onConfirm, onCancel }
  // ─────────────────────────────────────────────────────────────────────
  const [modal, setModal] = useState(null);

  const openStatus = (type, message, extra = {}) => {
    setModal({
      type,
      message,
      title: extra.title,
      confirmText: extra.confirmText || "OK",
      cancelText: extra.cancelText || "Cancel",
      showCancel: false,
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

  // Reset create form or load the existing record for edit/view.
  useEffect(() => {
    let cancelled = false;

    if (isCreate) {
      setName("");
      setStatus("Active");

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

        setAudit({
          createdAt: formatDate(item[config.createdAtField]),
          // Prefer the name; fall back to the raw id.
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

  const title = config.singular;
  const disabled = isView || loading || saving;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    const trimmed = name.trim();

    if (!trimmed) {
      const msg = `${title} name is required.`;
      setError(msg);
      openStatus("warning", msg);
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (isCreate) {
        // POST /EmploymentType
        const payload = {
          [config.nameField]: trimmed,
          [config.activeField]: status === "Active",
        };

        const response = await config.api.create(payload);
        openStatus(
          "success",
          getSuccessMessage(
            response,
            `${config.singular} "${trimmed}" created successfully.`,
          ),
          {
            title: "Created",
            onConfirm: () => navigate(listPath),
            onCancel: () => navigate(listPath),
          },
        );
      } else {
        // PUT /EmploymentType — id goes INSIDE the body (createMasterApi
        // signature: update(payload)).
        const payload = {
          [config.idField]: Number(id),
          [config.nameField]: trimmed,
          [config.activeField]: status === "Active",
        };

        const response = await config.api.update(payload);
        openStatus(
          "update",
          getSuccessMessage(
            response,
            `${config.singular} "${trimmed}" updated successfully.`,
          ),
          {
            title: "Updated",
            onConfirm: () => navigate(listPath),
            onCancel: () => navigate(listPath),
          },
        );
      }
    } catch (err) {
      const msg = getErrorMessage(
        err,
        `Failed to ${isCreate ? "create" : "update"} ${title.toLowerCase()}.`,
      );
      setError(msg);
      openStatus("error", msg);
    } finally {
      setSaving(false);
    }
  };

  // Clicking Edit flips the view into edit mode (matches the siblings).
  const handleEditClick = () => {
    setIsView(false);
    setIsEdit(true);
    setError("");
  };

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
              {/* Value */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Value
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

              {/* Status */}
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

              {/* Created At — read only */}
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

              {/* Created By — read only (name preferred, id fallback) */}
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

              {/* Updated At — read only */}
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

              {/* Updated By — read only (name preferred, id fallback) */}
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

              {/* Edit button — only in view mode */}
              {isView && (
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
                >
                  Edit
                </button>
              )}

              {/* Save button — only when NOT in view mode */}
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

export default CreateEmploymentType;