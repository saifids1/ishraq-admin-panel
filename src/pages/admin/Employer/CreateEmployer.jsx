import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronsLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import employerApi from "../../../api/Services/adminemployeelistApi";
// import employerApi from "../../../api/Services/employerApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

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

const CreateEmployer = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const isCreate = mode === "create";

  const [isView, setIsView] = useState(mode === "view");
  const [isEdit, setIsEdit] = useState(mode === "edit");

  // The 13 fields, exactly as the API expects
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

  /* --------------------------- LOOKUPS --------------------------- */

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingInstituteTypes(true);
      try {
        const r = await instituteTypeApi.getAllList();
        if (!cancelled) setInstituteTypes(extractList(r));
      } catch (err) {
        if (!cancelled) console.error("institute types:", err);
      } finally {
        if (!cancelled) setLoadingInstituteTypes(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingCountries(true);
      try {
        const r = await countryMasterApi.getAllList();
        if (!cancelled) setCountries(extractList(r));
      } catch (err) {
        if (!cancelled) console.error("countries:", err);
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingStates(true);
      try {
        const r = await stateMasterApi.getAllList();
        if (!cancelled) setStates(extractList(r));
      } catch (err) {
        if (!cancelled) console.error("states:", err);
      } finally {
        if (!cancelled) setLoadingStates(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingCities(true);
      try {
        const r = await cityMasterApi.getAllList();
        if (!cancelled) setCities(extractList(r));
      } catch (err) {
        if (!cancelled) console.error("cities:", err);
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    };
    load();
    return () => { cancelled = true; };
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    
    if (!EMAIL_RE.test(email.trim()))
      return setError("Enter a valid email address.");
    if (!MOBILE_RE.test(mobile.trim()))
      return setError("Mobile must be exactly 10 digits.");

    if (isCreate && password.trim().length < 6)
      return setError("Password must be at least 6 characters.");

    if (!organizationName.trim())
      return setError("Organization Name is required.");
    if (!instituteTypeId) return setError("Institute Type is required.");
    if (!contactPerson.trim()) return setError("Contact Person is required.");
    if (!countryId) return setError("Country is required.");
    if (!stateId) return setError("State is required.");
    if (!cityId) return setError("City is required.");

    if (!consentGiven)
      return setError("Please provide consent before submitting.");

    setSaving(true);
    setError("");

    try {
      if (isCreate) {
        // POST /api/Employer — exactly the 13 fields.
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
        };

        await config.api.create(payload);
      } else {
        // PUT /api/Employer — same shape minus password, id in the body.
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
        };

        await config.api.update(id, payload);
      }

      navigate(listPath);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          `Failed to ${isCreate ? "create" : "update"} employer.`,
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

  const filteredStates = states.filter(
    (s) => String(s.sM_CountryId) === String(countryId),
  );
  const filteredCities = cities.filter(
    (c) => String(c.ctM_StateId) === String(stateId),
  );

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/admin/employer")}
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

              {/* Full Name */}
              {/* <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Full Name
                  {!isView && <span className="ml-1 text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={disabled}
                  required={!isView}
                  className={inputClass}
                />
              </div> */}
               <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Organization Name
                  {!isView && <span className="ml-1 text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  disabled={disabled}
                  required={!isView}
                  className={inputClass}
                />
              </div>
              {/* Institute Type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Institute Type
                  {!isView && <span className="ml-1 text-red-500">*</span>}
                </label>
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
                        : "Select Institute Type"}
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
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>
                 {/* Contact Person — single instance */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Contact Person
                  {!isView && <span className="ml-1 text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  disabled={disabled}
                  required={!isView}
                  className={inputClass}
                />
              </div>

              {/* Designation */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Designation
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  disabled={disabled}
                  className={inputClass}
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email
                  {!isView && <span className="ml-1 text-red-500">*</span>}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={disabled}
                  required={!isView}
                  className={inputClass}
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Mobile
                  {!isView && <span className="ml-1 text-red-500">*</span>}
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) =>
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  disabled={disabled}
                  required={!isView}
                  inputMode="numeric"
                  className={inputClass}
                />
              </div>

              {/* Password — create only */}
              {isCreate && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={disabled}
                    required
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </div>
              )}

              {/* Organization Name */}
             

              

           

              {/* Country */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Country
                  {!isView && <span className="ml-1 text-red-500">*</span>}
                </label>
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
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>

              {/* State */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  State
                  {!isView && <span className="ml-1 text-red-500">*</span>}
                </label>
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
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  City
                  {!isView && <span className="ml-1 text-red-500">*</span>}
                </label>
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
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Website
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={disabled}
                  placeholder="example.com"
                  className={inputClass}
                />
              </div>

              {/* Consent */}
              <div className="md:col-span-2">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    disabled={disabled}
                    required={!isView}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2f6b8a] focus:ring-[#2f6b8a]"
                  />
                  <span className="text-sm text-slate-700">
                    I confirm that the above information is accurate and I
                    consent to it being stored.
                    {!isView && <span className="ml-1 text-red-500">*</span>}
                  </span>
                </label>
              </div>
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

export default CreateEmployer;
