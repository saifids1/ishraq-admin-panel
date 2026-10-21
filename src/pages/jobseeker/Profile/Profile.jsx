import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText as FileIcon,
  MapPin,
  Download,
  Eye,
  Briefcase,
  Inbox,
  UserRound,
  ExternalLink,
} from "lucide-react";
import { getCurrentUserId } from "../../../utils/authUtils";
import jobseekerApi from "../../../api/Services/adjobseekerApi";

/* ---------------- Design tokens (match JobSeekerDetails) ---------------- */
const T = {
  radius: "rounded-lg",
  border: "border-[#e3e8ee]",
  bg: "bg-[#f4f8fb]",
  surface: "bg-white",
  text: "text-[#1a2b3c]",
  textMuted: "text-[#5b6b7c]",
  textFaint: "text-[#8895a4]",
};

const FIELD_LABEL = `text-[11.5px] font-semibold uppercase tracking-wide ${T.textFaint}`;
const FIELD_BOX = (mono) =>
  `flex h-9 items-center rounded-md border ${T.border} bg-[#fbfcfd] px-3 text-[13px] font-medium ${T.text} ${
    mono ? "font-mono text-[12.5px]" : ""
  }`;

const BTN_PRIMARY =
  "inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]";

const CARD_SHADOW = "shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

const NAV = [
  { id: "overview", label: "Overview", icon: UserRound },
  { id: "preferences", label: "Location & Preferences", icon: MapPin },
  { id: "resume", label: "Documents", icon: FileIcon },
  // { id: "jobs", label: "Applied Jobs", icon: Briefcase },
];

/* ---------------- Formatters ---------------- */
const isBlank = (v) => v === null || v === undefined || String(v).trim() === "";

const val = (v) => (isBlank(v) ? "—" : String(v).trim());

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

const formatYears = (v) => (isBlank(v) ? "—" : `${Number(v)} yrs`);

const formatMoney = (v) =>
  isBlank(v) || Number.isNaN(Number(v))
    ? "—"
    : `₹ ${Number(v).toLocaleString("en-IN")}`;

const yesNo = (v) => (v === true ? "Yes" : v === false ? "No" : "—");

