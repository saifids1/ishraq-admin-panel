import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronsLeft,
  Building2,
  BriefcaseBusiness,
  ExternalLink,
  Inbox,
  ChevronsRight,
} from "lucide-react";
import { getCurrentUserId } from "../../../utils/authUtils";
import { getEmployerById } from "../../../api/employerApi";
import { getJobRequirementsByEmployer } from "../../../api/jobRequirementApi";

/* ---------------- Design tokens (same as EmployerProfile) ---------------- */
const T = {
  radius: "rounded-lg",
  border: "border-[#e3e8ee]",
  bg: "bg-[#f4f8fb]",
  surface: "bg-white",
  text: "text-[#1a2b3c]",
  textMuted: "text-[#5b6b7c]",
  textFaint: "text-black",
};

const BADGE =
  "inline-flex h-6 items-center rounded-md px-2 text-[11.5px] font-semibold tracking-wide whitespace-nowrap ring-1 ring-inset";

const CATEGORY_STYLE = {
  Nurse: "bg-sky-50 text-sky-700 ring-sky-200",
  Doctor: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  Pharmacist: "bg-violet-50 text-violet-700 ring-violet-200",
  "Lab Technician": "bg-teal-50 text-teal-700 ring-teal-200",
  Caregiver: "bg-amber-50 text-amber-700 ring-amber-200",
  "Admin / Office Staff": "bg-slate-100 text-slate-700 ring-slate-200",
  Other: "bg-gray-100 text-gray-700 ring-gray-200",
};

const CARD_STATUS_STYLE = {
  Open: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Paused: "bg-amber-50 text-amber-700 ring-amber-200",
  Closed: "bg-slate-100 text-slate-600 ring-slate-200",
};

const CARD_STATUS_DOT = {
  Open: "bg-emerald-500",
  Paused: "bg-amber-500",
  Closed: "bg-slate-400",
};

const FIELD_LABEL = `text-[13px] font-semibold tracking-wide ${T.textFaint}`;
const FIELD_BOX = (mono) =>
  `flex h-9 w-full items-center rounded-md border ${T.border} bg-[#fbfcfd] px-3 text-[13px] font-medium ${T.text} ${
    mono ? "font-mono text-[12.5px]" : ""
  }`;

const BTN_PRIMARY =
  "inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]";

/* ---------------- Reusable row: label : value ---------------- */
const FieldRow = ({ label, value, mono = false, children }) => (
  <div className="grid grid-cols-[160px_1fr] items-center gap-3">
    <label className={`${FIELD_LABEL} text-right sm:text-left`}>{label}</label>
    <div className={FIELD_BOX(mono)}>
      <span className="min-w-0 flex-1 truncate">
        {children ?? val(value)}
      </span>
    </div>
  </div>
);

/* ---------------- Nav ---------------- */
const NAV = [
  { id: "overview", label: "Overview", icon: Building2 },
  // { id: "jobs", label: "Job Requirements", icon: BriefcaseBusiness },
];

/* ---------------- Helpers ---------------- */
const val = (v) =>
  v === null || v === undefined || String(v).trim() === ""
    ? "—"
    : String(v).trim();

// dd-mm-yyyy
const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

