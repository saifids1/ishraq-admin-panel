import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FileText as FileIcon,
  ChevronsLeft,
  Mail,
  MapPin,
  Download,
  Eye,
  GraduationCap,
  Briefcase,
  Wallet,
  Inbox,
  UserRound,
  Navigation,
  ExternalLink,
  Building2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import jobseekerApi from "../../../api/Services/adjobseekerApi";
import applicationApi from "../../../api/applicationApi";
import jobCategoryApi from "../../../api/Services/jobCategoryApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import jobRoleApi from "../../../api/Services/jobRoleApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";
import { getCurrentUserId2 } from "../../../utils/authUtils";

/* ---------------- Design tokens (match EmployerProfile) ---------------- */
const T = {
  radius: "rounded-lg",
  border: "border-[#e3e8ee]",
  borderSoft: "border-[#eef1f5]",
  bg: "bg-[#f4f8fb]",
  surface: "bg-white",
  text: "text-[#1a2b3c]",
  textMuted: "text-[#5b6b7c]",
  textFaint: "text-black",
  accent: "text-[#1e5a7a]",
  hover: "hover:bg-[#f3f6f9]",
};

const val = (v) => (v && String(v).trim() ? v : "—");

/** Tolerant Yes/No/— mapper for boolean-ish API fields */
const toYesNo = (v) => {
  if (v === true || v === 1 || v === "1" || v === "true") return "Yes";
  if (v === false || v === 0 || v === "0" || v === "false") return "No";
  return "—";
};
const toBoolean = (value) =>
  value === true || value === 1 || ["true", "1", "yes"].includes(String(value).toLowerCase());

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
  "inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]";
const EDIT_INPUT =
  "h-9 w-full rounded-md border border-[#c9d5dd] bg-white px-3 text-[13px] text-[#1a2b3c] outline-none focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/20";

const NAV = [
  { id: "overview", label: "Overview", icon: UserRound },
  { id: "employment", label: "Current Employment", icon: Building2 },
  { id: "preferences", label: "Job Preferences", icon: SlidersHorizontal },
  { id: "resume", label: "Documents", icon: FileIcon },
  { id: "jobs", label: "Applied Jobs", icon: Briefcase },
];

/* ---------------- Reusable row: label : input ---------------- */
const FieldRow = ({ label, value, mono = false, children }) => (
  <div className="grid grid-cols-[160px_1fr] items-center gap-3">
    <label className={`${FIELD_LABEL} text-right sm:text-left`}>{label}</label>
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
const STORAGE_KEY = "ishraq_jobseekers";

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

const firstValue = (item, ...keys) =>
  keys
    .map((key) => item?.[key])
    .find((value) => value !== undefined && value !== null) ?? "";

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

const lowerKeys = (value) =>
  Object.fromEntries(
    Object.entries(value ?? {}).map(([key, item]) => [key.toLowerCase(), item]),
  );

const unwrapPage = (response) => {
  const body = response?.data ?? response;
  const result = body?.data ?? body?.Data ?? body;

  return {
    rows: Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result?.Data)
        ? result.Data
        : [],
    pageNo: Number(result?.pageNo ?? result?.PageNo ?? 1),
    pageSize: Number(result?.pageSize ?? result?.PageSize ?? 10),
    totalRecords: Number(result?.totalRecords ?? result?.TotalRecords ?? 0),
    totalPages: Number(result?.totalPages ?? result?.TotalPages ?? 0),
  };
};

const normalizeApplication = (raw) => {
  const app = lowerKeys(raw);
  const job = lowerKeys(app.jobrequirement);
  const employer = lowerKeys(job.employer);
  const jobLocation = lowerKeys(job.joblocation);
  const employmentType = lowerKeys(job.employmenttype);

  const requirementActive = job.jq_is_active;

  return {
    id: app.ap_application_id,
    requirementId: app.ap_job_requirement_id,
    applicationNumber: app.apply_id,
    appliedDate: app.ap_created_at,

    organizationName:
      employer.em_organization_name ??
      job.employername ??
      raw?.organizationName,

    position: job.jq_position_title,
    department: job.jq_department_speciality,

    location:
      jobLocation.ctm_cityname ?? job.joblocationname ?? job.locationname,

    employmentType:
      employmentType.name ??
      job.employmenttypename ??
      job.jq_employment_type_name,

    jobStatus: truthy(requirementActive)
      ? "Open"
      : requirementActive === false || requirementActive === 0
        ? "Closed"
        : "-",

    isActive: app.ap_is_active,
  };
};

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
        <div className="mt-2.5 flex gap-2">
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Eye size={13} /> View
          </a>
          <a
            href={doc.url}
            download
            className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
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
  const { id } = useParams();

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
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    setIsEditing(mode === "edit");
  }, [mode]);

  /* Applied jobs state */
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await jobseekerApi.getById(id);
        const item = extractRecord(response);
        if (!cancelled) {
          if (item) {
            const view = toJobseekerView(item, id);
            setUser(view);
            setForm({ ...EMPTY_FORM, ...view });
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

    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  useEffect(() => {
    if (!isEditing) return undefined;
    let cancelled = false;
    const loadLookups = async () => {
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
        if (!cancelled) {
          setInstituteTypes(
            normalizeLookup(
              extractList(instituteResponse),
              ["iT_institute_type_id", "IT_institute_type_id"],
              ["iT_name", "IT_name", "name"],
            ),
          );
          setCountries(
            normalizeLookup(
              extractList(countryResponse),
              ["cM_Id"],
              ["cM_CountryName"],
            ),
          );
          setStates(
            normalizeLookup(
              extractList(stateResponse),
              ["sM_Id"],
              ["sM_StateName"],
            ),
          );
          setCities(
            normalizeLookup(
              extractList(cityResponse),
              ["ctM_Id"],
              ["ctM_CityName"],
            ),
          );
        }
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
    loadLookups();
    return () => {
      cancelled = true;
    };
  }, [isEditing]);

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
            extractList(response)
              .map((item) => ({
                id: item.jC_job_category_id ?? item.JC_job_category_id,
                name: item.jC_name ?? item.JC_name ?? item.name,
              }))
              .filter((item) => item.id != null && item.name),
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
            extractList(response)
              .map((item) => ({
                id: item.jR_job_role_id ?? item.JR_job_role_id,
                name: item.jR_name ?? item.JR_name ?? item.name,
              }))
              .filter((item) => item.id != null && item.name),
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

  /* Load applied jobs for this jobseeker */
  useEffect(() => {
    let cancelled = false;

    const loadJobs = async () => {
      if (!id) return;
      setJobsLoading(true);
      setJobsError(null);
      try {
        const response = await applicationApi.getAppliedJobs(
          id,
          page,
          pageSize,
        );
        const result = unwrapPage(response);
        if (!cancelled) {
          setAppliedJobs(result.rows.map(normalizeApplication));
          setTotalRecords(result.totalRecords);
          setTotalPages(result.totalPages);
        }
      } catch (err) {
        if (!cancelled) {
          setJobsError(err?.message || "Failed to load applied jobs");
          setAppliedJobs([]);
          setTotalRecords(0);
          setTotalPages(0);
        }
      } finally {
        if (!cancelled) setJobsLoading(false);
      }
    };

    loadJobs();
    return () => {
      cancelled = true;
    };
  }, [id, page, pageSize]);

  const filteredStates = useMemo(
    () =>
      states.filter(
        (state) => String(state.sM_CountryId) === draft.countryId,
      ),
    [states, draft.countryId],
  );
  const filteredCities = useMemo(
    () => cities.filter((city) => String(city.ctM_StateId) === draft.stateId),
    [cities, draft.stateId],
  );

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
      navigate(`/admin/jobseekers/${id}`, { replace: true });
    }
  };

  const saveJobseeker = async () => {
    const currentUserId = Number(getCurrentUserId2());
    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      setEditError("Unable to identify the current user. Please sign in again.");
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
      setEditError("Select valid institute, profession, role, and location values.");
      return;
    }

    setSaving(true);
    setEditError("");
    setSuccessMessage("");
    try {
      const payload = {
        JB_jobseeker_id: Number(id),
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

      await jobseekerApi.update(id, formData);
      setIsEditing(false);
      setUploadFile(null);
      setSuccessMessage("Jobseeker updated successfully.");
      setRefreshKey((current) => current + 1);
      if (mode === "edit") {
        navigate(`/admin/jobseekers/${id}`, { replace: true });
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

  /* Loading */
  if (loading) {
    return (
      <div className={`min-h-full ${T.bg} p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-12 text-center">
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
      <div className={`min-h-full ${T.bg} p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-12 text-center">
          <UserRound size={28} className="mx-auto text-[#8895a4]" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>
            {error || "Jobseeker not found"}
          </p>
          <p className={`mt-1 text-[13px] ${T.textMuted}`}>
            The record you're looking for doesn't exist or was removed.
          </p>
          <button
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

  /* Compose current location display */
  const currentLocationDisplay =
    [form.currentCity, form.currentState, form.currentCountry]
      .filter((v) => v && String(v).trim())
      .join(", ") || "—";

  return (
    <div className={`min-h-full ${T.bg}`}>
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* MAIN HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
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

              <h2 className="font-semibold text-slate-800">{pageTitle}</h2>
            </div>

            <div className="flex items-center gap-2">
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
                    onClick={saveJobseeker}
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

          {(editError || successMessage) && (
            <div
              role={editError ? "alert" : "status"}
              className={`mx-6 mt-4 rounded-lg border px-4 py-2.5 text-sm ${
                editError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {editError || successMessage}
            </div>
          )}

          {/* BODY */}
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr]">
              {/* LEFT: vertical nav */}
              <aside className="md:sticky md:top-4 md:h-fit w-[11rem]">
                <nav
                  aria-label="Jobseeker sections"
                  className={`${T.surface} ${T.radius} border ${T.border} overflow-hidden p-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}
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
                        className={`group flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-[13px] font-semibold transition ${
                          on
                            ? "bg-[#eaf2f7] text-[#1e5a7a]"
                            : "text-[#5b6b7c] hover:bg-[#f3f6f9] hover:text-[#1a2b3c]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon
                            size={15}
                            className={
                              on
                                ? "text-[#1e5a7a]"
                                : "text-[#8895a4] group-hover:text-[#5b6b7c]"
                            }
                          />
                          {n.label}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </aside>

              {/* RIGHT: detail panel */}
              <main className="min-w-0">
                {/* -------- Overview -------- */}
                {tab === "overview" && (
                  <section>
                    <div className="space-y-6 ">
                      {/* Personal / Professional details */}
                      <div className={`${T.surface} ${T.radius} border ${T.border} shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}>
                      <div className="p-4">
                        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                          Personal & Professional Details
                        </h3>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                          <FieldRow
                            label="Jobseeker ID"
                            value={form.jobseekerNo}
                          />

                          <FieldRow label="Full Name" value={form.fullName}>
                            {editInput("fullName")}
                          </FieldRow>
                          <FieldRow
                            label="Mobile Number"
                            value={form.mobile}
                            mono
                          >
                            {editInput("mobile", "tel")}
                          </FieldRow>
                          <FieldRow
                            label="WhatsApp Number"
                            value={form.whatsapp}
                            mono
                          >
                            {editInput("whatsapp", "tel")}
                          </FieldRow>

                          <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                            <label
                              className={`${FIELD_LABEL} text-right sm:text-left`}
                            >
                              Email Address
                            </label>
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

                          <FieldRow
                            label="Institute Type"
                            value={form.jobType}
                          >
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
                          <FieldRow
                            label="Job Category"
                            value={form.jobCategory}
                          >
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
                          <FieldRow
                            label="Consent Given"
                            value={form.consentGiven}
                          >
                            {isEditing ? (
                              <select
                                className={EDIT_INPUT}
                                value={toBoolean(draft.consentGiven) ? "true" : "false"}
                                onChange={(event) =>
                                  updateDraft(
                                    "consentGiven",
                                    event.target.value === "true",
                                  )
                                }
                              >
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </select>
                            ) : undefined}
                          </FieldRow>
                        </div>
                      </div>
                      </div>

                      {/* Current Location */}
                      <div className={`${T.surface} ${T.radius} border ${T.border} shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}>
                      <div className="p-4">
                        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                          Current Location
                        </h3>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                          <FieldRow
                            label="Country"
                            value={form.currentCountry}
                          >
                            {editSelect(
                              "countryId",
                              countries,
                              "Select country",
                              (value) => {
                                updateDraft("countryId", value);
                                updateDraft("stateId", "");
                                updateDraft("cityId", "");
                              },
                            )}
                          </FieldRow>
                          <FieldRow label="State" value={form.currentState}>
                            {editSelect(
                              "stateId",
                              filteredStates,
                              "Select state",
                              (value) => {
                                updateDraft("stateId", value);
                                updateDraft("cityId", "");
                              },
                            )}
                          </FieldRow>
                          <FieldRow label="City" value={form.currentCity}>
                            {editSelect(
                              "cityId",
                              filteredCities,
                              "Select city",
                            )}
                          </FieldRow>
                        </div>
                      </div>
                      </div>

                      {/* ---------- Audit Trail ---------- */}
                      <div className={`${T.surface} ${T.radius} border ${T.border} shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}>
                      <div className="p-4">
                          <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                          User Log
                        </h3>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
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
                    </div>
                  </section>
                )}

                {/* -------- Current Employment -------- */}
                {tab === "employment" && (
                  <section
                    className={`${T.surface} ${T.radius} border ${T.border} shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}
                  >
                    <div className="p-4">
                      <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                        Current Employment
                      </h3>
                      <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
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
                        <FieldRow
                          label="Current Salary"
                          value={form.currentSalary}
                        >
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
                  <section
                    className={`${T.surface} ${T.radius} border ${T.border} shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}
                  >
                    <div className="p-4">
                      <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                        Job Preferences
                      </h3>
                      <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                        <FieldRow
                          label="Preferred Location"
                          value={form.preferredJobLocation}
                        >
                          {editSelect(
                            "preferredLocationId",
                            cities,
                            "Select preferred location",
                          )}
                        </FieldRow>
                        <FieldRow
                          label="Expected Salary"
                          value={form.expectedSalary}
                        >
                          {editInput("expectedSalary", "number")}
                        </FieldRow>
                        <FieldRow
                          label="Willing to Relocate?"
                          value={form.willingToRelocate}
                        >
                          {isEditing ? (
                            <select
                              className={EDIT_INPUT}
                              value={toBoolean(draft.willingToRelocate) ? "true" : "false"}
                              onChange={(event) =>
                                updateDraft(
                                  "willingToRelocate",
                                  event.target.value === "true",
                                )
                              }
                            >
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : undefined}
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
                        <FieldRow
                          label="Job Category"
                          value={form.jobCategory}
                        >
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

                {/* -------- Documents (Resume/CV only) -------- */}
                {tab === "resume" && (
                  <section
                    className={`${T.surface} ${T.radius} border ${T.border} shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}
                  >
                    <div className="p-4">
                      <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                        <div className="grid grid-cols-[160px_1fr] items-start gap-3">
                          <label
                            className={`${FIELD_LABEL} pt-2 text-right sm:text-left`}
                          >
                            Resume / CV
                          </label>
                          <div>
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
                    </div>
                  </section>
                )}

                {/* -------- Applied Jobs -------- */}
                {tab === "jobs" && (
                  <section
                    className={`${T.surface} ${T.radius} border ${T.border} shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}
                  >
                    <div className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
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
                          <p className="text-[#5b6b7c]">
                            Loading applied jobs…
                          </p>
                        </div>
                      )}

                      {jobsError && !jobsLoading && (
                        <div className="px-4 py-8 text-center text-[#5b6b7c]">
                          {jobsError}
                        </div>
                      )}

                      {!jobsLoading &&
                        !jobsError &&
                        appliedJobs.length === 0 && (
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
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b border-[#e3e8ee]">
                                <th className="text-left pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[#5b6b7c]">
                                  Position
                                </th>
                                <th className="text-left pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[#5b6b7c]">
                                  Organization
                                </th>
                                <th className="text-left pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[#5b6b7c]">
                                  Location
                                </th>
                                <th className="text-left pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[#5b6b7c]">
                                  Job Status
                                </th>
                                <th className="text-left pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[#5b6b7c]">
                                  Applied On
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {appliedJobs.map((application) => (
                                <tr
                                  key={application.id}
                                  className="border-b border-[#e3e8ee] last:border-0"
                                >
                                  <td className="py-3 text-[#1a2b3c] font-medium">
                                    {text(application.position)}
                                  </td>
                                  <td className="py-3 text-[#1a2b3c]">
                                    {text(application.organizationName)}
                                  </td>
                                  <td className="py-3 text-[#1a2b3c]">
                                    {text(application.location)}
                                  </td>
                                  <td className="py-3 text-[#1a2b3c]">
                                    {application.jobStatus}
                                  </td>
                                  <td className="py-3 text-[#1a2b3c]">
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