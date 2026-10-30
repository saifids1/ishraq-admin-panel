// src/pages/admin/employer/CreateEmployer.jsx
import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronsLeft, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

/* ---------- field row: label : input (responsive) ---------- */
const FIELD_LABEL = "text-[13px] font-semibold text-black leading-tight";

const FieldRow = ({ label, required, error, children, fullWidth }) => (
  <div
    className={`grid grid-cols-1 gap-1.5 sm:grid-cols-[160px_1fr] sm:items-start sm:gap-3 ${
      fullWidth ? "md:col-span-2" : ""
    }`}
  >
    <label className={`${FIELD_LABEL} sm:pt-2`}>
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

const CreateEmployer = ({ onCancel, onSaved }) => {
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
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

  const [showPassword, setShowPassword] = useState(false);

  // Dropdown sources
  const [instituteTypes, setInstituteTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  /* --------------------------- MODAL --------------------------- */

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

  /* --------------------------- LEVEL 1: institute types + countries --------------------------- */

  useEffect(() => {
    let cancelled = false;

    const fetchBase = async () => {
      setLoadingLookups(true);
      const [types, countryRes] = await Promise.allSettled([
        instituteTypeApi.getAllList(),
        countryMasterApi.getAllList(),
      ]);

      if (cancelled) return;

      if (types.status === "fulfilled") {
        setInstituteTypes(extractList(types.value));
      } else {
        setError(
          getErrorMessage(types.reason, "Unable to load institute types."),
        );
      }

      if (countryRes.status === "fulfilled") {
        setCountries(extractList(countryRes.value));
      } else {
        setError(getErrorMessage(countryRes.reason, "Unable to load countries."));
      }

      setLoadingLookups(false);
    };

    fetchBase();
    return () => {
      cancelled = true;
    };
  }, []);

  /* --------------------------- LEVEL 2: states for the selected country --------------------------- */
  // GET /StateMaster/all?countryId=

  useEffect(() => {
    let cancelled = false;
    setStates([]);

    if (!countryId) {
      setLoadingStates(false);
      return undefined;
    }

    setLoadingStates(true);

    stateMasterApi
      .getByCountry(Number(countryId))
      .then((response) => {
        if (!cancelled) setStates(extractList(response));
      })
      .catch((err) => {
        if (!cancelled) {
          setStates([]);
          setError(getErrorMessage(err, "Unable to load states."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [countryId]);

  /* --------------------------- LEVEL 3: cities for the selected state --------------------------- */
  // GET /CityMaster/all?stateId=

  useEffect(() => {
    let cancelled = false;
    setCities([]);

    if (!stateId) {
      setLoadingCities(false);
      return undefined;
    }

    setLoadingCities(true);

    cityMasterApi
      .getByState(Number(stateId))
      .then((response) => {
        if (!cancelled) setCities(extractList(response));
      })
      .catch((err) => {
        if (!cancelled) {
          setCities([]);
          setError(getErrorMessage(err, "Unable to load cities."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stateId]);

  /* --------------------------- SUBMIT --------------------------- */

  const save = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const currentUserId = Number(getCurrentUserId2());
      if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
        throw new Error(
          "Unable to identify the current user. Please sign in again.",
        );
      }

      const payload = {
        email: email.trim(),
        password,
        mobile: mobile.trim(),
        whatsapp_number: whatsappNumber.trim() || null,
        fullName: fullName.trim(),
        eM_created_by: currentUserId,
        [config.organizationField]: organizationName.trim(),
        [config.instituteTypeField]: Number(instituteTypeId),
        [config.contactPersonField]: contactPerson.trim(),
        [config.designationField]: designation.trim(),
        [config.countryField]: Number(countryId),
        [config.stateField]: Number(stateId),
        [config.cityField]: Number(cityId),
        [config.websiteField]: website.trim(),
        [config.consentField]: Boolean(consentGiven),
      };

      const response = await config.api.create(payload);
      const responseMessage =
        response?.data?.message || response?.data?.Message;

      openStatus(
        "success",
        responseMessage || "Employer created successfully.",
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
      const message = getErrorMessage(err, "Failed to create employer.");
      setError(message);
      openStatus("error", message);
    } finally {
      setSaving(false);
    }
  }, [
    email,
    password,
    mobile,
    whatsappNumber,
    fullName,
    organizationName,
    instituteTypeId,
    contactPerson,
    designation,
    countryId,
    stateId,
    cityId,
    website,
    consentGiven,
    onSaved,
    navigate,
  ]);

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
    } else if (whatsappNumber && !MOBILE_RE.test(whatsappNumber.trim())) {
      validationMessage = "WhatsApp number must be exactly 10 digits.";
    } else if (!EMAIL_RE.test(email.trim())) {
      validationMessage = "Enter a valid email address.";
    } else if (password.trim().length < 6) {
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
      !states.some((item) => String(item.sM_Id) === String(stateId))
    ) {
      validationMessage = "Select a State for the selected Country.";
    } else if (
      !cities.some((item) => String(item.ctM_Id) === String(cityId))
    ) {
      validationMessage = "Select a City for the selected State.";
    }

    if (validationMessage) {
      setError(validationMessage);
      openStatus("warning", validationMessage);
      return;
    }

    await save();
  };

  /* --------------------------- STYLES --------------------------- */

  const disabled = loadingLookups || saving;

  const handleBack = () => (onCancel ? onCancel() : navigate(listPath));

  /* --------------------------- RENDER --------------------------- */

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                title="Back"
                aria-label="Back"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f]"
              >
                <ChevronsLeft size={18} strokeWidth={2} />
              </button>
              <h2 className="truncate font-semibold text-slate-800">
                Create {config.singular}
              </h2>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 sm:mx-6">
              {error}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
              {/* Organization Name */}
              <FieldRow label="Organization Name" required>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  disabled={disabled}
                  required
                  placeholder="Enter organization name"
                  className={inputClass}
                />
              </FieldRow>

              {/* Organization Type */}
              <FieldRow label="Organization Type" required>
                <div className="relative">
                  <select
                    value={instituteTypeId}
                    onChange={(e) => setInstituteTypeId(e.target.value)}
                    disabled={disabled}
                    required
                    className={selectClass}
                  >
                    <option value="">
                      {loadingLookups ? "Loading..." : "Select Organization Type"}
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
                  required
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

              {/* Full Name */}
              <FieldRow label="Full Name" required>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={disabled}
                  required
                  placeholder="Enter full name"
                  className={inputClass}
                />
              </FieldRow>

              {/* Mobile */}
              <FieldRow label="Mobile Number" required>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) =>
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  disabled={disabled}
                  required
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  className={inputClass}
                />
              </FieldRow>

              {/* WhatsApp Number */}
              <FieldRow label="WhatsApp Number">
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) =>
                    setWhatsappNumber(
                      e.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  disabled={disabled}
                  inputMode="numeric"
                  placeholder="10-digit WhatsApp number (optional)"
                  className={inputClass}
                />
              </FieldRow>

              {/* Email */}
              <FieldRow label="Email Address" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={disabled}
                  required
                  placeholder="Enter your email"
                  className={inputClass}
                />
              </FieldRow>

              {/* Password */}
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
                    aria-label={showPassword ? "Hide password" : "Show password"}
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

              {/* Country: level 1 */}
              <FieldRow label="Country" required>
                <div className="relative">
                  <select
                    value={countryId}
                    onChange={(e) => {
                      // Clearing the child selections keeps stale IDs from being submitted.
                      setCountryId(e.target.value);
                      setStateId("");
                      setCityId("");
                    }}
                    disabled={disabled}
                    required
                    className={selectClass}
                  >
                    <option value="">
                      {loadingLookups ? "Loading..." : "Select Country"}
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

              {/* State: level 2, loaded by country */}
              <FieldRow label="State" required>
                <div className="relative">
                  <select
                    value={stateId}
                    onChange={(e) => {
                      setStateId(e.target.value);
                      setCityId("");
                    }}
                    disabled={disabled || !countryId || loadingStates}
                    required
                    className={selectClass}
                  >
                    <option value="">
                      {!countryId
                        ? "Select Country first"
                        : loadingStates
                          ? "Loading states..."
                          : "Select State"}
                    </option>
                    {states.map((s) => (
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

              {/* City: level 3, loaded by state */}
              <FieldRow label="City" required>
                <div className="relative">
                  <select
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    disabled={disabled || !stateId || loadingCities}
                    required
                    className={selectClass}
                  >
                    <option value="">
                      {!stateId
                        ? "Select State first"
                        : loadingCities
                          ? "Loading cities..."
                          : "Select City"}
                    </option>
                    {cities.map((c) => (
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
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[160px_1fr] sm:items-start sm:gap-3 md:col-span-2">
                <label className={`${FIELD_LABEL} sm:pt-2`}>Consent</label>
                <div>
                  <label className="flex items-start gap-2 text-[13px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      disabled={disabled}
                      required
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2f6b8a] focus:ring-[#2f6b8a]"
                    />
                    <span>
                      I agree to the Privacy Policy and Terms of Service of
                      Ishraq HR.
                      <span className="ml-1 text-red-500">*</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-6 flex flex-col-reverse gap-2.5 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={disabled}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Saving..." : "Create"}
              </button>
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