// dd-mm-yyyy hh:mm AM/PM
const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dd}-${mm}-${d.getFullYear()} ${timePart}`;
};

const getPayload = (response) => {
  const root = response?.data ?? response?.Data ?? response;
  return root?.data ?? root?.Data ?? root;
};

// Share an in-flight request between React StrictMode's development effect runs.
const employerRequests = new Map();

const getEmployerRequest = (userId) => {
  if (!employerRequests.has(userId)) {
    const request = getEmployerById(userId).then(
      (response) => {
        employerRequests.delete(userId);
        return response;
      },
      (error) => {
        employerRequests.delete(userId);
        throw error;
      },
    );
    employerRequests.set(userId, request);
  }
  return employerRequests.get(userId);
};

const normalizeEmployer = (record) => {
  if (!record) return null;
  return {
    ...record,
    EM_employer_id: record.eM_employer_id ?? record.EM_employer_id,
    EM_request_no: record.eM_request_no ?? record.EM_request_no,
    UserName: record.userName ?? record.UserName,
    Email: record.email ?? record.Email,
    Mobile: record.mobile ?? record.Mobile,
    EM_organization_name: record.eM_organization_name ?? record.EM_organization_name,
    EM_institute_type_id: record.eM_institute_type_id ?? record.EM_institute_type_id,
    EM_contact_person: record.eM_contact_person ?? record.EM_contact_person,
    EM_designation: record.eM_designation ?? record.EM_designation,
    EM_country_id: record.eM_country_id ?? record.EM_country_id,
    EM_state_id: record.eM_state_id ?? record.EM_state_id,
    EM_city_id: record.eM_city_id ?? record.EM_city_id,
    EM_website: record.eM_website ?? record.EM_website,
    EM_consent_given: record.eM_consent_given ?? record.EM_consent_given,
    EM_consent_at: record.eM_consent_at ?? record.EM_consent_at,
    EM_created_at: record.eM_created_at ?? record.EM_created_at,
    EM_updated_at: record.eM_updated_at ?? record.EM_updated_at,
    CityName: record.cityName ?? record.CityName,
    StateName: record.stateName ?? record.StateName,
    CountryName: record.countryName ?? record.CountryName,
    InstituteTypeName:
      record.instituteTypeName ?? record.InstituteTypeName,
    EM_is_active: record.eM_is_active ?? record.EM_is_active,
    EM_activated_at: record.eM_activated_at ?? record.EM_activated_at,
  };
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ??
  error?.response?.data?.Message ??
  error?.message ??
  "Unable to load organization details. Please try again.";

/* ---------------- Page ---------------- */
const OrganizationDetails = () => {
  const navigate = useNavigate();

  const [employer, setEmployer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  /* ---------------- Fetch employer + jobs ---------------- */
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error(
            "Your login session could not be identified. Please sign in again.",
          );
        }

        const response = await getEmployerRequest(userId);
        const payload = getPayload(response);
        const rawRecord =
          payload?.eM_employer_id !== undefined ||
          payload?.EM_employer_id !== undefined
            ? payload
            : payload?.employer ??
              payload?.Employer ??
              payload?.data ??
              payload?.Data;
        const record = normalizeEmployer(rawRecord);

        if (!record || record.EM_employer_id === undefined) {
          throw new Error("The organization details were not returned by the API.");
        }

        let jobRequirements = [];
        try {
          const jobResponse = await getJobRequirementsByEmployer(
            record.EM_employer_id,
          );
          jobRequirements = Array.isArray(jobResponse)
            ? jobResponse
            : jobResponse?.data ?? jobResponse?.Data ?? [];
        } catch {
          jobRequirements = [];
        }

        if (!cancelled) {
          setEmployer(record);
          setJobs(
            jobRequirements.map((job) => ({
              id: job.jQ_job_requirement_id,
              title: job.jQ_position_title,
              category: job.jobCategoryName,
              status: job.jobStatusName,
              vacancies: Number(job.jQ_vacancies) || 0,
              filled: 0,
              applicants: job.appliedCount ?? 0,
              postedOn: formatDate(job.jQ_created_at),
              deadline: formatDate(job.jQ_deadline),
            })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setEmployer(null);
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className={`min-h-full ${T.bg} p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-12 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#2f6b8a] border-t-transparent" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>
            Loading organization…
          </p>
        </div>
      </div>
    );
  }

  /* ---------- Error / Not found ---------- */
  if (error || !employer) {
    return (
      <div className={`min-h-full ${T.bg} p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-12 text-center">
          <Building2 size={28} className="mx-auto text-[#8895a4]" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>
            {error || "Organization not found"}
          </p>
          <p className={`mt-1 text-[13px] ${T.textMuted}`}>
            The details could not be loaded right now.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={`mt-4 ${BTN_PRIMARY}`}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const active = employer.EM_is_active === true;
  const pageTitle = employer.EM_organization_name || "Organization";

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
            <p className="font-semibold text-slate-800">{employer.EM_request_no}</p>
            

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/employer/organization-profile/edit/${employer.EM_employer_id}`,
                  )
                }
                className={BTN_PRIMARY}
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* BODY */}
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr]">
              {/* LEFT: vertical nav */}
              <aside className="md:sticky md:top-4 md:h-fit w-[11rem]">
                <nav
                  aria-label="Organization sections"
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
                    <div className="space-y-6 p-4">
                      {/* Organization */}
                      <div>
                        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                          Organization Details
                        </h3>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                          <FieldRow
                            label="Organization Name"
                            value={employer.EM_organization_name}
                          />
                          <FieldRow
                            label="Organization Type"
                            value={employer.InstituteTypeName}
                          />
                          <FieldRow label="Website">
                            {employer.EM_website ? (
                              <a
                                href={
                                  /^https?:\/\//i.test(employer.EM_website)
                                    ? employer.EM_website
                                    : `https://${employer.EM_website}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-w-0 items-center gap-1 truncate text-[#1e5a7a] hover:underline"
                              >
                                <span className="truncate">
                                  {employer.EM_website}
                                </span>
                                <ExternalLink size={11} />
                              </a>
                            ) : (
                              "—"
                            )}
                          </FieldRow>
                          <FieldRow
                            label="Email "
                            value={employer.UserName}
                          />
                          <FieldRow
                            label="Status"
                            value={active ? "Active" : "Inactive"}
                          />
                        </div>
                      </div>

                      {/* Contact Person */}
                      <div>
                        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                          Contact Person
                        </h3>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                          <FieldRow
                            label="Contact Person"
                            value={employer.EM_contact_person}
                          />
                          <FieldRow
                            label="Designation"
                            value={employer.EM_designation}
                          />
                          <FieldRow
                            label="Mobile"
                            value={employer.Mobile}
                            mono
                          />
                        </div>
                      </div>

                      {/* Location */}
                      <div>
                        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                          Location
                        </h3>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                          <FieldRow label="Country" value={employer.CountryName} />
                          <FieldRow label="State" value={employer.StateName} />
                          <FieldRow label="City" value={employer.CityName} />
                        </div>
                      </div>

                      {/* Consent */}
                      <div>
                        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                          Consent
                        </h3>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                          <FieldRow
                            label="Consent Given"
                            value={employer.EM_consent_given ? "Yes" : "No"}
                          />
                          <FieldRow
                            label="Consent At"
                            value={formatDateTime(employer.EM_consent_at)}
                          />
                        </div>
                      </div>

                      {/* Audit Trail */}
                      <div>
                        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                          Audit Trail
                        </h3>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                          {/* <FieldRow
                            label="Request No."
                            value={employer.EM_request_no}
                            mono
                          /> */}
                          <FieldRow
                            label="Created At"
                            value={formatDateTime(employer.EM_created_at)}
                          />
                          <FieldRow
                            label="Updated At"
                            value={formatDateTime(employer.EM_updated_at)}
                          />
                          <FieldRow
                            label="Activated At"
                            value={formatDateTime(employer.EM_activated_at)}
                          />
                        </div>
                      </div>
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

export default OrganizationDetails;