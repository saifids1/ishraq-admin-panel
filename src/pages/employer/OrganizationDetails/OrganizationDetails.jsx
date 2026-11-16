import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronsLeft,
  Building2,
  ExternalLink,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getEmployerById, updateEmployer } from "../../../api/employerApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";
import StatusModal from "../../../components/common/StatusModal";
import { getCurrentUserId, getCurrentUserId2 } from "../../../utils/authUtils";
/* ---------------- Design tokens ---------------- */

const T = {
  radius: "rounded-lg",
  border: "border-[#e3e8ee]",
  bg: "bg-[#f4f8fb]",
  surface: "bg-white",
  text: "text-[#1a2b3c]",
  textMuted: "text-[#5b6b7c]",
  textFaint: "text-black",
  cardShadow: "shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
};

const val = (v) =>
  v === null || v === undefined || String(v).trim() === "" ? "—" : v;

const toYesNo = (v) => {
  if (v === true || v === 1 || v === "1" || v === "true") return "Yes";
  if (v === false || v === 0 || v === "0" || v === "false") return "No";
  return "—";
};

const FIELD_LABEL = `text-[13px] font-semibold tracking-wide ${T.textFaint}`;

const FIELD_BOX = (mono) =>
  `flex h-9 w-full min-w-0 items-center rounded-md border ${T.border} bg-[#fbfcfd] px-3 text-[13px] font-medium ${T.text} ${
    mono ? "font-mono text-[12.5px]" : ""
  }`;

const BTN_PRIMARY =
  "inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]";

const EDIT_INPUT =
  "h-9 w-full min-w-0 rounded-md border border-[#c9d5dd] bg-white px-3 text-[13px] text-[#1a2b3c] outline-none focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/20 disabled:bg-slate-100 disabled:text-slate-500";

const MOBILE_RE = /^\d{10}$/;

/* ---------------- Lookup key mappings (tolerant of API casing) ---------------- */

const INSTITUTE_ID_KEYS = [
  "iT_institute_type_id",
  "IT_institute_type_id",
  "id",
];
const INSTITUTE_NAME_KEYS = ["iT_name", "IT_name", "name"];
const COUNTRY_ID_KEYS = ["cM_Id", "CM_Id", "id"];
const COUNTRY_NAME_KEYS = [
  "cM_CountryName",
  "CM_CountryName",
  "countryName",
  "name",
];
const STATE_ID_KEYS = ["sM_Id", "SM_Id", "id"];
const STATE_NAME_KEYS = ["sM_StateName", "SM_StateName", "stateName", "name"];
const CITY_ID_KEYS = ["ctM_Id", "CTM_Id", "id"];
const CITY_NAME_KEYS = ["ctM_CityName", "CTM_CityName", "cityName", "name"];

/* ---------------- Card ---------------- */

function Card({ title, children }) {
  return (
    <section
      className={`${T.surface} ${T.radius} border ${T.border} ${T.cardShadow}`}
    >
      <div className="p-3 sm:p-4">
        {title && (
          <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
            {title}
          </h3>
        )}
        {children}
      </div>
    </section>
  );
}

const truthy = (v) => {
  if (v === true) return true;
  if (v === false || v === null || v === undefined) return false;
  if (typeof v === "number") return v === 1;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
};

