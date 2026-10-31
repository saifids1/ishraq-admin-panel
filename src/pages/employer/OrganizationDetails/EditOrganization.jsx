import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronsLeft } from "lucide-react";
import { validate } from "./employerConfig";
import {
  getEmployerById,
  updateEmployer,
  updateEmployerActiveStatus,
} from "../../../api/employerApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";
import StatusModal from "../../../components/common/StatusModal";

const PROFILE_PATH = "/employer/organization-profile";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const FIELD_LABEL = "text-[13px] font-semibold text-black leading-tight";

const EMPTY_FORM = {
  organizationName: "",
  organizationType: "",
  website: "",
  status: "Active",
  contactPerson: "",
  designation: "",
  email: "",
  mobile: "",
  country: "",
  state: "",
  city: "",
  consent: false,
};

/* -------------------------- API HELPERS -------------------------- */

const getApiData = (response) =>
  response?.data?.data ?? response?.data?.Data ?? response?.data ?? response;

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

const getId = (record, ...keys) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) {
      return String(record[key]);
    }
  }
  return "";
};

const getName = (record, ...keys) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) {
      return String(record[key]);
    }
  }
  return "";
};

const getInstituteTypeId = (item) =>
  getId(item, "iT_institute_type_id", "IT_InstituteTypeId", "IT_Id");
const getInstituteTypeName = (item) =>
  getName(item, "iT_name", "IT_Name", "IT_InstituteTypeName");
const getCountryId = (item) =>
  getId(item, "cM_Id", "CM_Id", "cM_country_id", "CM_CountryId");
const getCountryName = (item) =>
  getName(item, "cM_CountryName", "CM_CountryName", "countryName");
const getStateId = (item) =>
  getId(item, "sM_Id", "SM_Id", "sM_state_id", "SM_StateId");
const getStateName = (item) =>
  getName(item, "sM_StateName", "SM_StateName", "stateName");
const getCityId = (item) =>
  getId(item, "ctM_Id", "CTM_Id", "ctM_city_id", "CTM_CityId");
const getCityName = (item) =>
  getName(item, "ctM_CityName", "CTM_CityName", "cityName");

/* -------------------------- FORM MAPPING ------------------------- */

const toFormData = (record) => ({
  organizationName: record.eM_organization_name ?? "",
  organizationType: String(record.eM_institute_type_id ?? ""),
  website: record.eM_website ?? "",
  status: record.eM_is_active ? "Active" : "Inactive",
  contactPerson: record.eM_contact_person ?? "",
  designation: record.eM_designation ?? "",
  email: record.email ?? "",
  mobile: record.mobile ?? "",
  country: String(record.eM_country_id ?? ""),
  state: String(record.eM_state_id ?? ""),
  city: String(record.eM_city_id ?? ""),
  consent: Boolean(record.eM_consent_given),
});

/* -------------------------- SUB COMPONENTS ------------------------ */

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
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </div>
  </div>
);

const SelectInput = ({ value, onChange, disabled, placeholder, options }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={selectClass}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <ChevronDown
      size={16}
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
    />
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
    {children}
  </h3>
);

// Keeps the saved option visible when its master record is inactive or missing.
const withSavedOption = (options, value, label) => {
  if (!value || options.some((option) => option.value === String(value))) {
    return options;
  }
  return [{ value: String(value), label: label || "Current" }, ...options];
};

/* ========================================================= */

