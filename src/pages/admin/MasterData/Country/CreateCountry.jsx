import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronsLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import StatusModal from "../../../../components/common/StatusModal";
import countryMasterApi from "../../../../api/Services/countryMasterApi";

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
  singular: "Country",
  api: countryMasterApi,
  idField: "cM_Id",
  nameField: "cM_CountryName",
  activeField: "cM_IsActive",
  createdAtField: "cM_CreatedAt",
  updatedAtField: "cM_UpdatedAt",

  // ── Audit ID fields sent to the API (payload keys) ──
  createdByIdField: "cM_CreatedBy",
  updatedByIdField: "cM_UpdatedBy",

  // ── Audit display fields read from the API response ──
  createdByField: "createdByName",
  updatedByField: "updatedByName",
  createdByNameField: "createdByName",
  updatedByNameField: "updatedByName",
};

const listPath = "/admin/settings/master/countryMaster";

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

/* ─────────────────────────────────────────────────────────────────
   Resolve current logged-in user ID from login response
   (falls back to JWT decode if the user object isn't present).
   Login response shape: { token, userId, email, fullName, roles }
   ───────────────────────────────────────────────────────────────── */
const AUTH_USER_KEY = "user"; // localStorage key holding login response
const AUTH_TOKEN_KEY = "token"; // localStorage key holding JWT

const getUserIdFromStorage = () => {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = parsed?.userId ?? parsed?.user?.userId ?? parsed?.id ?? null;
    return id === null || id === undefined ? null : Number(id) || null;
  } catch {
    return null;
  }
};

const getUserIdFromToken = () => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const json = JSON.parse(
      decodeURIComponent(
        atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"))
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      ),
    );
    const raw =
      json["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
      json.nameid ??
      json.userId ??
      json.sub;
    return raw === null || raw === undefined ? null : Number(raw) || null;
  } catch {
    return null;
  }
};

const getCurrentUserId = () => {
  // 1. Try storage "user" object from login response
  const fromStorage = getUserIdFromStorage();
  if (fromStorage) return fromStorage;

  // 2. Fallback: decode JWT
  const fromToken = getUserIdFromToken();
  if (fromToken) return fromToken;

  // 3. Legacy keys (kept for backward compat)
  const raw =
    localStorage.getItem("userId") ??
    localStorage.getItem("user_id") ??
    localStorage.getItem("id");
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const CreateCountry = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const isCreate = mode === "create";

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

  // ───────────────────────────────────────────────────────────────────
  // Local StatusModal state (no provider)
  // ───────────────────────────────────────────────────────────────────
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

  // Reset create form or load the existing record.
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
          createdBy: item[config.createdByField] ?? "",
          updatedAt: formatDate(item[config.updatedAtField]),
          updatedBy: item[config.updatedByField] ?? "",
        });
      } catch (err) {
        if (!cancelled) {
          const msg = getErrorMessage(err, "Failed to load record.");
          setError(msg);
          openStatus("error", msg);
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

  // ───────────────────────────────────────────────────────────────────
  // Core save (shared by create + update)
  // ───────────────────────────────────────────────────────────────────
  const runSave = async () => {
    const trimmed = name.trim();
    // Current logged-in user id — used for cM_CreatedBy (create) and cM_UpdatedBy (edit)
    const currentUserId = getCurrentUserId();

    const payload = {
      [config.nameField]: trimmed,
      [config.activeField]: status === "Active",
    };

    setSaving(true);
    setError("");

    try {
      if (isCreate) {
        const createPayload = {
          ...payload,
          // Only include cM_CreatedBy when we have a valid user id
          ...(currentUserId > 0
            ? { [config.createdByIdField]: currentUserId }
            : {}),
        };

        const response = await config.api.create(createPayload);

        openStatus(
          "success",
          getSuccessMessage(
            response,
            `${title} "${trimmed}" created successfully.`,
          ),
          {
            title: "Created",
            onConfirm: () => navigate(listPath),
            onCancel: () => navigate(listPath),
          },
        );
      } else {
        const updatePayload = {
          ...payload,
          [config.idField]: Number(id),
          // Only include cM_UpdatedBy when we have a valid user id
          ...(currentUserId > 0
            ? { [config.updatedByIdField]: currentUserId }
            : {}),
        };

        await config.api.update(updatePayload);

        openStatus(
          "update",
          `${title} "${trimmed}" updated successfully.`,
          {
            title: "Updated",
            onConfirm: () => navigate(listPath),
            onCancel: () => navigate(listPath),
          },
        );
      }
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to save. Please try again.");
      setError(msg);
      openStatus("error", msg);
    } finally {
      setSaving(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────
  // Submit
  // ───────────────────────────────────────────────────────────────────
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

    if (isCreate) {
      runSave();
    } else {
      openConfirm({
        title: `Update ${title}?`,
        message: "Are you sure you want to save these changes?",
        confirmText: "Update",
        cancelText: "Cancel",
        onConfirm: runSave,
      });
    }
  };

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
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
              {/* Value */}
              <FieldRow label="Country Name" required={!isView}>
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

      {/* ───── Directly mounted StatusModal (no provider) ───── */}
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

export default CreateCountry;