// Joins the stored file path with the API base URL.
const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const buildFileUrl = (path) => {
  if (isBlank(path)) return "";
  const value = String(path).trim();
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE_URL}/${value.replace(/\\/g, "/").replace(/^\/+/, "")}`;
};

/* ---------------- Request helper (dedupes StrictMode double calls) ---------------- */
const jobseekerRequests = new Map();

const getJobseekerRequest = (userId) => {
  if (!jobseekerRequests.has(userId)) {
    const request = jobseekerApi.getById(userId).then(
      (response) => {
        jobseekerRequests.delete(userId);
        return response;
      },
      (error) => {
        jobseekerRequests.delete(userId);
        throw error;
      },
    );
    jobseekerRequests.set(userId, request);
  }
  return jobseekerRequests.get(userId);
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ??
  error?.response?.data?.Message ??
  error?.message ??
  "Unable to load jobseeker details. Please try again.";

/* ---------------- Shared pieces ---------------- */
const Field = ({ label, value, mono, href, span = "" }) => {
  const text = val(value);
  return (
    <div className={`flex flex-col gap-1.5 ${span}`}>
      <label className={FIELD_LABEL}>{label}</label>
      <div className={FIELD_BOX(mono)}>
        <span className="min-w-0 flex-1 truncate">
          {href && text !== "—" ? (
            <a
              href={href}
              className="inline-flex items-center gap-1 text-[#1e5a7a] hover:underline"
            >
              {text} <ExternalLink size={11} />
            </a>
          ) : (
            text
          )}
        </span>
      </div>
    </div>
  );
};

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
          <a
            href={doc.url}
            download={doc.name}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#2f6b8a] text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
          >
            <Download size={13} /> Download
          </a>
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

const Panel = ({ children }) => (
  <section className={`${T.surface} ${T.radius} border ${T.border} ${CARD_SHADOW}`}>
    <div className="p-4">{children}</div>
  </section>
);

const Grid = ({ children }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
);

const StateCard = ({ icon, title, subtitle, action }) => (
  <div className={`min-h-full ${T.bg} p-6`}>
    <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-12 text-center">
      {icon}
      <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>{title}</p>
      {subtitle && <p className={`mt-1 text-[13px] ${T.textMuted}`}>{subtitle}</p>}
      {action}
    </div>
  </div>
);

/* ---------------- Page ---------------- */
const JobseekerOverview = () => {
  const navigate = useNavigate();

  const [jobseeker, setJobseeker] = useState(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error("Your login session could not be identified. Please sign in again.");
        }

        const response = await getJobseekerRequest(userId);
        // Handles { success, data: {...} } whether or not the axios wrapper is present.
        const record = response?.data?.data ?? response?.data ?? response;

        if (!record || record.jB_jobseeker_id === undefined) {
          throw new Error("The jobseeker details were not returned by the API.");
        }

        if (!cancelled) setJobseeker(record);
      } catch (err) {
        if (!cancelled) {
          setJobseeker(null);
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <StateCard
        icon={
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#2f6b8a] border-t-transparent" />
        }
        title="Loading jobseeker…"
      />
    );
  }

  /* ---------- Error ---------- */
  if (error || !jobseeker) {
    return (
      <StateCard
        icon={<UserRound size={28} className="mx-auto text-[#8895a4]" />}
        title={error || "Jobseeker not found"}
        subtitle="The details could not be loaded right now."
        action={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={`mt-4 ${BTN_PRIMARY}`}
          >
            Try again
          </button>
        }
      />
    );
  }

  const active = !!jobseeker.jB_is_active;
  const cvUrl = buildFileUrl(jobseeker.jB_cv_file_path);
  const cvName = isBlank(jobseeker.jB_cv_file_path)
    ? ""
    : jobseeker.jB_cv_file_path.split(/[\\/]/).pop();
  const cvDoc = cvUrl ? { name: cvName, url: cvUrl } : null;

  return (
    <div className={`min-h-full ${T.bg}`}>
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* MAIN HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-800">
              {jobseeker.fullName || "My Profile Details"}
            </h2>

            <button
              type="button"
              onClick={() => navigate(`/jobseeker/profile/${jobseeker.jB_jobseeker_id}/edit`)}
              className={BTN_PRIMARY}
            >
              Edit
            </button>
          </div>

          {/* BODY */}
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[170px_1fr]">
              {/* LEFT: vertical nav */}
              <aside className="md:sticky md:top-4 md:h-fit w-[11rem]">
                <nav
                  aria-label="Jobseeker sections"
                  className={`${T.surface} ${T.radius} border ${T.border} overflow-hidden p-1.5 ${CARD_SHADOW}`}
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
                  <Panel>
                    <Grid>
                      <Field label="Full Name" value={jobseeker.fullName} />
                      <Field label="Mobile Number" value={jobseeker.mobile} mono />
                      <Field label="WhatsApp Number" value={jobseeker.jB_whatsapp} mono />
                      <Field
                        label="Email Address"
                        value={jobseeker.email}
                        href={jobseeker.email ? `mailto:${jobseeker.email}` : undefined}
                      />
                      <Field label="Profession / Job Category" value={jobseeker.jobCategoryName} />
                      <Field label="Job Role" value={jobseeker.jobRoleName} />
                      <Field label="Highest Qualification" value={jobseeker.jB_highest_qualification} />
                      <Field label="Speciality / Department" value={jobseeker.jB_speciality} />
                      <Field
                        label="Professional Registration Number"
                        value={jobseeker.jB_registration_number}
                        mono
                      />
                      <Field label="Total Experience" value={formatYears(jobseeker.jB_total_experience)} />
                      <Field label="Current Designation" value={jobseeker.jB_current_designation} />
                      <Field label="Current Employer" value={jobseeker.jB_current_employer} />
                      <Field label="Current Salary" value={formatMoney(jobseeker.jB_current_salary)} />
                      <Field label="Institute Type" value={jobseeker.instituteTypeName} />
                      <Field label="Created At" value={formatDate(jobseeker.jB_created_at)} />
                      <Field label="Updated At" value={formatDate(jobseeker.jB_updated_at)} />
                      <Field label="Status" value={active ? "Active" : "Inactive"} />
                    </Grid>
                  </Panel>
                )}

                {/* -------- Location & Preferences -------- */}
                {tab === "preferences" && (
                  <Panel>
                    <Grid>
                      <Field label="Country" value={jobseeker.countryName} />
                      <Field label="State" value={jobseeker.stateName} />
                      <Field label="City" value={jobseeker.cityName} />
                      <Field
                        label="Preferred Job Location"
                        value={jobseeker.jB_preferredLocationName ?? jobseeker.jB_preferred_locationName}
                      />
                      <Field label="Expected Salary" value={formatMoney(jobseeker.jB_expected_salary)} />
                      <Field label="Willing to Relocate?" value={yesNo(jobseeker.jB_willing_to_relocate)} />
                      <Field
                        label="Availability to Join"
                        value={formatDate(jobseeker.jB_availability_to_join)}
                      />
                      <Field label="Consent Given" value={yesNo(jobseeker.jB_consent_given)} />
                      <Field label="Consent At" value={formatDate(jobseeker.jB_consent_at)} />
                    </Grid>
                  </Panel>
                )}

                {/* -------- Documents (Resume/CV only) -------- */}
                {tab === "resume" && (
                  <Panel>
                    <Grid>
                      <div className="flex flex-col gap-1.5">
                        <label className={FIELD_LABEL}>Resume / CV</label>
                        <DocumentBox doc={cvDoc} />
                      </div>
                    </Grid>
                  </Panel>
                )}

               
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobseekerOverview;