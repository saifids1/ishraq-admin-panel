// src/pages/admin/employer/CreateEmployer.jsx
import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronsLeft, Eye, EyeOff } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import employerApi from "../../../api/Services/adminemployeelistApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";
import StatusModal from "../../../components/common/StatusModal";
import { getCurrentUserId2 } from "../../../utils/authUtils";

/* ---------- shared input/select styles ---------- */
const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

/* ---------- field row: label : input ---------- */
const FIELD_LABEL = "text-[13px] font-semibold text-black leading-tight";

const FieldRow = ({ label, required, error, children, fullWidth }) => (
  <div
    className={`grid grid-cols-[160px_1fr] items-start gap-3 ${
      fullWidth ? "md:col-span-2" : ""
    }`}
  >
    <label className={`${FIELD_LABEL} pt-2`}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="min-w-0">
      {children}
      {error && (
        <span className="mt-1 block text-xs text-red-500">{error}</span>
      )}
    </div>
  </div>
);

/* ----------------------------- CONFIG ----------------------------- */

const config = {
  singular: "Employer",
  api: employerApi,
  idField: "eM_employer_id",

  emailField: "email",
  passwordField: "password",
  mobileField: "mobile",
  fullNameField: "fullName",

  organizationField: "eM_organization_name",
  instituteTypeField: "eM_institute_type_id",
  contactPersonField: "eM_contact_person",
  designationField: "eM_designation",
  countryField: "eM_country_id",
  stateField: "eM_state_id",
  cityField: "eM_city_id",
  websiteField: "eM_website",
  consentField: "eM_consent_given",
};

const listPath = "/admin/employer";

/* --------------------------- HELPERS ------------------------- */

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

/* --------------------------- VALIDATION --------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^\d{10}$/;

/* ----------------------------- COMPONENT ----------------------------- */

