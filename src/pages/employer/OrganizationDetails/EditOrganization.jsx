import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  Building2,
  Briefcase,
  ChevronLeft,
  Globe,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  Landmark,
  ChevronsLeft,
} from "lucide-react";
import { FIELDS, validate } from "./employerConfig";
import {
  getEmployerById,
  updateEmployer,
  updateEmployerActiveStatus,
} from "../../../api/employerApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";

import SelectField from "../../../components/common/SelectField";

const ACCENT = "#2f6b8a";

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
const getStateCountryId = (item) =>
  getId(item, "sM_CountryId", "SM_CountryId", "sM_country_id", "SM_CountryID");
const getCityId = (item) =>
  getId(item, "ctM_Id", "CTM_Id", "ctM_city_id", "CTM_CityId");
const getCityName = (item) =>
  getName(item, "ctM_CityName", "CTM_CityName", "cityName");
const getCityStateId = (item) =>
  getId(item, "ctM_StateId", "CTM_StateId", "ctM_state_id", "CTM_StateID");

/* -------------------------- FORM MAPPING ------------------------- */

const toFormData = (record) => ({
  organizationName: record.eM_organization_name ?? "",
  organizationType: String(record.eM_institute_type_id ?? ""),
  contactPerson: record.eM_contact_person ?? "",
  designation: record.eM_designation ?? "",
  mobile: record.mobile ?? "",
  email: record.email ?? "",
  country: String(record.eM_country_id ?? ""),
  state: String(record.eM_state_id ?? ""),
  city: String(record.eM_city_id ?? ""),
  website: record.eM_website ?? "",
  status: record.eM_is_active ? "Active" : "Inactive",
  consent: Boolean(record.eM_consent_given),
});

/* ------------------------- LAYOUT CONFIG ------------------------- */

// Field names grouped into cards. Any field from employerConfig that is not
// listed here is shown in an "Additional Details" card so nothing is lost.
const GROUPS = [
  {
    title: "Organization Information",
    icon: Building2,
    names: ["organizationName", "organizationType", "website", "status"],
  },
  {
    title: "Contact Person",
    icon: UserRound,
    names: ["contactPerson", "designation", "email", "mobile"],
  },
  {
    title: "Location",
    icon: MapPin,
    names: ["country", "state", "city"],
  },
  {
    title: "Consent",
    icon: ShieldCheck,
    names: ["consent"],
  },
];

const FIELD_ICONS = {
  organizationName: Building2,
  organizationType: Landmark,
  website: Globe,
  status: Activity,
  contactPerson: UserRound,
  designation: Briefcase,
  email: Mail,
  mobile: Phone,
  country: Globe,
  state: MapPin,
  city: MapPin,
};

const MASTER_FIELDS = ["organizationType", "country", "state", "city"];

const Card = ({ title, icon: Icon, children, className = "" }) => (
  <section
    className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
  >
    <header className="mb-4 flex items-center gap-2.5">
      <span
        className="grid h-8 w-8 place-items-center rounded-lg bg-[#eaf3f7]"
        style={{ color: ACCENT }}
      >
        <Icon size={16} />
      </span>
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
    </header>
    {children}
  </section>
);

/* ------------------------- COMPONENT ---------------------------- */

