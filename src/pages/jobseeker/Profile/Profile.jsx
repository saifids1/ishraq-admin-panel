import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronsLeft, Download, ExternalLink, UserRound } from "lucide-react";
import { getCurrentUserId } from "../../../utils/authUtils";
import  jobseekerApi  from "../../../api/Services/adjobseekerApi"; // adjust to your API function name

/* ---------------- Design tokens (same as employer/admin profile) ---------------- */
const T = {
  radius: "rounded-lg",
  border: "border-[#e3e8ee]",
  bg: "bg-[#f4f8fb]",
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

// Joins the stored file path with the API base URL, as in the job requirement view.
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

/* ---------------- Page ---------------- */
const JobseekerOverview = () => {
  const navigate = useNavigate();

  const [jobseeker, setJobseeker] = useState(null);
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
      <div className={`min-h-full ${T.bg} p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-12 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#2f6b8a] border-t-transparent" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>Loading jobseeker…</p>
        </div>
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error || !jobseeker) {
    return (
      <div className={`min-h-full ${T.bg} p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-12 text-center">
          <UserRound size={28} className="mx-auto text-[#8895a4]" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>
            {error || "Jobseeker not found"}
          </p>
          <p className={`mt-1 text-[13px] ${T.textMuted}`}>
            The details could not be loaded right now.
          </p>
          <button type="button" onClick={() => window.location.reload()} className={`mt-4 ${BTN_PRIMARY}`}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const cvUrl = buildFileUrl(jobseeker.jB_cv_file_path);
  const cvName = isBlank(jobseeker.jB_cv_file_path)
    ? ""
    : jobseeker.jB_cv_file_path.split("/").pop();

  const fields = [
    // { label: "Jobseeker No.", value: jobseeker.jB_jobseeker_no, mono: true },
    { label: "Full Name", value: jobseeker.fullName },
    // { label: "Username", value: jobseeker.userName },
    { label: "Email", value: jobseeker.email },
    { label: "Mobile", value: jobseeker.mobile, mono: true },
    { label: "WhatsApp", value: jobseeker.jB_whatsapp, mono: true },
    { label: "Country", value: jobseeker.countryName },
    { label: "State", value: jobseeker.stateName },
    { label: "City", value: jobseeker.cityName },
    { label: "Institute Type", value: jobseeker.instituteTypeName },
    { label: "Job Category", value: jobseeker.jobCategoryName },
    { label: "Job Role", value: jobseeker.jobRoleName },
    { label: "Highest Qualification", value: jobseeker.jB_highest_qualification },
    { label: "Speciality", value: jobseeker.jB_speciality },
    { label: "Professional Registration Number", value: jobseeker.jB_registration_number, mono: true },
    { label: "Total Experience", value: formatYears(jobseeker.jB_total_experience) },
    { label: "Current Designation", value: jobseeker.jB_current_designation },
    { label: "Current Employer", value: jobseeker.jB_current_employer },
    { label: "Current Salary", value: formatMoney(jobseeker.jB_current_salary) },
    { label: "Expected Salary", value: formatMoney(jobseeker.jB_expected_salary) },
    { label: "Preferred Location", value: jobseeker.jB_preferredLocationName ?? jobseeker.jB_preferred_locationName },
    { label: "Willing to Relocate", value: yesNo(jobseeker.jB_willing_to_relocate) },
    { label: "Availability to Join", value: formatDate(jobseeker.jB_availability_to_join) },
    { label: "Consent Given", value: yesNo(jobseeker.jB_consent_given) },
    { label: "Consent At", value: formatDate(jobseeker.jB_consent_at) },
    { label: "Created At", value: formatDate(jobseeker.jB_created_at) },
    { label: "Updated At", value: formatDate(jobseeker.jB_updated_at) },
    { label: "Status", value: jobseeker.jB_is_active ? "Active" : "Inactive" },
  ];

  return (
    <div className={`min-h-full ${T.bg}`}>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
         

            <h2 className="font-semibold text-slate-800">My Profile Details</h2>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/jobseeker/profile/${jobseeker.jB_jobseeker_id}/edit`)}
            className={BTN_PRIMARY}
          >
            Edit Profile
          </button>
        </div>

        {/* Body */}
        <section className="p-4">
          <div className={`${T.radius} border ${T.border} bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {fields.map((field) => (
                <div key={field.label} className="flex flex-col gap-1.5">
                  <label className={FIELD_LABEL}>{field.label}</label>
                  <div className={FIELD_BOX(field.mono)}>
                    <span className="min-w-0 flex-1 truncate">{val(field.value)}</span>
                  </div>
                </div>
              ))}

              {/* CV spans the full row */}
              <div className="flex flex-col gap-1.5 sm:col-span-2 xl:col-span-3">
                <label className={FIELD_LABEL}>CV / Resume</label>
                <div className={FIELD_BOX()}>
                  {cvUrl ? (
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open CV in a new tab"
                      className="inline-flex min-w-0 items-center gap-2 truncate text-[#1e5a7a] hover:underline"
                    >
                      <Download size={13} className="shrink-0" />
                      <span className="truncate">{cvName}</span>
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                  ) : (
                    <span className="text-[#8895a4]">Not uploaded</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default JobseekerOverview;