const StatusBox = ({
  value,
  verified,
  mono = false,
  mailto = false,
  input,
}) => {
  const ok = truthy(verified);

  const badge = (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
        ok
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-amber-200"
      }`}
    >
      {ok ? (
        <CheckCircle2 size={12} strokeWidth={2.4} />
      ) : (
        <AlertTriangle size={12} strokeWidth={2.4} />
      )}
      {ok ? "Verified" : "Not verified"}
    </span>
  );

  if (input) {
    return (
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">{input}</div>
        {badge}
      </div>
    );
  }

  return (
    <div className={`${FIELD_BOX(mono)} justify-between gap-2`}>
      <span className="min-w-0 flex-1 truncate" title={String(val(value))}>
        {mailto && value ? (
          <a
            href={`mailto:${value}`}
            className="text-[#1e5a7a] hover:underline"
          >
            {value}
          </a>
        ) : (
          val(value)
        )}
      </span>
      {badge}
    </div>
  );
};

/* ---------------- FieldRow ----------------
   Pass children only for editable fields. Without children the field is
   read-only. The red * appears only while editing and only if required. */

const FieldRow = ({
  label,
  value,
  mono = false,
  required = false,
  children,
}) => {
  const isEditing = children !== undefined && children !== null;

  return (
    <div className="grid grid-cols-1 items-start gap-1 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center sm:gap-3">
      <label className={`${FIELD_LABEL} text-left`}>
        {label}
        {isEditing && required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {isEditing ? (
        <div className="min-w-0">{children}</div>
      ) : (
        <div className={FIELD_BOX(mono)}>
          <span className="min-w-0 flex-1 truncate" title={String(val(value))}>
            {val(value)}
          </span>
        </div>
      )}
    </div>
  );
};

/* ---------------- Tabs ---------------- */

const NAV = [{ id: "overview", label: "Overview", icon: Building2 }];

/* ---------------- Helpers ---------------- */

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

/** Normalize a lookup list into { id, name }, dropping malformed items. */
const normalizeLookup = (list, idKeys, nameKeys) =>
  (Array.isArray(list) ? list : [])
    .map((item) => ({
      id: idKeys.map((k) => item?.[k]).find((v) => v != null),
      name: nameKeys.map((k) => item?.[k]).find((v) => v != null),
    }))
    .filter((item) => item.id != null && item.name != null);

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message ||
  err?.response?.data?.Message ||
  err?.message ||
  fallback;

const parseDate = (value) => {
  if (value === null || value === undefined || String(value).trim() === "")
    return null;
  let s = String(value).trim();
  s = s.replace(/(\.\d{3})\d+/, "$1");
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateTime = (iso) => {
  const d = parseDate(iso);
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dd}-${mm}-${yyyy} ${timePart}`;
};

/** Build the editable draft from the employer record. */
const buildDraft = (emp) => ({
  mobile: emp?.mobile ?? "",
  eM_whatsapp_number: emp?.eM_whatsapp_number ?? "",
  fullName: emp?.fullName ?? "",
  organizationName: emp?.eM_organization_name ?? "",
  instituteTypeId: String(emp?.eM_institute_type_id ?? ""),
  contactPerson: emp?.eM_contact_person ?? "",
  designation: emp?.eM_designation ?? "",
  countryId: String(emp?.eM_country_id ?? ""),
  stateId: String(emp?.eM_state_id ?? ""),
  cityId: String(emp?.eM_city_id ?? ""),
  website: emp?.eM_website ?? "",
});

/* ---------------- Page ---------------- */

const EmployerProfile = () => {
  const navigate = useNavigate();

  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [draft, setDraft] = useState({});
  const [modal, setModal] = useState(null);

  const [instituteTypes, setInstituteTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

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

  /* Load the logged-in employer's own profile */
  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const json = await getEmployerById(getCurrentUserId());
        const record = json?.data ?? json;

        if (!record || typeof record !== "object" || Array.isArray(record)) {
          throw new Error("Employer profile not found.");
        }
        if (!cancelled) {
          setEmp(record);
          setDraft(buildDraft(record));
        }
      } catch (err) {
        if (!cancelled) {
          setEmp(null);
          setError(getErrorMessage(err, "Failed to load employer profile."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  /* Level 1: institute types and countries (edit mode only) */
  useEffect(() => {
    if (!isEditing) return undefined;
    let cancelled = false;

    const loadBaseLookups = async () => {
      setEditError("");
      try {
        const [instituteResponse, countryResponse] = await Promise.all([
          instituteTypeApi.getAllList(),
          countryMasterApi.getAllList(),
        ]);
        if (cancelled) return;
        setInstituteTypes(
          normalizeLookup(
            extractList(instituteResponse),
            INSTITUTE_ID_KEYS,
            INSTITUTE_NAME_KEYS,
          ),
        );
        setCountries(
          normalizeLookup(
            extractList(countryResponse),
            COUNTRY_ID_KEYS,
            COUNTRY_NAME_KEYS,
          ),
        );
      } catch (err) {
        if (!cancelled) {
          setEditError(
            getErrorMessage(err, "Unable to load profile edit options."),
          );
        }
      }
    };

    loadBaseLookups();
    return () => {
      cancelled = true;
    };
  }, [isEditing]);

  /* Level 2: states for the selected country */
  useEffect(() => {
    if (!isEditing || !draft.countryId) {
      setStates([]);
      setStatesLoading(false);
      return undefined;
    }
    let cancelled = false;
    setStates([]);
    setStatesLoading(true);

    stateMasterApi
      .getByCountry(Number(draft.countryId))
      .then((response) => {
        if (!cancelled) {
          setStates(
            normalizeLookup(
              extractList(response),
              STATE_ID_KEYS,
              STATE_NAME_KEYS,
            ),
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStates([]);
          setEditError(getErrorMessage(err, "Unable to load states."));
        }
      })
      .finally(() => {
        if (!cancelled) setStatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draft.countryId, isEditing]);

  /* Level 3: cities for the selected state */
  useEffect(() => {
    if (!isEditing || !draft.stateId) {
      setCities([]);
      setCitiesLoading(false);
      return undefined;
    }
    let cancelled = false;
    setCities([]);
    setCitiesLoading(true);

    cityMasterApi
      .getByState(Number(draft.stateId))
      .then((response) => {
        if (!cancelled) {
          setCities(
            normalizeLookup(
              extractList(response),
              CITY_ID_KEYS,
              CITY_NAME_KEYS,
            ),
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCities([]);
          setEditError(getErrorMessage(err, "Unable to load cities."));
        }
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draft.stateId, isEditing]);

  const updateDraft = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));

  /* Clears child selections when a parent changes so stale IDs are never saved */
  const onCountryChange = (value) =>
    setDraft((current) => ({
      ...current,
      countryId: value,
      stateId: "",
      cityId: "",
    }));

  const onStateChange = (value) =>
    setDraft((current) => ({
      ...current,
      stateId: value,
      cityId: "",
    }));

  const goToEditProfile = () => {
    setDraft(buildDraft(emp));
    setEditError("");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(buildDraft(emp));
    setEditError("");
    setIsEditing(false);
  };

  const saveProfile = async () => {
    if (
      !draft.organizationName.trim() ||
      !draft.instituteTypeId ||
      !draft.contactPerson.trim() ||
      !draft.designation.trim() ||
      !draft.mobile.trim() ||
      !draft.eM_whatsapp_number.trim() ||
      !draft.countryId ||
      !draft.stateId ||
      !draft.cityId
    ) {
      setEditError("Complete all required fields (marked *) before saving.");
      return;
    }

    if (!MOBILE_RE.test(draft.mobile.trim())) {
      setEditError("Mobile must be exactly 10 digits.");
      return;
    }

    if (!MOBILE_RE.test(draft.eM_whatsapp_number.trim())) {
      setEditError("WhatsApp number must be exactly 10 digits.");
      return;
    }

    /* Each selected value must exist in the list loaded for its parent.
       Skipped while a list is still loading, since it would be empty. */
    if (
      !instituteTypes.some((t) => String(t.id) === draft.instituteTypeId) ||
      !countries.some((c) => String(c.id) === draft.countryId) ||
      (!statesLoading && !states.some((s) => String(s.id) === draft.stateId)) ||
      (!citiesLoading && !cities.some((c) => String(c.id) === draft.cityId))
    ) {
      setEditError("Select valid organization and location options.");
      return;
    }

    const userId = Number(getCurrentUserId2());
    if (!Number.isInteger(userId) || userId <= 0) {
      setEditError(
        "Unable to identify the current user. Please sign in again.",
      );
      return;
    }

    const doSave = async () => {
      setSaving(true);
      setEditError("");

      try {
        // Employer ID, email, status, consent and the user log are read-only,
        // so they are not part of this payload. The backend takes the
        // updated-by user from the token.
        await updateEmployer(emp.eM_employer_id, {
          mobile: draft.mobile.trim(),
          fullName: draft.fullName.trim(),
          eM_whatsapp_number: draft.eM_whatsapp_number.trim(),
          eM_organization_name: draft.organizationName.trim(),
          eM_institute_type_id: Number(draft.instituteTypeId),
          eM_contact_person: draft.contactPerson.trim(),
          eM_designation: draft.designation.trim(),
          eM_country_id: Number(draft.countryId),
          eM_state_id: Number(draft.stateId),
          eM_city_id: Number(draft.cityId),
          eM_website: draft.website.trim(),
          eM_updated_by: userId,
        });

        setIsEditing(false);
        setRefreshKey((current) => current + 1);
      } catch (err) {
        setEditError(getErrorMessage(err, "Failed to update profile."));
      } finally {
        setSaving(false);
      }
    };

    openConfirm({
      title: "Confirm update",
      message: "Are you sure you want to update your profile?",
      confirmText: "Update",
      onConfirm: doSave,
    });
  };

  const pageTitle = emp?.eM_organization_name || "My Profile";

  const statePlaceholder = !draft.countryId
    ? "Select country first"
    : statesLoading
      ? "Loading states..."
      : "Select state";

  const cityPlaceholder = !draft.stateId
    ? "Select state first"
    : citiesLoading
      ? "Loading cities..."
      : "Select city";

  if (loading) {
    return (
      <div className={`min-h-full ${T.bg} p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-12 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#2f6b8a] border-t-transparent" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>
            Loading profile…
          </p>
        </div>
      </div>
    );
  }

  if (error || !emp) {
    return (
      <div className={`min-h-full ${T.bg} p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-12 text-center">
          <Building2 size={28} className="mx-auto text-[#8895a4]" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>
            {error || "Profile not found"}
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={`mt-4 ${BTN_PRIMARY}`}
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const active = emp.eM_is_active === true;

  return (
    <div className={`min-h-full ${T.bg}`}>
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* HEADER: back, org name, employer ID, actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                title="Back"
                aria-label="Back"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f]"
              >
                <ChevronsLeft size={18} strokeWidth={2} />
              </button>

              <h2 className="min-w-0 truncate font-semibold text-slate-800">
                {pageTitle}
              </h2>

              {/* <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md bg-slate-100 px-2 text-[12px] text-slate-600 ring-1 ring-inset ring-slate-200">
                <span className="font-semibold text-slate-500">Employer ID</span>
                <span className="font-mono font-semibold text-[#1a2b3c]">
                  {val(emp.eM_request_no)}
                </span>
              </span> */}
            </div>

            <h2 className="min-w-0 truncate font-semibold text-slate-800">
              {val(emp.eM_request_no)}
            </h2>

            <div className="flex shrink-0 items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
                  >
                    <X size={15} /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={saving}
                    className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={goToEditProfile}
                  className={BTN_PRIMARY}
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          {editError && (
            <div
              role="alert"
              className="mx-3 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 sm:mx-6 sm:mt-4"
            >
              {editError}
            </div>
          )}

          {/* HORIZONTAL TABS */}
          <nav
            aria-label="Profile sections"
            className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 sm:px-4"
          >
            {NAV.map((n) => {
              const on = tab === n.id;
              const Icon = n.icon;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setTab(n.id)}
                  aria-current={on ? "page" : undefined}
                  className={`group -mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[13px] font-semibold whitespace-nowrap transition ${
                    on
                      ? "border-[#2f6b8a] text-[#1e5a7a]"
                      : "border-transparent text-[#5b6b7c] hover:border-[#c9d5dd] hover:text-[#1a2b3c]"
                  }`}
                >
                  <Icon
                    size={15}
                    className={
                      on
                        ? "text-[#1e5a7a]"
                        : "text-[#8895a4] group-hover:text-[#5b6b7c]"
                    }
                  />
                  {n.label}
                </button>
              );
            })}
          </nav>

          {/* CONTENT */}
          <main className="min-w-0 bg-white p-3 sm:p-4">
            {tab === "overview" && (
              <div className="space-y-4 sm:space-y-6">
                {/* Organization Details */}
                <Card title="Organization Details">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                    <FieldRow
                      label="Organization Name"
                      value={emp.eM_organization_name}
                      required
                    >
                      {isEditing ? (
                        <input
                          className={EDIT_INPUT}
                          value={draft.organizationName ?? ""}
                          onChange={(e) =>
                            updateDraft("organizationName", e.target.value)
                          }
                        />
                      ) : undefined}
                    </FieldRow>

                    <FieldRow
                      label="Organization Type"
                      value={emp.instituteTypeName}
                      required
                    >
                      {isEditing ? (
                        <select
                          className={EDIT_INPUT}
                          value={draft.instituteTypeId ?? ""}
                          onChange={(e) =>
                            updateDraft("instituteTypeId", e.target.value)
                          }
                        >
                          <option value="">Select organization type</option>
                          {instituteTypes.map((type) => (
                            <option key={type.id} value={String(type.id)}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      ) : undefined}
                    </FieldRow>

                    <FieldRow label="Website">
                      {isEditing ? (
                        <input
                          className={EDIT_INPUT}
                          value={draft.website ?? ""}
                          onChange={(e) =>
                            updateDraft("website", e.target.value)
                          }
                        />
                      ) : (
                        <div className={FIELD_BOX(false)}>
                          {emp.eM_website ? (
                            <a
                              href={
                                /^https?:\/\//i.test(emp.eM_website)
                                  ? emp.eM_website
                                  : `https://${emp.eM_website}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              title={emp.eM_website}
                              className="inline-flex min-w-0 flex-1 items-center gap-1 truncate text-[#1e5a7a] hover:underline"
                            >
                              <span className="min-w-0 truncate">
                                {emp.eM_website}
                              </span>
                              <ExternalLink size={11} className="shrink-0" />
                            </a>
                          ) : (
                            <span className="min-w-0 flex-1 truncate">—</span>
                          )}
                        </div>
                      )}
                    </FieldRow>

                    {/* Read-only */}
                    <FieldRow label="Email Address">
                      <StatusBox
                        value={emp.userName}
                        mailto
                        verified={emp.isEmailVerified}
                      />
                    </FieldRow>
                    <FieldRow
                      label="Status"
                      value={active ? "Active" : "Inactive"}
                    />
                    <FieldRow
                      label="Consent Given"
                      value={toYesNo(emp.eM_consent_given)}
                    />
                    <FieldRow
                      label="Consent At"
                      value={formatDateTime(emp.eM_consent_at)}
                    />
                  </div>
                </Card>

                {/* Contact Person */}
                <Card title="Contact Person">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                    <FieldRow
                      label="Contact Person"
                      value={emp.eM_contact_person}
                      required
                    >
                      {isEditing ? (
                        <input
                          className={EDIT_INPUT}
                          value={draft.contactPerson ?? ""}
                          onChange={(e) =>
                            updateDraft("contactPerson", e.target.value)
                          }
                        />
                      ) : undefined}
                    </FieldRow>

                    <FieldRow
                      label="Designation"
                      value={emp.eM_designation}
                      required
                    >
                      {isEditing ? (
                        <input
                          className={EDIT_INPUT}
                          value={draft.designation ?? ""}
                          onChange={(e) =>
                            updateDraft("designation", e.target.value)
                          }
                        />
                      ) : undefined}
                    </FieldRow>

                    <FieldRow label="Mobile Number" mono required={isEditing}>
                      <StatusBox
                        value={emp.mobile}
                        mono
                        verified={emp.isNumberVerified}
                        input={
                          isEditing ? (
                            <input
                              className={EDIT_INPUT}
                              value={draft.mobile ?? ""}
                              inputMode="numeric"
                              onChange={(e) =>
                                updateDraft(
                                  "mobile",
                                  e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 10),
                                )
                              }
                            />
                          ) : undefined
                        }
                      />
                    </FieldRow>

                    <FieldRow
                      label="WhatsApp Number"
                      value={emp.eM_whatsapp_number}
                      mono
                      required
                    >
                      {isEditing ? (
                        <input
                          className={EDIT_INPUT}
                          value={draft.eM_whatsapp_number ?? ""}
                          inputMode="numeric"
                          onChange={(e) =>
                            updateDraft(
                              "eM_whatsapp_number",
                              e.target.value.replace(/\D/g, "").slice(0, 10),
                            )
                          }
                        />
                      ) : undefined}
                    </FieldRow>
                  </div>
                </Card>

                {/* Location */}
                <Card title="Location">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                    <FieldRow label="Country" value={emp.countryName} required>
                      {isEditing ? (
                        <select
                          className={EDIT_INPUT}
                          value={draft.countryId ?? ""}
                          onChange={(e) => onCountryChange(e.target.value)}
                        >
                          <option value="">Select country</option>
                          {countries.map((country) => (
                            <option key={country.id} value={String(country.id)}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      ) : undefined}
                    </FieldRow>

                    <FieldRow label="State" value={emp.stateName} required>
                      {isEditing ? (
                        <select
                          className={EDIT_INPUT}
                          value={draft.stateId ?? ""}
                          disabled={!draft.countryId || statesLoading}
                          onChange={(e) => onStateChange(e.target.value)}
                        >
                          <option value="">{statePlaceholder}</option>
                          {states.map((state) => (
                            <option key={state.id} value={String(state.id)}>
                              {state.name}
                            </option>
                          ))}
                        </select>
                      ) : undefined}
                    </FieldRow>

                    <FieldRow label="City" value={emp.cityName} required>
                      {isEditing ? (
                        <select
                          className={EDIT_INPUT}
                          value={draft.cityId ?? ""}
                          disabled={!draft.stateId || citiesLoading}
                          onChange={(e) =>
                            updateDraft("cityId", e.target.value)
                          }
                        >
                          <option value="">{cityPlaceholder}</option>
                          {cities.map((city) => (
                            <option key={city.id} value={String(city.id)}>
                              {city.name}
                            </option>
                          ))}
                        </select>
                      ) : undefined}
                    </FieldRow>
                  </div>
                </Card>

                {/* User Log (read-only) */}
                <Card title="User Log">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                    <FieldRow
                      label="Created At"
                      value={formatDateTime(emp.eM_created_at)}
                    />
                    <FieldRow
                      label="Created By"
                      value={val(emp.createdByName)}
                    />
                    <FieldRow
                      label="Updated At"
                      value={formatDateTime(emp.eM_updated_at)}
                    />
                    <FieldRow
                      label="Updated By"
                      value={val(emp.updatedByName)}
                    />
                  </div>
                </Card>
              </div>
            )}
          </main>
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

export default EmployerProfile;
