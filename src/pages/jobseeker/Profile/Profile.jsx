import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText as FileIcon,
  ChevronsLeft,
  Download,
  Eye,
  GraduationCap,
  Inbox,
  UserRound,
  Building2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import jobseekerApi from "../../../api/Services/adjobseekerApi";
import jobCategoryApi from "../../../api/Services/jobCategoryApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import jobRoleApi from "../../../api/Services/jobRoleApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";
import { getCurrentUserId2, getCurrentUserId } from "../../../utils/authUtils";

/* ---------------- Design tokens (match EmployerProfile) ---------------- */
const T = {
  radius: "rounded-lg",
  border: "border-[#e3e8ee]",
  bg: "bg-[#f4f8fb]",
  surface: "bg-white",
  text: "text-[#1a2b3c]",
  textMuted: "text-[#5b6b7c]",
  textFaint: "text-black",
};

const SECTION_CARD = `${T.surface} ${T.radius} border ${T.border} shadow-[0_1px_2px_rgba(16,24,40,0.04)]`;
const SECTION_BODY = "p-3 sm:p-4";
const SECTION_TITLE =
  "mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]";
// Two columns only on wide screens; the sidebar takes space below xl.
const FIELD_GRID_2 = "grid grid-cols-1 gap-x-6 gap-y-3 xl:grid-cols-2";
// Label above input on phones, label beside input from sm up.
const FIELD_GRID =
  "grid grid-cols-1 gap-1 sm:grid-cols-[160px_1fr] sm:items-center sm:gap-3";

const val = (v) => (v && String(v).trim() ? v : "—");

/** Tolerant Yes/No/— mapper for boolean-ish API fields */
const toYesNo = (v) => {
  if (v === true || v === 1 || v === "1" || v === "true") return "Yes";
  if (v === false || v === 0 || v === "0" || v === "false") return "No";
  return "—";
};
const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  ["true", "1", "yes"].includes(String(value).toLowerCase());

/** Tolerant boolean check (true/1/"true"/"yes" → true) */
const truthy = (v) => {
  if (v === true) return true;
  if (v === false || v === null || v === undefined) return false;
  if (typeof v === "number") return v === 1;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
};

const FIELD_LABEL = `text-[13px] font-semibold tracking-wide ${T.textFaint}`;
const FIELD_BOX = (mono) =>
  `flex h-9 w-full items-center rounded-md border ${T.border} bg-[#fbfcfd] px-3 text-[13px] font-medium ${T.text} ${
    mono ? "font-mono text-[12.5px]" : ""
  }`;

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]";
// 16px on mobile prevents iOS from zooming when an input is focused.
const EDIT_INPUT =
  "h-9 w-full rounded-md border border-[#c9d5dd] bg-white px-3 text-base text-[#1a2b3c] outline-none focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/20 sm:text-[13px]";

const NAV = [
  { id: "overview", label: "Overview", icon: UserRound },
  { id: "employment", label: "Current Employment", icon: Building2 },
  { id: "preferences", label: "Job Preferences", icon: SlidersHorizontal },
  { id: "upskilling", label: "Upskilling", icon: GraduationCap },
  { id: "resume", label: "Documents", icon: FileIcon },
  // { id: "jobs", label: "Applied Jobs", icon: Briefcase },
];

/* ---------------- Lookup key mappings (tolerant of API casing) ---------------- */
const INSTITUTE_ID_KEYS = ["iT_institute_type_id", "IT_institute_type_id", "id"];
const INSTITUTE_NAME_KEYS = ["iT_name", "IT_name", "name"];
const COUNTRY_ID_KEYS = ["cM_Id", "CM_Id", "id"];
const COUNTRY_NAME_KEYS = ["cM_CountryName", "CM_CountryName", "countryName", "name"];
const STATE_ID_KEYS = ["sM_Id", "SM_Id", "id"];
const STATE_NAME_KEYS = ["sM_StateName", "SM_StateName", "stateName", "name"];
const CITY_ID_KEYS = ["ctM_Id", "CTM_Id", "id"];
const CITY_NAME_KEYS = ["ctM_CityName", "CTM_CityName", "cityName", "name"];
const JOB_CATEGORY_ID_KEYS = ["jC_job_category_id", "JC_job_category_id", "id"];
const JOB_CATEGORY_NAME_KEYS = ["jC_name", "JC_name", "name"];
const JOB_ROLE_ID_KEYS = ["jR_job_role_id", "JR_job_role_id", "id"];
const JOB_ROLE_NAME_KEYS = ["jR_name", "JR_name", "name"];