export default function EmployerEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [emp, setEmp] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState({ text: "", bad: false });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);

  const [instituteTypes, setInstituteTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [allStates, setAllStates] = useState([]);
  const [allCities, setAllCities] = useState([]);

  /* ---------------------- LOAD MASTER DATA ---------------------- */

  useEffect(() => {
    let cancelled = false;

    const loadMasters = async () => {
      setLoadingMasters(true);

      try {
        const [
          instituteResponse,
          countryResponse,
          stateResponse,
          cityResponse,
        ] = await Promise.all([
          instituteTypeApi.getAllList(),
          countryMasterApi.getAllList(),
          stateMasterApi.getAllList(),
          cityMasterApi.getAllList(),
        ]);

        if (cancelled) return;

        setInstituteTypes(extractList(instituteResponse));
        setCountries(extractList(countryResponse));
        setAllStates(extractList(stateResponse));
        setAllCities(extractList(cityResponse));
      } catch (error) {
        if (!cancelled) {
          setMsg({
            text:
              error?.response?.data?.message ||
              error?.message ||
              "Failed to load master dropdown data.",
            bad: true,
          });
        }
      } finally {
        if (!cancelled) setLoadingMasters(false);
      }
    };

    loadMasters();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------- LOAD EMPLOYER ------------------------- */

  useEffect(() => {
    let cancelled = false;

    const loadEmployer = async () => {
      setLoading(true);
      setMsg({ text: "", bad: false });

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
          setMsg({
            text:
              error?.response?.data?.message ||
              error?.message ||
              "Failed to load employer details.",
            bad: true,
          });
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

  /* ---------------- CASCADING DROPDOWN OPTIONS ----------------- */

  const states = useMemo(() => {
    if (!form.country) return [];
    return allStates.filter(
      (item) => getStateCountryId(item) === String(form.country),
    );
  }, [allStates, form.country]);

  const cities = useMemo(() => {
    if (!form.state) return [];
    return allCities.filter(
      (item) => getCityStateId(item) === String(form.state),
    );
  }, [allCities, form.state]);

  /* --------------------------- CHANGE ---------------------------- */

  const change = (name, value) => {
    setForm((current) => {
      const next = { ...current, [name]: value };

      // Changing country resets the selected state and city.
      if (name === "country") {
        next.state = "";
        next.city = "";
      }

      // Changing state resets the selected city.
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

    setMsg({ text: "", bad: false });
  };

  /* ---------------------------- SAVE ---------------------------- */

  const save = async (event) => {
    event.preventDefault();

    if (!emp) return;

    const trimmed = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ]),
    );

    const validationErrors = validate(trimmed);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      setMsg({ text: "Please fix the highlighted fields.", bad: true });
      return;
    }

    if (
      !trimmed.organizationType ||
      !trimmed.country ||
      !trimmed.state ||
      !trimmed.city
    ) {
      setMsg({
        text: "Please select Institute Type, Country, State, and City.",
        bad: true,
      });
      return;
    }

    setSaving(true);
    setMsg({ text: "", bad: false });

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

      navigate(`/employer/organization-profile`, { replace: true });
    } catch (error) {
      setMsg({
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to save organization details.",
        bad: true,
      });
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------ FIELD RENDERING --------------------- */

  const fieldMap = useMemo(
    () => Object.fromEntries(FIELDS.map((field) => [field.name, field])),
    [],
  );

  const getDropdownOptions = (name) => {
    if (name === "organizationType") {
      return instituteTypes.map((item) => ({
        value: getInstituteTypeId(item),
        label: getInstituteTypeName(item),
      }));
    }
    if (name === "country") {
      return countries.map((item) => ({
        value: getCountryId(item),
        label: getCountryName(item),
      }));
    }
    if (name === "state") {
      return states.map((item) => ({
        value: getStateId(item),
        label: getStateName(item),
      }));
    }
    if (name === "city") {
      return cities.map((item) => ({
        value: getCityId(item),
        label: getCityName(item),
      }));
    }
    return [];
  };

  const renderField = (name) => {
    const field = fieldMap[name];
    if (!field) return null;

    const { label, type, required } = field;
    const Icon = FIELD_ICONS[name] || Briefcase;
    const error = errors[name];

    if (type === "checkbox") {
      return (
        <label
          key={name}
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition hover:bg-slate-50 sm:col-span-2 ${
            form[name]
              ? "border-[#2f6b8a]/40 bg-[#eaf3f7]/40"
              : "border-slate-200"
          }`}
        >
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 cursor-pointer accent-[#2f6b8a]"
            checked={Boolean(form[name])}
            disabled={saving}
            onChange={(event) => change(name, event.target.checked)}
          />
          <span className="text-sm text-slate-700">{label}</span>
        </label>
      );
    }

    const isMaster = MASTER_FIELDS.includes(name);
    let options = isMaster ? getDropdownOptions(name) : [];

    // Keep the saved option visible if a master record is inactive or
    // missing from the returned list.
    if (
      isMaster &&
      form[name] &&
      !options.some((option) => option.value === String(form[name]))
    ) {
      const savedLabels = {
        organizationType: emp.instituteTypeName || "Current Institute Type",
        country: emp.countryName || "Current Country",
        state: emp.stateName || "Current State",
        city: emp.cityName || "Current City",
      };
      options = [
        { value: String(form[name]), label: savedLabels[name] },
        ...options,
      ];
    }

    const disabled =
      saving ||
      (isMaster && loadingMasters) ||
      (name === "state" && !form.country) ||
      (name === "city" && !form.state);

    const placeholder = isMaster
      ? name === "organizationType"
        ? "Select Institute Type"
        : name === "country"
          ? "Select Country"
          : name === "state"
            ? form.country
              ? "Select State"
              : "Select Country First"
            : form.state
              ? "Select City"
              : "Select State First"
      : "Select";

    const inputClass = `w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
      error ? "border-red-400" : "border-slate-200"
    }`;

    const isSelect = isMaster || type === "select";

    return (
      <div key={name} className="min-w-0">
        <label className="mb-1.5 block text-xs font-medium text-slate-500">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>

        <div className="relative">
          <Icon
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: ACCENT }}
          />

          {isSelect ? (
            <SelectField
              value={form[name] ?? ""}
              onChange={(next) => change(name, next)}
              options={
                isMaster
                  ? options
                  : (field.options || []).map((option) => ({
                      value: option,
                      label: option,
                    }))
              }
              placeholder={placeholder}
              disabled={disabled}
              hasError={Boolean(error)}
            />
          ) : (
            <input
              type={type}
              className={inputClass}
              value={form[name] ?? ""}
              disabled={saving}
              onChange={(event) => change(name, event.target.value)}
            />
          )}
        </div>

        <p className="mt-1 min-h-[1rem] text-xs text-red-600">{error}</p>
      </div>
    );
  };

  // Fields from employerConfig that are not placed in a group.
  const groupedNames = GROUPS.flatMap((group) => group.names);
  const extraNames = FIELDS.map((field) => field.name).filter(
    (name) => !groupedNames.includes(name),
  );

  /* ------------------------ LOADING STATES ---------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white p-6">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <LoaderCircle
            className="animate-spin"
            style={{ color: ACCENT }}
            size={20}
          />
          Loading organization details...
        </div>
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="min-h-full bg-white p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-red-200 bg-white p-5 text-red-700 shadow-sm">
          <AlertCircle className="mt-0.5 shrink-0" size={20} />
          <div>
            <h1 className="font-semibold">Could not load organization</h1>
            <p className="mt-1 text-sm">
              {msg.text || "Organization details could not be loaded."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------- UI ----------------------------- */

  return (
    <div className="min-h-full bg-white text-slate-800">
      {/* Header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-white transition hover:bg-slate-50"
            style={{ backgroundColor: ACCENT }}
          >
            <ChevronsLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-800">
              Edit Organization
            </h1>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-2 rounded-lg bg-[#eaf3f7] px-3 py-1.5 text-xs font-medium"
          style={{ color: ACCENT }}
        >
          <Pencil size={13} /> Editing
        </span>
      </header>

      <form onSubmit={save} noValidate>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-1">
          {GROUPS.map((group) => (
            <Card key={group.title} title={group.title} icon={group.icon}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {group.names.map((name) => renderField(name))}
              </div>
            </Card>
          ))}

          {extraNames.length > 0 && (
            <Card
              title="Additional Details"
              icon={Briefcase}
              className="xl:col-span-2"
            >
              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {extraNames.map((name) => renderField(name))}
              </div>
            </Card>
          )}
        </div>

        {/* Action bar */}
        <div className="mt-4 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[1.25rem] text-sm">
            {msg.text && (
              <p className={msg.bad ? "text-red-600" : "text-emerald-700"}>
                {msg.text}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link
              to={`/employer/organization-profile`}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || loadingMasters}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {saving ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
