import { useEffect, useState } from "react";
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
} from "lucide-react";
import jobseekerApi from "../../../api/Services/adjobseekerApi";
import applicationApi from "../../../api/applicationApi";

/* ---------------- Design tokens (match EmployerProfile) ---------------- */
const T = {
  radius: "rounded-lg",
  border: "border-[#e3e8ee]",
  borderSoft: "border-[#eef1f5]",
  bg: "bg-[#f4f8fb]",
  surface: "bg-white",
  text: "text-[#1a2b3c]",
  textMuted: "text-[#5b6b7c]",
  textFaint: "text-[#8895a4]",
  accent: "text-[#1e5a7a]",
  hover: "hover:bg-[#f3f6f9]",
};

const val = (v) => (v && String(v).trim() ? v : "—");

const FIELD_LABEL = `text-[11.5px] font-semibold uppercase tracking-wide ${T.textFaint}`;
const FIELD_BOX = (mono) =>
  `flex h-9 items-center rounded-md border ${T.border} bg-[#fbfcfd] px-3 text-[13px] font-medium ${T.text} ${
    mono ? "font-mono text-[12.5px]" : ""
  }`;

const BTN_PRIMARY =
  "inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]";

const NAV = [
  { id: "overview", label: "Overview", icon: UserRound },
  { id: "preferences", label: "Location & Preferences", icon: MapPin },
  { id: "resume", label: "Documents", icon: FileIcon },
  { id: "jobs", label: "Applied Jobs", icon: Briefcase },
];

/* ---------------- API URL Configuration ---------------- */

const DOCUMENT_BASE_URL = (process.env.REACT_APP_DOCUMENT_BASE_URL || "").trim();


const toAbsoluteUrl = (url) => {
  if (!url) return url;

  const raw = String(url).trim();

  // Already absolute (http/https) — trust it as-is
  if (/^https?:\/\//i.test(raw)) return raw;

  // Normalize the path
  let clean = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  clean = clean.replace(/^wwwroot\//i, ""); // strip "wwwroot/"
  clean = clean.replace(/^api\//i, "");     // strip accidental "api/"
  clean = clean.replace(/^\/+/, "");

  // No base configured → fall back to root-relative path (works same-origin)
  if (!DOCUMENT_BASE_URL) return `/${clean}`;

  return `${DOCUMENT_BASE_URL.replace(/\/+$/, "")}/${clean}`;
};

/* ---------------- Data helpers (unchanged logic) ---------------- */
const STORAGE_KEY = "ishraq_jobseekers";

const EMPTY_FORM = {
  fullName: "",
  mobile: "",
  whatsapp: "",
  email: "",
  jobCategory: "",
  highestQualification: "",
  speciality: "",
  professionalRegistrationNumber: "",
  totalExperience: "",
  currentDesignation: "",
  address: "",
  currentCity: "",
  state: "",
  expectedSalary: "",
  currentEmployer: "",
  currentSalary: "",
  preferredJobLocation: "",
  willingToRelocate: "",
  employmentPreference: "",
  availabilityToJoin: "",
  resume: null,
  qualificationCertificate: null,
  professionalCertificate: null,
  experienceCertificate: null,
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

const toJobseekerView = (item, id) => {
  const activeValue = firstValue(
    item,
    "jS_is_active",
    "JS_is_active",
    "isActive",
    "active",
  );
  const documentPath = firstValue(
    item,
    "jB_cv_file_path",
    "CVFilePath",
    "cvFilePath",
    "resumeUrl",
  );
  const documentUrl =
    firstValue(item, "CVFileUrl", "cvFileUrl", "resumeUrl") || documentPath;

  return {
    id: firstValue(item, "jS_jobseeker_id", "JS_jobseeker_id", "id") || id,
    status: [true, 1, "1", "true", "True"].includes(activeValue)
      ? "Active"
      : "Inactive",
    ...EMPTY_FORM,
    fullName: firstValue(
      item,
      "fullName",
      "JB_full_name",
      "jS_full_name",
      "name",
    ),
    mobile: firstValue(item, "mobile", "JB_mobile", "jS_mobile"),
    whatsapp: firstValue(
      item,
      "jB_whatsapp",
      "JB_whatsapp",
      "jS_whatsapp",
      "whatsapp",
    ),
    email: firstValue(item, "email", "Email", "jS_email"),
    jobCategory: firstValue(
      item,
      "jobCategoryName",
      "jC_name",
      "jobCategory",
      "jS_job_category_id",
    ),
    highestQualification: firstValue(
      item,
      "highestQualification",
      "qualification",
      "jS_qualification",
    ),
    speciality: firstValue(
      item,
      "speciality",
      "specialization",
      "jS_speciality",
    ),
    professionalRegistrationNumber: firstValue(
      item,
      "professionalRegistrationNumber",
      "registrationNumber",
    ),
    totalExperience: firstValue(
      item,
      "totalExperience",
      "experience",
      "jS_total_experience",
    ),
    currentDesignation: firstValue(
      item,
      "currentDesignation",
      "designation",
      "jS_current_designation",
    ),
    address: firstValue(item, "address", "Address", "JB_address", "jB_address"),
    currentCity: firstValue(item, "currentCity", "cityName", "jS_city_name"),
    state: firstValue(item, "state", "stateName", "jS_state_name"),
    expectedSalary: firstValue(item, "expectedSalary", "jS_expected_salary"),
    currentEmployer: firstValue(item, "currentEmployer", "jS_current_employer"),
    currentSalary: firstValue(item, "currentSalary", "jS_current_salary"),
    preferredJobLocation: firstValue(
      item,
      "preferredJobLocation",
      "preferredLocationName",
      "jB_preferredLocationName",
    ),
    willingToRelocate: firstValue(
      item,
      "willingToRelocate",
      "jS_willing_to_relocate",
    ),
    employmentPreference: firstValue(
      item,
      "employmentPreference",
      "jS_employment_preference",
    ),
    availabilityToJoin: firstValue(
      item,
      "availabilityToJoin",
      "jS_availability_to_join",
    ),
    resume:
      documentPath || documentUrl
        ? {
            name:
              firstValue(item, "CVFileName", "cvFileName", "resumeName") ||
              String(documentPath || "Resume / CV")
                .split(/[\\/]/)
                .pop(),
            url: toAbsoluteUrl(documentUrl || documentPath), // <-- Applied here
          }
        : null,
  };
};

/* ---------------- Applied jobs helpers ---------------- */
const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const text = (value) => (hasValue(value) ? String(value).trim() : "-");

const lowerKeys = (value) =>
  Object.fromEntries(
    Object.entries(value ?? {}).map(([key, item]) => [
      key.toLowerCase(),
      item,
    ]),
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
    totalRecords: Number(
      result?.totalRecords ?? result?.TotalRecords ?? 0,
    ),
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
      jobLocation.ctm_cityname ??
      job.joblocationname ??
      job.locationname,

    employmentType:
      employmentType.name ??
      job.employmenttypename ??
      job.jq_employment_type_name,

    jobStatus:
      requirementActive === true || requirementActive === 1
        ? "Open"
        : requirementActive === false || requirementActive === 0
          ? "Closed"
          : "-",

    isActive: app.ap_is_active,
  };
};

const formatDate = (value) => {
  if (!hasValue(value)) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
          <p className="truncate text-[13px] font-semibold text-[#1a2b3c]">
            {doc.name || "Resume / CV"}
          </p>
          <p className="text-[11.5px] text-[#8895a4]">Resume / CV</p>
        </div>
      </div>

      {doc.url ? (
        <div className="mt-2.5 flex gap-2">
          {/* <a
            href={doc.url}
            download={doc.name}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#2f6b8a] text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
          >
            <Download size={13} /> Download
          </a> */}
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Eye size={13} /> View
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
const JobSeekerDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  }, [id]);

  /* Load applied jobs for this jobseeker */
  useEffect(() => {
    let cancelled = false;

    const loadJobs = async () => {
      if (!id) return;
      setJobsLoading(true);
      setJobsError(null);
      try {
        const response = await applicationApi.getAppliedJobs(id, page, pageSize);
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

  /* Navigation helpers */
  const goToEditProfile = () => navigate(`/admin/jobseekers/${id}/edit`);

  const pageTitle = form.fullName || "Jobseeker";

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

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goToEditProfile}
                className={BTN_PRIMARY}
              >
                Edit
              </button>
            </div>
          </div>

          {/* BODY */}
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[170px_1fr]">
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
                  <section
                    className={`${T.surface} ${T.radius} border ${T.border} shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}
                  >
                    <div className="p-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>Full Name</label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.fullName)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>Mobile Number</label>
                          <div className={FIELD_BOX(true)}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.mobile)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>WhatsApp Number</label>
                          <div className={FIELD_BOX(true)}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.whatsapp)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>Email Address</label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {form.email ? (
                                <a
                                  href={`mailto:${form.email}`}
                                  className="inline-flex items-center gap-1 text-[#1e5a7a] hover:underline"
                                >
                                  {form.email} <ExternalLink size={11} />
                                </a>
                              ) : (
                                "—"
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>
                            Profession / Job Category
                          </label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.jobCategory)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>
                            Highest Qualification
                          </label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.highestQualification)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>
                            Speciality / Department
                          </label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.speciality)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>
                            Professional Registration Number
                          </label>
                          <div className={FIELD_BOX(true)}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.professionalRegistrationNumber)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>
                            Total Experience (Years)
                          </label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.totalExperience)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>
                            Current Designation
                          </label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.currentDesignation)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>
                            Current Employer
                          </label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.currentEmployer)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>Current Salary</label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.currentSalary)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>Status</label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* -------- Location & Preferences -------- */}
                {tab === "preferences" && (
                  <section
                    className={`${T.surface} ${T.radius} border ${T.border} shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}
                  >
                    <div className="p-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="flex flex-col gap-1.5 sm:col-span-2 xl:col-span-3">
                          <label className={FIELD_LABEL}>Address</label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.address)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>Current City</label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.currentCity)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>State</label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.state)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>
                            Preferred Job Location
                          </label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.preferredJobLocation)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>Expected Salary</label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.expectedSalary)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>
                            Willing to Relocate?
                          </label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.willingToRelocate)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>
                            Employment Preference
                          </label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.employmentPreference)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>
                            Availability to Join
                          </label>
                          <div className={FIELD_BOX()}>
                            <span className="min-w-0 flex-1 truncate">
                              {val(form.availabilityToJoin)}
                            </span>
                          </div>
                        </div>
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
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="flex flex-col gap-1.5">
                          <label className={FIELD_LABEL}>Resume / CV</label>
                          <DocumentBox doc={form.resume} />
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