/* ---------------- Reusable row: label : input ---------------- */
const FieldRow = ({ label, value, mono = false, children }) => (
  <div className={FIELD_GRID}>
    <label className={FIELD_LABEL}>{label}</label>
    {children ? (
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

/* ---------------- API URL Configuration ---------------- */
const DOCUMENT_BASE_URL = (
  process.env.REACT_APP_DOCUMENT_BASE_URL || ""
).trim();

const toAbsoluteUrl = (url) => {
  if (!url) return url;

  const raw = String(url).trim();

  if (/^https?:\/\//i.test(raw)) return raw;

  let clean = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  clean = clean.replace(/^wwwroot\//i, "");
  clean = clean.replace(/^api\//i, "");
  clean = clean.replace(/^\/+/, "");

  if (!DOCUMENT_BASE_URL) return `/${clean}`;

  return `${DOCUMENT_BASE_URL.replace(/\/+$/, "")}/${clean}`;
};

/* ---------------- Date parsing helpers ---------------- */

/**
 * Parse a date string safely.
 * - Trims fractional seconds to max 3 digits (V8 handles 7, Safari may not).
 * - Parses bare "YYYY-MM-DD" as local date (avoids UTC off-by-one).
 */
const parseDate = (value) => {
  if (value === null || value === undefined || String(value).trim() === "")
    return null;
  let s = String(value).trim();
  s = s.replace(/(\.\d{3})\d+/, "$1");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

// "22-10-2026"
const formatDate = (value) => {
  const d = parseDate(value);
  if (!d) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// "22-10-2026 11:08 AM"
const formatDateTime = (value) => {
  const d = parseDate(value);
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

const formatUser = (v) =>
  v === null || v === undefined || String(v).trim() === "" ? "—" : String(v);

/* ---------------- Data helpers ---------------- */
const EMPTY_FORM = {
  fullName: "",
  mobile: "",
  whatsapp: "",
  email: "",
  instituteTypeId: "",
  jobCategoryId: "",
  jobRoleId: "",
  countryId: "",
  stateId: "",
  cityId: "",
  preferredLocationId: "",
  jobType: "",
  jobCategory: "",
  jobRole: "",
  highestQualification: "",
  speciality: "",
  professionalRegistrationNumber: "",
  totalExperience: "",
  currentDesignation: "",
  address: "",
  currentCountry: "",
  currentState: "",
  currentCity: "",
  expectedSalary: "",
  currentEmployment: "",
  isCurrentlyEmployed: "",
  currentSalary: "",
  preferredCountry: "",
  preferredState: "",
  preferredCity: "",
  preferredJobLocation: "",
  willingToRelocate: "",
  employmentPreference: "",
  availabilityToJoin: "",
  resume: null,
  consentGiven: "",
  upskillingYesNo: "",
  upskillingDetails: "",
  interested: "",
  // ---------- AUDIT ----------
  jobseekerNo: "",
  createdAt: "",
  createdBy: "",
  CreatedByName: "",
  updatedAt: "",
  updatedBy: "",
  UpdatedByName: "",
  activatedAt: "",
  activatedBy: "",
  consentAt: "",
};

const extractRecord = (response) => {
  const root = response?.data ?? response;
  const record = root?.data ?? root?.Data ?? root;
  return record && typeof record === "object" && !Array.isArray(record)
    ? record
    : null;
};

/**
 * Extract an array from a variety of API envelopes:
 *   [ ... ]  |  { data: [...] }  |  { Data: [...] }  |  { data: { data: [...] } }
 */
const extractList = (response) => {
  const root = response?.data ?? response;
  const list = root?.data ?? root?.Data ?? root;
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.data)) return list.data;
  if (Array.isArray(list?.Data)) return list.Data;
  return [];
};

/**
 * Normalize a lookup list into `{ id, name }` objects so selects never crash
 * on malformed API items.
 */
const normalizeLookup = (list, idKeys, nameKeys) =>
  (Array.isArray(list) ? list : [])
    .map((item) => ({
      id: idKeys.map((k) => item?.[k]).find((v) => v != null),
      name: nameKeys.map((k) => item?.[k]).find((v) => v != null),
    }))
    .filter((item) => item.id != null && item.name != null);

/**
 * Map the GET /jobseeker/:id response (jB_* fields) into the view model.
 */
const toJobseekerView = (item, id) => {
  const active = truthy(item?.jB_is_active);

  return {
    id: item?.jB_jobseeker_id ?? id,
    status: active ? "Active" : "Inactive",
    ...EMPTY_FORM,

    fullName: item?.fullName ?? "",
    mobile: item?.mobile ?? "",
    whatsapp: item?.jB_whatsapp ?? "",
    email: item?.email ?? "",
    instituteTypeId: String(item?.jB_institute_type_id ?? ""),
    jobCategoryId: String(item?.jB_job_category_id ?? ""),
    jobRoleId: String(item?.jB_job_role_id ?? ""),
    countryId: String(item?.jB_country_id ?? ""),
    stateId: String(item?.jB_state_id ?? ""),
    cityId: String(item?.jB_city_id ?? ""),
    preferredLocationId: String(item?.jB_preferred_location ?? ""),

    jobType: item?.instituteTypeName ?? "",
    jobCategory: item?.jobCategoryName ?? "",
    jobRole: item?.jobRoleName ?? "",

    highestQualification: item?.jB_highest_qualification ?? "-",
    speciality: item?.jB_speciality ?? "",
    professionalRegistrationNumber: item?.jB_registration_number ?? "",
    totalExperience: item?.jB_total_experience ?? "",
    currentDesignation: item?.jB_current_designation ?? "",
    consentGiven: toYesNo(item?.jB_consent_given),
    upskillingYesNo: toYesNo(item?.jB_upskilling_yes_no),
    upskillingDetails: item?.jB_upskilling_details ?? "",
    interested: toYesNo(item?.jB_are_intrested),

    currentCountry: item?.countryName ?? "",
    currentState: item?.stateName ?? "",
    currentCity: item?.cityName ?? "",
    address: "", // not returned by this API

    currentEmployment: item?.jB_current_employer ?? "",
    isCurrentlyEmployed: "", // not returned by this API
    currentSalary: item?.jB_current_salary ?? "",

    expectedSalary: item?.jB_expected_salary ?? "",
    preferredCountry: "", // not returned by this API
    preferredState: "", // not returned by this API
    preferredCity: item?.jB_preferred_locationName ?? "",
    preferredJobLocation: item?.jB_preferred_locationName ?? "",
    willingToRelocate: toYesNo(item?.jB_willing_to_relocate),
    employmentPreference: "", // not returned by this API
    availabilityToJoin: item?.jB_availability_to_join ?? "",

    // ---------- AUDIT ----------
    jobseekerNo: item?.jB_jobseeker_no ?? "",
    createdAt: item?.jB_created_at ?? "",
    createdBy: item?.jB_created_by ?? "",
    CreatedByName: item?.createdByName ?? "",
    updatedAt: item?.jB_updated_at ?? "",
    updatedBy: item?.jB_updated_by ?? "",
    UpdatedByName: item?.updatedByName ?? "",
    activatedAt: item?.jB_activated_at ?? "",
    activatedBy: item?.jB_activated_by ?? "",
    consentAt: item?.jB_consent_at ?? "",

    resume: item?.jB_cv_file_path
      ? {
          name: String(item.jB_cv_file_path).split(/[\\/]/).pop(),
          url: toAbsoluteUrl(item.jB_cv_file_path),
        }
      : null,
  };
};

/* ---------------- Applied jobs helpers ---------------- */
const text = (value) => (hasValue(value) ? String(value).trim() : "-");

/* ---------------- Documents tab helper ---------------- */
const DocumentBox = ({ doc }) => {
  if (!doc) {
    return (
      <div className="rounded-md border border-dashed border-[#cfd9e2] bg-[#fbfcfd] px-3 py-3 text-[12.5px] font-medium text-[#8895a4]">
        Not uploaded
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#e3e8ee] bg-[#fbfcfd] p-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm">
          <FileIcon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[13px] font-semibold text-[#1a2b3c]"
            title={doc.name || "Resume / CV"}
          >
            {doc.name || "Resume / CV"}
          </p>
          <p className="text-[11.5px] text-[#8895a4]">Resume / CV</p>
        </div>
      </div>

      {doc.url ? (
        <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50 sm:h-8"
          >
            <Eye size={13} /> View
          </a>
          <a
            href={doc.url}
            download
            className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50 sm:h-8"
          >
            <Download size={13} /> Download
          </a>
        </div>
      ) : (
        <p className="mt-2 rounded-md bg-white px-2.5 py-1.5 text-[11.5px] text-[#8895a4] ring-1 ring-[#e3e8ee]">
          File name saved. No download link available yet.
        </p>
      )}
    </div>
  );
};

/* ---------------- Page ---------------- */
const JobSeekerDetails = ({ mode }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(mode === "edit");
  const [draft, setDraft] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [instituteTypes, setInstituteTypes] = useState([]);
  const [jobCategories, setJobCategories] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [uploadFile, setUploadFile] = useState(null);

  /* Applied jobs state (tab currently hidden) */
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);

  const userId = getCurrentUserId();

  useEffect(() => {
    setIsEditing(mode === "edit");
  }, [mode]);

  /* Load the jobseeker record. Seed both form and draft so the
     /edit route starts with the saved country, state, and city IDs. */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await jobseekerApi.getById(userId);
        const item = extractRecord(response);
        if (!cancelled) {
          if (item) {
            const view = toJobseekerView(item, userId);
            setUser(view);
            setForm({ ...EMPTY_FORM, ...view });
            setDraft({ ...EMPTY_FORM, ...view });
          } else {
            setUser(null);
            setError("Jobseeker not found");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setUser(null);
          setError(err?.message || "Failed to load jobseeker");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (userId) load();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  /* Level 1: institute types and countries (edit mode only) */
  useEffect(() => {
    if (!isEditing) return undefined;
    let cancelled = false;

    const loadBaseLookups = async () => {
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
            err?.response?.data?.message ||
              err?.message ||
              "Unable to load jobseeker edit options.",
          );
        }
      }
    };

    loadBaseLookups();
    return () => {
      cancelled = true;
    };
  }, [isEditing]);

  /* Level 2: states for the selected country (GET /StateMaster/all?countryId=) */
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
          setEditError(
            err?.response?.data?.message ||
              err?.message ||
              "Unable to load states.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setStatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draft.countryId, isEditing]);

  /* Level 3: cities for the selected state (GET /CityMaster/all?stateId=) */
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
          setEditError(
            err?.response?.data?.message ||
              err?.message ||
              "Unable to load cities.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draft.stateId, isEditing]);

  /* Job category depends on institute type */
  useEffect(() => {
    if (!isEditing || !draft.instituteTypeId) {
      setJobCategories([]);
      return undefined;
    }
    let cancelled = false;
    jobCategoryApi
      .getByInstituteType(Number(draft.instituteTypeId))
      .then((response) => {
        if (!cancelled) {
          setJobCategories(
            normalizeLookup(
              extractList(response),
              JOB_CATEGORY_ID_KEYS,
              JOB_CATEGORY_NAME_KEYS,
            ),
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEditError(
            err?.response?.data?.message ||
              err?.message ||
              "Unable to load job categories.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draft.instituteTypeId, isEditing]);

  /* Job role depends on job category */
  useEffect(() => {
    if (!isEditing || !draft.jobCategoryId) {
      setJobRoles([]);
      return undefined;
    }
    let cancelled = false;
    jobRoleApi
      .getByJobCategory(Number(draft.jobCategoryId))
      .then((response) => {
        if (!cancelled) {
          setJobRoles(
            normalizeLookup(
              extractList(response),
              JOB_ROLE_ID_KEYS,
              JOB_ROLE_NAME_KEYS,
            ),
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEditError(
            err?.response?.data?.message ||
              err?.message ||
              "Unable to load job roles.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draft.jobCategoryId, isEditing]);

  const updateDraft = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));

  /* Navigation and edit helpers */
  const goToEditProfile = () => {
    setDraft({ ...form });
    setUploadFile(null);
    setEditError("");
    setSuccessMessage("");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft({ ...form });
    setUploadFile(null);
    setEditError("");
    setIsEditing(false);
    if (mode === "edit") {
      navigate(`/jobseeker/profile`, { replace: true });
    }
  };

  const saveJobseeker = async () => {
    const currentUserId = Number(getCurrentUserId2());
    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      setEditError(
        "Unable to identify the current user. Please sign in again.",
      );
      return;
    }
    if (!draft.fullName.trim() || !draft.mobile.trim() || !draft.email.trim()) {
      setEditError("Full name, mobile number, and email are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      setEditError("Enter a valid email address.");
      return;
    }
    if (
      !draft.instituteTypeId ||
      !draft.jobCategoryId ||
      !draft.jobRoleId ||
      !draft.countryId ||
      !draft.stateId ||
      !draft.cityId
    ) {
      setEditError(
        "Select valid institute, profession, role, and location values.",
      );
      return;
    }

    setSaving(true);
    setEditError("");
    setSuccessMessage("");
    try {
      const payload = {
        JB_jobseeker_id: Number(userId),
        JB_full_name: draft.fullName.trim(),
        Email: draft.email.trim(),
        JB_mobile: draft.mobile.replace(/\D/g, ""),
        JB_whatsapp: (draft.whatsapp || draft.mobile).replace(/\D/g, ""),
        JB_city_id: Number(draft.cityId),
        JB_state_id: Number(draft.stateId),
        JB_country_id: Number(draft.countryId),
        JB_institute_type_id: Number(draft.instituteTypeId),
        JB_job_category_id: Number(draft.jobCategoryId),
        JB_job_role_id: Number(draft.jobRoleId),
        JB_highest_qualification: draft.highestQualification.trim(),
        JB_speciality: draft.speciality.trim(),
        JB_registration_number: draft.professionalRegistrationNumber.trim(),
        JB_total_experience: Number(draft.totalExperience) || 0,
        JB_current_designation: draft.currentDesignation.trim(),
        JB_current_employer: draft.currentEmployment.trim(),
        JB_current_salary: Number(draft.currentSalary) || 0,
        JB_expected_salary: Number(draft.expectedSalary) || 0,
        JB_preferred_location:
          Number(draft.preferredLocationId) || Number(draft.cityId),
        JB_willing_to_relocate: toBoolean(draft.willingToRelocate),
        JB_availability_to_join: draft.availabilityToJoin
          ? `${draft.availabilityToJoin}T00:00:00`
          : "",
        JB_consent_given: toBoolean(draft.consentGiven),
        JB_updated_by: currentUserId,
        jB_updated_by: currentUserId,
        JB_upskilling_yes_no: toBoolean(draft.upskillingYesNo),
        JB_upskilling_details: toBoolean(draft.upskillingYesNo)
          ? draft.upskillingDetails.trim()
          : "",
        JB_are_intrested: toBoolean(draft.interested),
      };
      const createdBy = Number(form.createdBy);
      if (Number.isInteger(createdBy) && createdBy > 0) {
        payload.JB_created_by = createdBy;
        payload.jB_created_by = createdBy;
      }

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      if (uploadFile) {
        formData.append("CVFile", uploadFile, uploadFile.name);
      }

      await jobseekerApi.update(userId, formData);
      setIsEditing(false);
      setUploadFile(null);
      setSuccessMessage("Jobseeker updated successfully.");
      setRefreshKey((current) => current + 1);
      if (mode === "edit") {
        navigate(`/jobseeker/profile`, { replace: true });
      }
    } catch (err) {
      setEditError(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          "Failed to update jobseeker.",
      );
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = form.fullName || "Jobseeker";

  const editInput = (key, type = "text") =>
    isEditing ? (
      <input
        type={type}
        className={EDIT_INPUT}
        value={draft[key] ?? ""}
        onChange={(event) => updateDraft(key, event.target.value)}
      />
    ) : undefined;

  const editSelect = (key, options, placeholder, onChange) =>
    isEditing ? (
      <select
        className={EDIT_INPUT}
        value={draft[key] ?? ""}
        onChange={(event) =>
          onChange
            ? onChange(event.target.value)
            : updateDraft(key, event.target.value)
        }
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={String(option.id)}>
            {option.name}
          </option>
        ))}
      </select>
    ) : undefined;

  const yesNoSelect = (key) =>
    isEditing ? (
      <select
        className={EDIT_INPUT}
        value={toBoolean(draft[key]) ? "true" : "false"}
        onChange={(event) => updateDraft(key, event.target.value === "true")}
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    ) : undefined;

  /* Placeholders for the chained selects */
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

  /* Loading */
  if (loading) {
    return (
      <div className={`min-h-full ${T.bg} p-3 sm:p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-8 text-center sm:p-12">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#2f6b8a] border-t-transparent" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>
            Loading jobseeker…
          </p>
        </div>
      </div>
    );
  }

  /* Error / Not found */
  if (error || !user) {
    return (
      <div className={`min-h-full ${T.bg} p-3 sm:p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-8 text-center sm:p-12">
          <UserRound size={28} className="mx-auto text-[#8895a4]" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>
            {error || "Jobseeker not found"}
          </p>
          <p className={`mt-1 text-[13px] ${T.textMuted}`}>
            The record you're looking for doesn't exist or was removed.
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

  const active = user.status === "Active";

  return (
    <div className={`min-h-full ${T.bg}`}>
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* MAIN HEADER */}
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                title="Back"
                aria-label="Back"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f]"
              >
                <ChevronsLeft size={18} strokeWidth={2} />
              </button>

              <h2 className="truncate font-semibold text-slate-800">
                {pageTitle}
              </h2>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60 sm:flex-none"
                  >
                    <X size={15} /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveJobseeker}
                    disabled={saving}
                    className={`${BTN_PRIMARY} flex-1 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none`}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={goToEditProfile}
                  className={`${BTN_PRIMARY} w-full sm:w-auto`}
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          {(editError || successMessage) && (
            <div
              role={editError ? "alert" : "status"}
              className={`mx-3 mt-3 rounded-lg border px-4 py-2.5 text-sm sm:mx-6 sm:mt-4 ${
                editError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {editError || successMessage}
            </div>
          )}

          {/* BODY */}
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr]">
              {/* SECTION NAV: horizontal scroll below lg, vertical list at lg+ */}
              <aside className="min-w-0 lg:sticky lg:top-4 lg:h-fit lg:w-[11rem]">
                <nav
                  aria-label="Jobseeker sections"
                  className={`${SECTION_CARD} flex gap-1 overflow-x-auto p-1.5 lg:block lg:overflow-hidden`}
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
                        className={`group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-[13px] font-semibold transition lg:w-full ${
                          on
                            ? "bg-[#eaf2f7] text-[#1e5a7a]"
                            : "text-[#5b6b7c] hover:bg-[#f3f6f9] hover:text-[#1a2b3c]"
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
              </aside>

              {/* DETAIL PANEL */}
              <main className="min-w-0">
                {/* -------- Overview -------- */}
                {tab === "overview" && (
                  <section className="space-y-4 sm:space-y-6">
                    {/* Personal / Professional details */}
                    <div className={SECTION_CARD}>
                      <div className={SECTION_BODY}>
                        <h3 className={SECTION_TITLE}>
                          Personal & Professional Details
                        </h3>
                        <div className={FIELD_GRID_2}>
                          <FieldRow label="Jobseeker ID" value={form.jobseekerNo} />

                          <FieldRow label="Full Name" value={form.fullName}>
                            {editInput("fullName")}
                          </FieldRow>
                          <FieldRow label="Mobile Number" value={form.mobile} mono>
                            {editInput("mobile", "tel")}
                          </FieldRow>
                          <FieldRow label="WhatsApp Number" value={form.whatsapp} mono>
                            {editInput("whatsapp", "tel")}
                          </FieldRow>

                          <div className={FIELD_GRID}>
                            <label className={FIELD_LABEL}>Email Address</label>
                            {isEditing ? (
                              editInput("email", "email")
                            ) : (
                              <div className={FIELD_BOX()}>
                                <span className="min-w-0 flex-1 truncate">
                                  {form.email ? (
                                    <a
                                      href={`mailto:${form.email}`}
                                      className="inline-flex items-center gap-1 text-[#1e5a7a] hover:underline"
                                    >
                                      {form.email}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </span>
                              </div>
                            )}
                          </div>

                          <FieldRow label="Institute Type" value={form.jobType}>
                            {editSelect(
                              "instituteTypeId",
                              instituteTypes,
                              "Select institute type",
                              (value) => {
                                updateDraft("instituteTypeId", value);
                                updateDraft("jobCategoryId", "");
                                updateDraft("jobRoleId", "");
                              },
                            )}
                          </FieldRow>
                          <FieldRow label="Job Category" value={form.jobCategory}>
                            {editSelect(
                              "jobCategoryId",
                              jobCategories,
                              "Select profession",
                              (value) => {
                                updateDraft("jobCategoryId", value);
                                updateDraft("jobRoleId", "");
                              },
                            )}
                          </FieldRow>
                          <FieldRow label="Role" value={form.jobRole}>
                            {editSelect("jobRoleId", jobRoles, "Select role")}
                          </FieldRow>
                          <FieldRow
                            label="Highest Qualification"
                            value={form.highestQualification}
                          >
                            {editInput("highestQualification")}
                          </FieldRow>
                          <FieldRow
                            label="Speciality / Department"
                            value={form.speciality}
                          >
                            {editInput("speciality")}
                          </FieldRow>
                          <FieldRow
                            label="Professional Reg. No."
                            value={form.professionalRegistrationNumber}
                            mono
                          >
                            {editInput("professionalRegistrationNumber")}
                          </FieldRow>
                          <FieldRow
                            label="Total Experience (Years)"
                            value={form.totalExperience}
                          >
                            {editInput("totalExperience", "number")}
                          </FieldRow>
                          <FieldRow
                            label="Current Designation"
                            value={form.currentDesignation}
                          >
                            {editInput("currentDesignation")}
                          </FieldRow>
                          <FieldRow
                            label="Status"
                            value={active ? "Active" : "Inactive"}
                          />
                          <FieldRow label="Consent Given" value={form.consentGiven}>
                            {yesNoSelect("consentGiven")}
                          </FieldRow>
                        </div>
                      </div>
                    </div>

                    {/* Current Location: Country → State → City */}
                    <div className={SECTION_CARD}>
                      <div className={SECTION_BODY}>
                        <h3 className={SECTION_TITLE}>Current Location</h3>
                        <div className={FIELD_GRID_2}>
                          <FieldRow label="Country" value={form.currentCountry}>
                            {editSelect(
                              "countryId",
                              countries,
                              "Select country",
                              (value) => {
                                updateDraft("countryId", value);
                                updateDraft("stateId", "");
                                updateDraft("cityId", "");
                                updateDraft("preferredLocationId", "");
                              },
                            )}
                          </FieldRow>
                          <FieldRow label="State" value={form.currentState}>
                            {editSelect(
                              "stateId",
                              states,
                              statePlaceholder,
                              (value) => {
                                updateDraft("stateId", value);
                                updateDraft("cityId", "");
                                updateDraft("preferredLocationId", "");
                              },
                            )}
                          </FieldRow>
                          <FieldRow label="City" value={form.currentCity}>
                            {editSelect(
                              "cityId",
                              cities,
                              cityPlaceholder,
                              (value) => {
                                updateDraft("cityId", value);
                                updateDraft("preferredLocationId", "");
                              },
                            )}
                          </FieldRow>
                        </div>
                      </div>
                    </div>

                    {/* User Log */}
                    <div className={SECTION_CARD}>
                      <div className={SECTION_BODY}>
                        <h3 className={SECTION_TITLE}>User Log</h3>
                        <div className={FIELD_GRID_2}>
                          <FieldRow
                            label="Created At"
                            value={formatDateTime(form.createdAt)}
                          />
                          <FieldRow
                            label="Created By"
                            value={formatUser(form.CreatedByName)}
                          />
                          <FieldRow
                            label="Updated At"
                            value={formatDateTime(form.updatedAt)}
                          />
                          <FieldRow
                            label="Updated By"
                            value={formatUser(form.UpdatedByName)}
                          />
                          <FieldRow
                            label="Activated At"
                            value={formatDateTime(form.activatedAt)}
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* -------- Current Employment -------- */}
                {tab === "employment" && (
                  <section className={SECTION_CARD}>
                    <div className={SECTION_BODY}>
                      <h3 className={SECTION_TITLE}>Current Employment</h3>
                      <div className={FIELD_GRID_2}>
                        <FieldRow
                          label="Current Employer"
                          value={form.currentEmployment}
                        >
                          {editInput("currentEmployment")}
                        </FieldRow>
                        <FieldRow
                          label="Current Designation"
                          value={form.currentDesignation}
                        >
                          {editInput("currentDesignation")}
                        </FieldRow>
                        <FieldRow label="Current Salary" value={form.currentSalary}>
                          {editInput("currentSalary", "number")}
                        </FieldRow>
                        <FieldRow
                          label="Total Experience (Years)"
                          value={form.totalExperience}
                        >
                          {editInput("totalExperience", "number")}
                        </FieldRow>
                        <FieldRow label="Job Type" value={form.jobType}>
                          {editSelect(
                            "instituteTypeId",
                            instituteTypes,
                            "Select institute type",
                          )}
                        </FieldRow>
                      </div>
                    </div>
                  </section>
                )}

                {/* -------- Job Preferences -------- */}
                {tab === "preferences" && (
                  <section className={SECTION_CARD}>
                    <div className={SECTION_BODY}>
                      <h3 className={SECTION_TITLE}>Job Preferences</h3>
                      <div className={FIELD_GRID_2}>
                        <FieldRow
                          label="Preferred Location"
                          value={form.preferredJobLocation}
                        >
                          {editSelect(
                            "preferredLocationId",
                            cities,
                            cityPlaceholder,
                          )}
                        </FieldRow>
                        <FieldRow label="Expected Salary" value={form.expectedSalary}>
                          {editInput("expectedSalary", "number")}
                        </FieldRow>
                        <FieldRow
                          label="Willing to Relocate?"
                          value={form.willingToRelocate}
                        >
                          {yesNoSelect("willingToRelocate")}
                        </FieldRow>
                        <FieldRow
                          label="Availability to Join"
                          value={
                            form.availabilityToJoin
                              ? formatDate(form.availabilityToJoin)
                              : form.availabilityToJoin
                          }
                        >
                          {editInput("availabilityToJoin", "date")}
                        </FieldRow>
                        <FieldRow label="Job Category" value={form.jobCategory}>
                          {editSelect(
                            "jobCategoryId",
                            jobCategories,
                            "Select profession",
                          )}
                        </FieldRow>
                      </div>
                    </div>
                  </section>
                )}

                {/* -------- Upskilling -------- */}
                {tab === "upskilling" && (
                  <section className={SECTION_CARD}>
                    <div className={SECTION_BODY}>
                      <h3 className={SECTION_TITLE}>Upskilling</h3>
                      <div className={FIELD_GRID_2}>
                        <FieldRow
                          label="Wants to Upskill?"
                          value={form.upskillingYesNo}
                        >
                          {yesNoSelect("upskillingYesNo")}
                        </FieldRow>

                        {toBoolean(
                          isEditing ? draft.upskillingYesNo : form.upskillingYesNo,
                        ) ? (
                          <FieldRow
                            label="Upskilling Where"
                            value={form.upskillingDetails}
                          >
                            {editInput("upskillingDetails")}
                          </FieldRow>
                        ) : (
                          <FieldRow label="Interested?" value={form.interested}>
                            {yesNoSelect("interested")}
                          </FieldRow>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* -------- Documents (Resume/CV only) -------- */}
                {tab === "resume" && (
                  <section className={SECTION_CARD}>
                    <div className={SECTION_BODY}>
                      <div className={`${FIELD_GRID} sm:items-start`}>
                        <label className={`${FIELD_LABEL} sm:pt-2`}>
                          Resume / CV
                        </label>
                        <div className="min-w-0">
                          <DocumentBox doc={form.resume} />
                          {isEditing && (
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              className="mt-2 block w-full text-xs text-slate-600"
                              onChange={(event) =>
                                setUploadFile(event.target.files?.[0] ?? null)
                              }
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* -------- Applied Jobs (hidden; re-add to NAV to enable) -------- */}
                {tab === "jobs" && (
                  <section className={SECTION_CARD}>
                    <div className={SECTION_BODY}>
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-[#1a2b3c]">
                          Applied Jobs
                        </h3>
                        <p className="text-xs text-[#5b6b7c]">
                          {totalRecords} application
                          {totalRecords !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {jobsLoading && (
                        <div className="px-4 py-12 text-center">
                          <p className="text-[#5b6b7c]">Loading applied jobs…</p>
                        </div>
                      )}

                      {jobsError && !jobsLoading && (
                        <div className="px-4 py-8 text-center text-[#5b6b7c]">
                          {jobsError}
                        </div>
                      )}

                      {!jobsLoading && !jobsError && appliedJobs.length === 0 && (
                        <div className="px-4 py-12 text-center">
                          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                            <Inbox size={22} />
                          </div>
                          <p className="mt-3 text-[15px] text-[#1e2b3c]">
                            No applied jobs yet
                          </p>
                        </div>
                      )}

                      {!jobsLoading && !jobsError && appliedJobs.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-[#e3e8ee]">
                                {[
                                  "Position",
                                  "Organization",
                                  "Location",
                                  "Job Status",
                                  "Applied On",
                                ].map((h) => (
                                  <th
                                    key={h}
                                    className="whitespace-nowrap pb-2 text-left text-[11.5px] font-semibold uppercase tracking-wide text-[#5b6b7c]"
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {appliedJobs.map((application) => (
                                <tr
                                  key={application.id}
                                  className="border-b border-[#e3e8ee] last:border-0"
                                >
                                  <td className="whitespace-nowrap py-3 font-medium text-[#1a2b3c]">
                                    {text(application.position)}
                                  </td>
                                  <td className="whitespace-nowrap py-3 text-[#1a2b3c]">
                                    {text(application.organizationName)}
                                  </td>
                                  <td className="whitespace-nowrap py-3 text-[#1a2b3c]">
                                    {text(application.location)}
                                  </td>
                                  <td className="whitespace-nowrap py-3 text-[#1a2b3c]">
                                    {application.jobStatus}
                                  </td>
                                  <td className="whitespace-nowrap py-3 text-[#1a2b3c]">
                                    {formatDate(application.appliedDate)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobSeekerDetails;