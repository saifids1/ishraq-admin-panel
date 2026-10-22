import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronsLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import StatusModal from "../../../../components/common/StatusModal";
import cityMasterApi from "../../../../api/Services/cityMasterApi";
import countryMasterApi from "../../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../../api/Services/stateMasterApi";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const config = {
  singular: "City",
  api: cityMasterApi,
  idField: "ctM_Id",
  nameField: "ctM_CityName",
  activeField: "ctM_IsActive",
  createdAtField: "ctM_CreatedAt",
  updatedAtField: "ctM_UpdatedAt",
  createdByField: "ctM_CreatedBy",
  updatedByField: "ctM_UpdatedBy",
  createdByNameField: "createdByName",
  updatedByNameField: "updatedByName",
  stateField: "ctM_StateId",
  postalCodeField: "ctM_PostalCode",
};

const listPath = "/admin/settings/master/cityMaster";

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
  if (result?.data !== undefined) result = result.data;
  else if (result?.Data !== undefined) result = result.Data;

  if (result?.data && !Array.isArray(result.data)) result = result.data;
  else if (result?.Data && !Array.isArray(result.Data)) result = result.Data;

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

const pickUserDisplay = (item, nameKey, idKey) => {
  const name = item?.[nameKey];
  if (name !== undefined && name !== null && String(name).trim() !== "") {
    return String(name);
  }
  const id = item?.[idKey];
  if (id === undefined || id === null || id === "") return "";
  return String(id);
};

const getCurrentUserId = () => {
  const raw =
    localStorage.getItem("userId") ??
    localStorage.getItem("user_id") ??
    localStorage.getItem("id");
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const CreateCity = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const isCreate = mode === "create";

  const [isView, setIsView] = useState(mode === "view");
  const [isEdit, setIsEdit] = useState(mode === "edit");

  const [name, setName] = useState("");
  const [status, setStatus] = useState("Active");

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);

  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);

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

  const openConfirm = ({ title, message, confirmText, cancelText, onConfirm, onCancel }) => {
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

  // ─────────────────────────────────────────────────────────────────────
  // Load countries
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const loadCountries = async () => {
      setLoadingCountries(true);
      try {
        const response = await countryMasterApi.getAllList();
        const result = extractList(response);
        if (!cancelled) setCountries(result);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load countries:", err);
          setError("Failed to load countries.");
          openStatus("error", "Failed to load countries.");
        }
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    };
    loadCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // Load states
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const loadStates = async () => {
      setLoadingStates(true);
      try {
        const response = await stateMasterApi.getAllList();
        const result = extractList(response);
        if (!cancelled) setStates(result);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load states:", err);
          setStates([]);
          setError("Failed to load states.");
          openStatus("error", "Failed to load states.");
        }
      } finally {
        if (!cancelled) setLoadingStates(false);
      }
    };
    loadStates();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // Load record (view/edit)
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    if (isCreate) {
      setName("");
      setStatus("Active");
      setCountryId("");
      setStateId("");
      setPostalCode("");
      setAudit({ createdAt: "", createdBy: "", updatedAt: "", updatedBy: "" });
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
        setPostalCode(item[config.postalCodeField] ?? "");

        const savedStateId = String(item[config.stateField] ?? "");
        setStateId(savedStateId);

        if (savedStateId) {
          const stateResponse = await stateMasterApi.getById(savedStateId);
          const stateRecord = extractRecord(stateResponse);
          if (!cancelled) {
            setCountryId(String(stateRecord?.sM_CountryId ?? ""));
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
            config.updatedByNameField || "-",
            config.updatedByField,
          ),
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

  // ─────────────────────────────────────────────────────────────────────
  // Core save logic (shared by create and update)
  // ─────────────────────────────────────────────────────────────────────
  const runSave = async () => {
    setSaving(true);
    setError("");

    const trimmedName = name.trim();

    try {
      if (isCreate) {
        const payload = {
          [config.nameField]: trimmedName,
          [config.stateField]: Number(stateId),
          [config.postalCodeField]: postalCode.trim() || "",
          [config.activeField]: status === "Active",
          [config.createdByField]: getCurrentUserId(),
        };

        await config.api.create(payload);

        openStatus(
          "success",
          `${config.singular} "${trimmedName}" created successfully.`,
          {
            title: "Created",
            onConfirm: () => navigate(listPath),
            onCancel: () => navigate(listPath),
          },
        );
      } else {
        const payload = {
          [config.idField]: Number(id),
          [config.nameField]: trimmedName,
          [config.stateField]: Number(stateId),
          [config.postalCodeField]: postalCode.trim() || "",
          [config.activeField]: status === "Active",
          [config.updatedByField]: getCurrentUserId(),
        };

        await config.api.update(payload);

        openStatus(
          "update",
          `${config.singular} "${trimmedName}" updated successfully.`,
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
        `Failed to ${isCreate ? "create" : "update"} city.`,
      );
      setError(msg);
      openStatus("error", msg);
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Submit handler
  // ─────────────────────────────────────────────────────────────────────
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      const msg = "City name is required.";
      setError(msg);
      openStatus("warning", msg);
      return;
    }
    if (!countryId) {
      const msg = "Country is required.";
      setError(msg);
      openStatus("warning", msg);
      return;
    }
    if (!stateId) {
      const msg = "State is required.";
      setError(msg);
      openStatus("warning", msg);
      return;
    }

    if (isCreate) {
      runSave();
    } else {
      openConfirm({
        title: `Update ${config.singular}?`,
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
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Country
                  {!isView && <span className="ml-1 text-red-500">*</span>}
                </label>
                <div className="relative">
                  <select
                    value={countryId}
                    onChange={(event) => {
                      setCountryId(event.target.value);
                      setStateId("");
                      setError("");
                    }}
                    disabled={disabled || loadingCountries}
                    required={!isView}
                    className={selectClass}
                  >
                    <option value="">
                      {loadingCountries
                        ? "Loading countries..."
                        : "Select Country"}
                    </option>
                    {countries.map((country) => (
                      <option key={country.cM_Id} value={String(country.cM_Id)}>
                        {country.cM_CountryName}
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
                  State
                  {!isView && <span className="ml-1 text-red-500">*</span>}
                </label>
                <div className="relative">
                  <select
                    value={stateId}
                    onChange={(event) => setStateId(event.target.value)}
                    disabled={disabled || !countryId || loadingStates}
                    required={!isView}
                    className={selectClass}
                  >
                    <option value="">
                      {!countryId
                        ? "Select Country first"
                        : loadingStates
                          ? "Loading states..."
                          : "Select State"}
                    </option>
                    {states
                      .filter(
                        (state) =>
                          String(state.sM_CountryId) === String(countryId),
                      )
                      .map((state) => (
                        <option key={state.sM_Id} value={String(state.sM_Id)}>
                          {state.sM_StateName}
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
                  City Name
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
                  Postal Code
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  disabled={disabled}
                  placeholder="Enter postal code"
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

              {!isCreate && (
                <>
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

      {/* ───── Directly mounted StatusModal (no provider needed) ───── */}
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

export default CreateCity;