const CreateEmployer = ({ mode, onCancel, onSaved }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const isCreate = mode === "create";

  const [isView, setIsView] = useState(mode === "view");
  const [isEdit, setIsEdit] = useState(mode === "edit");

  // Form state (13 fields)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [instituteTypeId, setInstituteTypeId] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [designation, setDesignation] = useState("");
  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [website, setWebsite] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [createdBy, setCreatedBy] = useState(null);

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Dropdown sources
  const [instituteTypes, setInstituteTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [loadingInstituteTypes, setLoadingInstituteTypes] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const openStatus = (type, message, extra = {}) => {
    setModal({
      type,
      title: extra.title,
      message,
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

  /* --------------------------- LOOKUPS --------------------------- */

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingInstituteTypes(true);
      try {
        const r = await instituteTypeApi.getAllList();
        if (!cancelled) setInstituteTypes(extractList(r));
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Unable to load institute types."));
        }
      } finally {
        if (!cancelled) setLoadingInstituteTypes(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingCountries(true);
      try {
        const r = await countryMasterApi.getAllList();
        if (!cancelled) setCountries(extractList(r));
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Unable to load countries."));
        }
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingStates(true);
      try {
        const r = await stateMasterApi.getAllList();
        if (!cancelled) setStates(extractList(r));
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Unable to load states."));
        }
      } finally {
        if (!cancelled) setLoadingStates(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingCities(true);
      try {
        const r = await cityMasterApi.getAllList();
        if (!cancelled) setCities(extractList(r));
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Unable to load cities."));
        }
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* --------------------------- RECORD LOAD --------------------------- */

  useEffect(() => {
    let cancelled = false;

    if (isCreate) {
      setEmail("");
      setPassword("");
      setMobile("");
      setFullName("");
      setOrganizationName("");
      setInstituteTypeId("");
      setContactPerson("");
      setDesignation("");
      setCountryId("");
      setStateId("");
      setCityId("");
      setWebsite("");
      setConsentGiven(false);
      setCreatedBy(null);

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

        if (!item || typeof item !== "object" || item.email === undefined) {
          throw new Error("Record not found in API response.");
        }

        setEmail(item.email ?? "");
        setPassword("");
        setMobile(item.mobile ?? "");
        setFullName(item.fullName ?? "");
        setOrganizationName(item[config.organizationField] ?? "");
        setInstituteTypeId(String(item[config.instituteTypeField] ?? ""));
        setContactPerson(item[config.contactPersonField] ?? "");
        setDesignation(item[config.designationField] ?? "");
        setCountryId(String(item[config.countryField] ?? ""));
        setStateId(String(item[config.stateField] ?? ""));
        setCityId(String(item[config.cityField] ?? ""));
        setWebsite(item[config.websiteField] ?? "");
        setConsentGiven(Boolean(item[config.consentField]));
        setCreatedBy(item.eM_created_by ?? item.EM_created_by ?? null);
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

  /* --------------------------- SUBMIT --------------------------- */

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      // Resolve the currently logged-in user id (from login response / JWT / storage).
      const currentUserId = Number(getCurrentUserId2());
      if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
        throw new Error(
          "Unable to identify the current user. Please sign in again.",
        );
      }

      let response;

      if (isCreate) {
        const payload = {
          email: email.trim(),
          password,
          mobile: mobile.trim(),
          fullName: fullName.trim(),
          [config.organizationField]: organizationName.trim(),
          [config.instituteTypeField]: Number(instituteTypeId),
          [config.contactPersonField]: contactPerson.trim(),
          [config.designationField]: designation.trim(),
          [config.countryField]: Number(countryId),
          [config.stateField]: Number(stateId),
          [config.cityField]: Number(cityId),
          [config.websiteField]: website.trim(),
          [config.consentField]: Boolean(consentGiven),
          // On create, both created/updated by = current user
          eM_created_by: currentUserId,
          eM_updated_by: currentUserId,
        };

        response = await config.api.create(payload);
      } else {
        // On update: always set updated_by; only include created_by when it
        // has a real value, so we don't accidentally wipe the original creator.
        const payload = {
          [config.idField]: Number(id),
          email: email.trim(),
          mobile: mobile.trim(),
          fullName: fullName.trim(),
          [config.organizationField]: organizationName.trim(),
          [config.instituteTypeField]: Number(instituteTypeId),
          [config.contactPersonField]: contactPerson.trim(),
          [config.designationField]: designation.trim(),
          [config.countryField]: Number(countryId),
          [config.stateField]: Number(stateId),
          [config.cityField]: Number(cityId),
          [config.websiteField]: website.trim(),
          [config.consentField]: Boolean(consentGiven),
          eM_updated_by: currentUserId,
        };

        if (createdBy != null && createdBy !== "") {
          payload.eM_created_by = Number(createdBy);
        }

        response = await config.api.update(id, payload);
      }

      const responseMessage =
        response?.data?.message || response?.data?.Message;
      openStatus(
        isCreate ? "success" : "update",
        responseMessage ||
          `Employer ${isCreate ? "created" : "updated"} successfully.`,
        {
          confirmText: "Continue",
          onConfirm: () => {
            if (onSaved) {
              onSaved();
              return;
            }
            navigate(listPath);
          },
        },
      );
    } catch (err) {
      const message = getErrorMessage(
        err,
        `Failed to ${isCreate ? "create" : "update"} employer.`,
      );
      setError(message);
      openStatus("error", message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    let validationMessage = "";
    if (!organizationName.trim()) {
      validationMessage = "Organization Name is required.";
    } else if (!instituteTypeId) {
      validationMessage = "Organization Type is required.";
    } else if (!contactPerson.trim()) {
      validationMessage = "Contact Person is required.";
    } else if (!MOBILE_RE.test(mobile.trim())) {
      validationMessage = "Mobile must be exactly 10 digits.";
    } else if (!EMAIL_RE.test(email.trim())) {
      validationMessage = "Enter a valid email address.";
    } else if (isCreate && password.trim().length < 6) {
      validationMessage = "Password must be at least 6 characters.";
    } else if (!countryId) {
      validationMessage = "Country is required.";
    } else if (!stateId) {
      validationMessage = "State is required.";
    } else if (!cityId) {
      validationMessage = "City is required.";
    } else if (!consentGiven) {
      validationMessage = "Please provide consent before submitting.";
    } else if (
      !instituteTypes.some(
        (item) => String(item.iT_institute_type_id) === String(instituteTypeId),
      )
    ) {
      validationMessage = "Select a valid Organization Type.";
    } else if (
      !countries.some((item) => String(item.cM_Id) === String(countryId))
    ) {
      validationMessage = "Select a valid Country.";
    } else if (
      !filteredStates.some((item) => String(item.sM_Id) === String(stateId))
    ) {
      validationMessage = "Select a State for the selected Country.";
    } else if (
      !filteredCities.some((item) => String(item.ctM_Id) === String(cityId))
    ) {
      validationMessage = "Select a City for the selected State.";
    }

    if (validationMessage) {
      setError(validationMessage);
      openStatus("warning", validationMessage);
      return;
    }

    if (!isCreate) {
      openConfirm({
        title: "Confirm update",
        message: "Are you sure you want to update this employer?",
        confirmText: "Update",
        onConfirm: save,
      });
      return;
    }
    await save();
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

  // Derived filtered lists (memoized for stability)
  const filteredStates = useMemo(
    () => states.filter((s) => String(s.sM_CountryId) === String(countryId)),
    [states, countryId],
  );

  const filteredCities = useMemo(
    () => cities.filter((c) => String(c.ctM_StateId) === String(stateId)),
    [cities, stateId],
  );

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => (onCancel ? onCancel() : navigate(listPath))}
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
              {/* Organization Name */}
              <FieldRow label="Organization Name" required>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  disabled={disabled}
                  required={!isView}
                  placeholder="Enter organization name"
                  className={inputClass}
                />
              </FieldRow>

              {/* Organization Type (Institute Type) */}
              <FieldRow label="Organization Type" required>
                <div className="relative">
                  <select
                    value={instituteTypeId}
                    onChange={(e) => setInstituteTypeId(e.target.value)}
                    disabled={disabled || loadingInstituteTypes}
                    required={!isView}
                    className={selectClass}
                  >
                    <option value="">
                      {loadingInstituteTypes
                        ? "Loading..."
                        : "Select Organization Type"}
                    </option>
                    {instituteTypes.map((t) => (
                      <option
                        key={t.iT_institute_type_id}
                        value={String(t.iT_institute_type_id)}
                      >
                        {t.iT_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </FieldRow>

              {/* Contact Person */}
              <FieldRow label="Contact Person" required>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  disabled={disabled}
                  required={!isView}
                  placeholder="Full name of contact person"
                  className={inputClass}
                />
              </FieldRow>

              {/* Designation */}
              <FieldRow label="Designation">
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  disabled={disabled}
                  placeholder="e.g. HR Manager"
                  className={inputClass}
                />
              </FieldRow>

              {/* Mobile Number */}
              <FieldRow label="Mobile Number" required>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) =>
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  disabled={disabled}
                  required={!isView}
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  className={inputClass}
                />
              </FieldRow>

              {/* Email Address */}
              <FieldRow label="Email Address" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={disabled}
                  required={!isView}
                  placeholder="Enter your email"
                  className={inputClass}
                />
              </FieldRow>

              {/* Password — create only, with show/hide toggle */}
              {isCreate && (
                <FieldRow label="Password" required>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={disabled}
                      required
                      autoComplete="new-password"
                      placeholder="Minimum 6 characters"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={disabled}
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff size={16} strokeWidth={2} />
                      ) : (
                        <Eye size={16} strokeWidth={2} />
                      )}
                    </button>
                  </div>
                </FieldRow>
              )}

              {/* Country */}
              <FieldRow label="Country" required>
                <div className="relative">
                  <select
                    value={countryId}
                    onChange={(e) => {
                      setCountryId(e.target.value);
                      setStateId("");
                      setCityId("");
                    }}
                    disabled={disabled || loadingCountries}
                    required={!isView}
                    className={selectClass}
                  >
                    <option value="">
                      {loadingCountries ? "Loading..." : "Select Country"}
                    </option>
                    {countries.map((c) => (
                      <option key={c.cM_Id} value={String(c.cM_Id)}>
                        {c.cM_CountryName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </FieldRow>

              {/* State */}
              <FieldRow label="State" required>
                <div className="relative">
                  <select
                    value={stateId}
                    onChange={(e) => {
                      setStateId(e.target.value);
                      setCityId("");
                    }}
                    disabled={disabled || !countryId || loadingStates}
                    required={!isView}
                    className={selectClass}
                  >
                    <option value="">
                      {!countryId
                        ? "Select Country first"
                        : loadingStates
                          ? "Loading..."
                          : "Select State"}
                    </option>
                    {filteredStates.map((s) => (
                      <option key={s.sM_Id} value={String(s.sM_Id)}>
                        {s.sM_StateName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </FieldRow>

              {/* City */}
              <FieldRow label="City" required>
                <div className="relative">
                  <select
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    disabled={disabled || !stateId || loadingCities}
                    required={!isView}
                    className={selectClass}
                  >
                    <option value="">
                      {!stateId
                        ? "Select State first"
                        : loadingCities
                          ? "Loading..."
                          : "Select City"}
                    </option>
                    {filteredCities.map((c) => (
                      <option key={c.ctM_Id} value={String(c.ctM_Id)}>
                        {c.ctM_CityName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </FieldRow>

              {/* Website */}
              <FieldRow label="Website">
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={disabled}
                  placeholder="example.com (optional)"
                  className={inputClass}
                />
              </FieldRow>

              {/* Consent */}
              <div className="grid grid-cols-[160px_1fr] items-start gap-3 md:col-span-2">
                <label className={`${FIELD_LABEL} pt-2`}>Consent</label>
                <div>
                  <label className="flex items-start gap-2 text-[13px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      disabled={disabled}
                      required={!isView}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2f6b8a] focus:ring-[#2f6b8a]"
                    />
                    <span>
                      I agree to the Privacy Policy and Terms of Service of
                      Ishraq HR.
                      {!isView && <span className="ml-1 text-red-500">*</span>}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => (onCancel ? onCancel() : navigate(listPath))}
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
        isOpen={Boolean(modal)}
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

export default CreateEmployer;