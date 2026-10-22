import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronsLeft,
  Building2,
  BriefcaseBusiness,
  ExternalLink,
  Inbox,
  ChevronsRight,
  UserRound,
  MapPin,
  Globe,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import { getEmployerById } from "../../../api/employerApi";
import { getJobRequirementsByEmployer } from "../../../api/jobRequirementApi";

/* ---------------- Design tokens ---------------- */
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

const val = (v) =>
  v === null || v === undefined || String(v).trim() === "" ? "—" : v;

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

/* ---------------- Shared class strings ---------------- */
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
  { id: "jobs", label: "Job Requirements", icon: BriefcaseBusiness },
];

/* ---------------- Helpers ---------------- */

// dd-mm-yyyy
const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return "—";
  }
};

// dd-mm-yyyy hh:mm AM/PM
const formatDateTime = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const timePart = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dd}-${mm}-${yyyy} ${timePart}`;
  } catch {
    return "—";
  }
};

const formatUser = (v) => val(v);

/* ---------------- Page ---------------- */
const EmployerProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [emp, setEmp] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");

  /* ---------------- Fetch employer ---------------- */
  useEffect(() => {
    let cancelled = false;

    const fetchEmployer = async () => {
      setLoading(true);
      setError(null);
      try {
        const json = await getEmployerById(id);

        if (!json?.success || !json?.data) {
          throw new Error(json?.message || "Employer not found");
        }

        let jobRequirements = [];
        try {
          const jobResponse = await getJobRequirementsByEmployer(id);
          jobRequirements = Array.isArray(jobResponse)
            ? jobResponse
            : jobResponse?.data ?? jobResponse?.Data ?? [];
        } catch {
          jobRequirements = [];
        }

        if (!cancelled) {
          setEmp(json.data);
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
          setError(err.message || "Failed to load employer");
          setEmp(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (id) fetchEmployer();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ------------------- Navigation helpers ------------------- */
  const goToEditProfile = () => navigate(`/admin/employers/${id}/edit`);

  const pageTitle = emp?.eM_organization_name || "Employer";

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className={`min-h-full ${T.bg} p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-12 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#2f6b8a] border-t-transparent" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>
            Loading employer…
          </p>
        </div>
      </div>
    );
  }

  /* ---------- Error / Not found ---------- */
  if (error || !emp) {
    return (
      <div className={`min-h-full ${T.bg} p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-12 text-center">
          <Building2 size={28} className="mx-auto text-[#8895a4]" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>
            {error || "Employer not found"}
          </p>
          <p className={`mt-1 text-[13px] ${T.textMuted}`}>
            The record you're looking for doesn't exist or was removed.
          </p>
          <button onClick={() => navigate(-1)} className={`mt-4 ${BTN_PRIMARY}`}>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr]">
              {/* LEFT: vertical nav */}
              <aside className="md:sticky md:top-4 md:h-fit w-[11rem]">
                <nav
                  aria-label="Employer sections"
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
                            value={emp.eM_organization_name}
                          />
                          <FieldRow
                            label="Organization Type"
                            value={emp.instituteTypeName}
                          />
                          <FieldRow label="Website">
                            {emp.eM_website ? (
                              <a
                                href={
                                  /^https?:\/\//i.test(emp.eM_website)
                                    ? emp.eM_website
                                    : `https://${emp.eM_website}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-w-0 items-center gap-1 truncate text-[#1e5a7a] hover:underline"
                              >
                                <span className="truncate">
                                  {emp.eM_website}
                                </span>
                                <ExternalLink size={11} />
                              </a>
                            ) : (
                              "—"
                            )}
                          </FieldRow>
                        
                          <FieldRow label="Email / Username" value={emp.userName} />
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
                            value={emp.eM_contact_person}
                          />
                          <FieldRow
                            label="Designation"
                            value={emp.eM_designation}
                          />
                          <FieldRow
                            label="Mobile"
                            value={emp.mobile}
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
                          <FieldRow label="Country" value={emp.countryName} />
                          <FieldRow label="State" value={emp.stateName} />
                          <FieldRow label="City" value={emp.cityName} />
                          
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
                            value={emp.eM_consent_given ? "Yes" : "No"}
                          />
                          <FieldRow
                            label="Consent At"
                            value={formatDateTime(emp.eM_consent_at)}
                          />
                        </div>
                      </div>

                      {/* Audit Trail */}
                      <div>
                        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                          Audit Trail
                        </h3>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                            <FieldRow
                            label="Request No."
                            value={emp.eM_request_no}
                            mono
                          />
                          <FieldRow
                            label="Created At"
                            value={formatDateTime(emp.eM_created_at)}
                          />
                       
                          <FieldRow
                            label="Updated At"
                            value={formatDateTime(emp.eM_updated_at)}
                          />
                         
                          <FieldRow
                            label="Activated At"
                            value={formatDateTime(emp.eM_activated_at)}
                          />
                         
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* -------- Job Requirements -------- */}
                {tab === "jobs" && (
                  <section
                    className={`${T.surface} ${T.radius} border ${T.border}`}
                  >
                    {jobs.length === 0 ? (
                      <div className="px-4 py-12 text-center">
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                          <Inbox size={22} />
                        </div>
                        <p className="mt-3 text-[15px] text-[#1e2b36]">
                          No jobs yet
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                        {jobs.map((job) => {
                          const pct = job.vacancies
                            ? Math.round((job.filled / job.vacancies) * 100)
                            : 0;
                          const statusStyle =
                            CARD_STATUS_STYLE[job.status] ||
                            CARD_STATUS_STYLE.Closed;
                          const statusDot =
                            CARD_STATUS_DOT[job.status] ||
                            CARD_STATUS_DOT.Closed;
                          return (
                            <div
                              key={job.id}
                              className={`${T.surface} ${T.radius} border ${T.border} flex flex-col p-3.5 transition hover:border-[#c7d6e0]`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p
                                    className={`truncate text-[13.5px] font-semibold ${T.text}`}
                                  >
                                    {job.title || "-"}
                                  </p>
                                  <p className="mt-0.5 text-[11.5px] text-[#8895a4]">
                                    Posted {job.postedOn} · Deadline{" "}
                                    {job.deadline}
                                  </p>
                                </div>
                                <span
                                  className={`${BADGE} ${statusStyle} gap-1.5`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${statusDot}`}
                                  />
                                  {job.status || "-"}
                                </span>
                              </div>

                              <div className="mt-3 flex items-center gap-2">
                                <span
                                  className={`${BADGE} ${
                                    CATEGORY_STYLE[job.category] ||
                                    CATEGORY_STYLE.Other
                                  }`}
                                >
                                  {job.category || "-"}
                                </span>
                                <span className="text-[11.5px] text-[#5b6b7c]">
                                  <span className="font-semibold text-[#1a2b3c]">
                                    {job.applicants ?? 0}
                                  </span>{" "}
                                  applicants
                                </span>
                              </div>

                              <div className="mt-3 flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eef1f5]">
                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[11.5px] tabular-nums text-[#5b6b7c]">
                                  {job.filled ?? 0}/{job.vacancies ?? 0} filled
                                </span>
                              </div>

                              <div className="mt-3 flex items-center justify-end gap-2 border-t border-[#eef1f5] pt-3">
                                <button
                                  type="button"
                                  title={`View ${job.title || "Job"}`}
                                  aria-label={`View ${job.title || "Job"}`}
                                  onClick={() =>
                                    navigate(
                                      `/admin/job-requirements/${job.id}`,
                                    )
                                  }
                                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                                >
                                  <ChevronsRight size={14} strokeWidth={2.2} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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

export default EmployerProfile;