export default function EmployerEdit() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [emp, setEmp] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [modal, setModal] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [instituteTypes, setInstituteTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  /* ---------- modal helpers (same pattern as EditJobSeeker) ---------- */

  const openStatus = (type, message, extra = {}) => {
    setModal({
      type,
      title: extra.title,
      message,
      confirmText: extra.confirmText || "OK",
      showCancel: false,
      onConfirm: () => {
        setModal(null);
        extra.onConfirm?.();
      },
      onCancel: () => setModal(null),
    });
  };

  const openConfirm = ({ title, message, confirmText, onConfirm }) => {
    setModal({
      type: "confirm",
      title,
      message,
      confirmText: confirmText || "Confirm",
      cancelText: "Cancel",
      showCancel: true,
      onConfirm: () => {
        setModal(null);
        onConfirm?.();
      },
      onCancel: () => setModal(null),
    });
  };

  /* ---------------------- LOAD BASE MASTERS ---------------------- */
  // Institute types and countries are top-level lists. States and cities load by parent ID below.

  useEffect(() => {
    let cancelled = false;

    const loadMasters = async () => {
      setLoadingMasters(true);

      try {
        const [instituteResponse, countryResponse] = await Promise.all([
          instituteTypeApi.getAllList(),
          countryMasterApi.getAllList(),
        ]);

        if (cancelled) return;

        setInstituteTypes(extractList(instituteResponse));
        setCountries(extractList(countryResponse));
      } catch (error) {
        if (!cancelled) {
          openStatus(
            "error",
            getApiErrorMessage(error) || "Failed to load dropdown options.",
          );
        }
      } finally {
        if (!cancelled) setLoadingMasters(false);
      }
    };

    loadMasters();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------- LOAD EMPLOYER ------------------------- */

  useEffect(() => {
    let cancelled = false;

    const loadEmployer = async () => {
      setLoading(true);
      setServerError("");

      try {
        if (!id || id === "demo") {
          throw new Error("A valid employer record ID is required.");
        }

        const response = await getEmployerById(id);
        const record = getApiData(response);

        if (
          response?.success === false ||
          record?.success === false ||
          !record ||
          record.eM_employer_id == null
        ) {
          throw new Error(
            response?.message ||
              record?.message ||
              "Employer details could not be loaded.",
          );
        }

        if (cancelled) return;

        setEmp(record);
        setForm(toFormData(record));
      } catch (error) {
        if (!cancelled) {
          setServerError(
            getApiErrorMessage(error) || "Failed to load employer details.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEmployer();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ---------------- STATES BY COUNTRY ID ----------------- */
  // GET /StateMaster/country/{countryId}

  useEffect(() => {
    setStates([]);

    if (!form.country) {
      setLoadingStates(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingStates(true);

    stateMasterApi
      .getByCountry(Number(form.country))
      .then((response) => {
        if (!cancelled) setStates(extractList(response));
      })
      .catch((error) => {
        if (!cancelled) {
          setStates([]);
          openStatus(
            "error",
            getApiErrorMessage(error) || "Failed to load states.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.country]);

  /* ---------------- CITIES BY STATE ID ----------------- */
  // GET /CityMaster/state/{stateId}

  useEffect(() => {
    setCities([]);

    if (!form.state) {
      setLoadingCities(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingCities(true);

    cityMasterApi
      .getByState(Number(form.state))
      .then((response) => {
        if (!cancelled) setCities(extractList(response));
      })
      .catch((error) => {
        if (!cancelled) {
          setCities([]);
          openStatus(
            "error",
            getApiErrorMessage(error) || "Failed to load cities.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.state]);

  /* ---------------- CASCADING DROPDOWN OPTIONS ----------------- */

  const instituteOptions = useMemo(
    () =>
      instituteTypes.map((item) => ({
        value: getInstituteTypeId(item),
        label: getInstituteTypeName(item),
      })),
    [instituteTypes],
  );

  const countryOptions = useMemo(
    () =>
      countries.map((item) => ({
        value: getCountryId(item),
        label: getCountryName(item),
      })),
    [countries],
  );

  const stateOptions = useMemo(
    () =>
      states.map((item) => ({
        value: getStateId(item),
        label: getStateName(item),
      })),
    [states],
  );

  const cityOptions = useMemo(
    () =>
      cities.map((item) => ({
        value: getCityId(item),
        label: getCityName(item),
      })),
    [cities],
  );

  /* --------------------------- CHANGE ---------------------------- */

  const change = (name, value) => {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "country") {
        next.state = "";
        next.city = "";
      }
      if (name === "state") {
        next.city = "";
      }
      return next;
    });

    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      if (name === "country") {
        delete next.state;
        delete next.city;
      }
      if (name === "state") {
        delete next.city;
      }
      return next;
    });
  };

  const onTextChange = (name) => (e) => change(name, e.target.value);

  /* ---------------------------- SAVE ---------------------------- */

  const save = async (trimmed) => {
    if (!emp) return;

    setServerError("");
    setSaving(true);

    try {
      const employerId = emp.eM_employer_id;
      const optional = (value) => (value?.trim() ? value.trim() : null);

      const payload = {
        eM_organization_name: trimmed.organizationName,
        eM_institute_type_id: Number(trimmed.organizationType),
        eM_contact_person: optional(trimmed.contactPerson),
        eM_designation: optional(trimmed.designation),
        eM_country_id: Number(trimmed.country),
        eM_state_id: Number(trimmed.state),
        eM_city_id: Number(trimmed.city),
        eM_website: optional(trimmed.website),
        eM_consent_given: Boolean(trimmed.consent),
        email: trimmed.email,
        mobile: trimmed.mobile,
        fullName: emp.fullName ?? emp.userName ?? "",
      };

      const response = await updateEmployer(employerId, payload);
      const result = getApiData(response);

      if (response?.success === false || result?.success === false) {
        throw new Error(
          response?.message ||
            result?.message ||
            "Failed to update employer details.",
        );
      }

      const previousStatus = Boolean(emp.eM_is_active);
      const nextStatus = trimmed.status === "Active";

      if (previousStatus !== nextStatus) {
        const statusResponse = await updateEmployerActiveStatus(
          employerId,
          nextStatus,
        );
        const statusResult = getApiData(statusResponse);

        if (
          statusResponse?.success === false ||
          statusResult?.success === false
        ) {
          throw new Error(
            statusResponse?.message ||
              statusResult?.message ||
              "Details were saved, but the status could not be updated.",
          );
        }
      }

      openStatus("update", "Organization updated successfully.", {
        confirmText: "Continue",
        onConfirm: () => navigate(PROFILE_PATH, { replace: true }),
      });
    } catch (error) {
      openStatus(
        "error",
        getApiErrorMessage(error) || "Failed to save organization details.",
      );
    } finally {
      setSaving(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (saving) return;

    const trimmed = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ]),
    );

    const validationErrors = validate(trimmed);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      openStatus(
        "warning",
        Object.values(validationErrors)[0] || "Please correct the highlighted fields.",
      );
      return;
    }

    if (
      !trimmed.organizationType ||
      !trimmed.country ||
      !trimmed.state ||
      !trimmed.city
    ) {
      openStatus(
        "warning",
        "Please select Institute Type, Country, State, and City.",
      );
      return;
    }

    if (!states.some((s) => String(getStateId(s)) === trimmed.state)) {
      openStatus("warning", "Select a State for the selected Country.");
      return;
    }

    if (!cities.some((c) => String(getCityId(c)) === trimmed.city)) {
      openStatus("warning", "Select a City for the selected State.");
      return;
    }

    openConfirm({
      title: "Confirm update",
      message: "Are you sure you want to update this organization?",
      confirmText: "Update",
      onConfirm: () => save(trimmed),
    });
  };

  /* ------------------------ LOADING / ERROR --------------------- */

  if (loading) {
    return (
      <div className="min-h-full bg-[#f4f8fb]">
        <div className="mx-auto">
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Loading organization details...
          </div>
        </div>
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="min-h-full bg-[#f4f8fb]">
        <div className="mx-auto">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex justify-between border-b border-slate-200 px-6 py-4">
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
                <h2 className="font-semibold text-slate-800">Edit Organization</h2>
              </div>
            </div>
            <div className="mx-4 my-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {serverError || "Organization details could not be loaded."}
            </div>
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
  }

  /* ----------------------------- UI ----------------------------- */

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* HEADER */}
          <div className="flex justify-between border-b border-slate-200 px-6 py-4">
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
              <h2 className="font-semibold text-slate-800">Edit Organization</h2>
            </div>
          </div>

          {serverError && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <form onSubmit={submit} noValidate className="space-y-6 p-4">
            {/* ORGANIZATION DETAILS */}
            <section>
              <SectionTitle>Organization Details</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow label="Organization Name" required error={errors.organizationName}>
                  <input
                    type="text"
                    value={form.organizationName}
                    onChange={onTextChange("organizationName")}
                    disabled={saving}
                    placeholder="Organization name"
                    className={inputClass}
                  />
                </FieldRow>

                <FieldRow label="Institute Type" required error={errors.organizationType}>
                  <SelectInput
                    value={form.organizationType}
                    onChange={(e) => change("organizationType", e.target.value)}
                    disabled={saving || loadingMasters}
                    placeholder={
                      loadingMasters ? "Loading institute types..." : "Select Institute Type"
                    }
                    options={withSavedOption(
                      instituteOptions,
                      form.organizationType,
                      emp.instituteTypeName,
                    )}
                  />
                </FieldRow>

                <FieldRow label="Website" error={errors.website}>
                  <input
                    type="text"
                    value={form.website}
                    onChange={onTextChange("website")}
                    disabled={saving}
                    placeholder="www.example.com"
                    className={inputClass}
                  />
                </FieldRow>
              </div>
            </section>

            {/* CONTACT PERSON */}
            <section>
              <SectionTitle>Contact Person</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow label="Contact Person" error={errors.contactPerson}>
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={onTextChange("contactPerson")}
                    disabled={saving}
                    placeholder="Contact person name"
                    className={inputClass}
                  />
                </FieldRow>

                <FieldRow label="Designation" error={errors.designation}>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={onTextChange("designation")}
                    disabled={saving}
                    placeholder="HR Manager"
                    className={inputClass}
                  />
                </FieldRow>

                <FieldRow label="Email" required error={errors.email}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={onTextChange("email")}
                    disabled={saving}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </FieldRow>

                <FieldRow label="Mobile Number" required error={errors.mobile}>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.mobile}
                    onChange={(e) =>
                      change("mobile", e.target.value.replace(/[^\d+\s]/g, ""))
                    }
                    disabled={saving}
                    placeholder="+91 98765 43210"
                    className={inputClass}
                  />
                </FieldRow>
              </div>
            </section>

            {/* LOCATION */}
            <section>
              <SectionTitle>Location</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow label="Country" required error={errors.country}>
                  <SelectInput
                    value={form.country}
                    onChange={(e) => change("country", e.target.value)}
                    disabled={saving || loadingMasters}
                    placeholder={loadingMasters ? "Loading countries..." : "Select Country"}
                    options={withSavedOption(countryOptions, form.country, emp.countryName)}
                  />
                </FieldRow>

                <FieldRow label="State" required error={errors.state}>
                  <SelectInput
                    value={form.state}
                    onChange={(e) => change("state", e.target.value)}
                    disabled={saving || !form.country || loadingStates}
                    placeholder={
                      !form.country
                        ? "Select Country first"
                        : loadingStates
                          ? "Loading states..."
                          : "Select State"
                    }
                    options={withSavedOption(stateOptions, form.state, emp.stateName)}
                  />
                </FieldRow>

                <FieldRow label="City" required error={errors.city}>
                  <SelectInput
                    value={form.city}
                    onChange={(e) => change("city", e.target.value)}
                    disabled={saving || !form.state || loadingCities}
                    placeholder={
                      !form.state
                        ? "Select State first"
                        : loadingCities
                          ? "Loading cities..."
                          : "Select City"
                    }
                    options={withSavedOption(cityOptions, form.city, emp.cityName)}
                  />
                </FieldRow>
              </div>
            </section>

            {/* CONSENT */}
            <section>
              <div className="grid grid-cols-[160px_1fr] items-start gap-3">
                <label className={FIELD_LABEL}>Consent</label>
                <label className="flex items-start gap-2 text-[13px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(form.consent)}
                    onChange={(e) => change("consent", e.target.checked)}
                    disabled={saving}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2f6b8a] focus:ring-[#2f6b8a]"
                  />
                  <span>
                    I authorize Ishraq HR to use and share my organization profile and
                    submitted details with job seekers and partners for recruitment purposes.
                  </span>
                </label>
              </div>
            </section>

            {/* FOOTER */}
            <div className="flex justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => navigate(PROFILE_PATH)}
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || loadingMasters || loadingStates || loadingCities}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Update"}
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
}