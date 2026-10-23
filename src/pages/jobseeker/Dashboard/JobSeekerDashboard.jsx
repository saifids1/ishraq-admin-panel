import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Sparkles,
  UserRound,
  MessageSquareText,
  CircleAlert,
  CalendarDays,
  Search,
  MapPin,
  Building2,
  Eye,
  ChevronRight,
} from "lucide-react";
import dayjs from "dayjs";
import {
  StatCardGrid,
  DashboardHeader,
  Panel,
  KitStyles,
} from "../../../components/common/Dashboardkit";
import { getJobsForJobseeker } from "../../../api/jobRequirementApi";
import jobseekerApi from "../../../api/Services/adjobseekerApi";
import { getCurrentUserId } from "../../../utils/authUtils";
import ProfileOverviewCard, {
  getProfileCompletion,
} from "./ProfileOverviewCard";

const PAGE_SIZE = 10;

/* ---------------- Feedback & complaints (sample data, replace with your API) ---------------- */
const FEEDBACK_SUMMARY = { feedback: 4, complaints: 1 };

const toCount = (n) => {
  const num = Number(n);
  return Number.isFinite(num) ? num : 0;
};

/* ---------------- Profile completion checklist ---------------- */
const hasText = (v) => v !== null && v !== undefined && String(v).trim() !== "";
const hasNumber = (v) => hasText(v) && !Number.isNaN(Number(v));

const PROFILE_CHECKS = [
  { label: "Full name", done: (p) => hasText(p.fullName) },
  { label: "Email", done: (p) => hasText(p.email) },
  { label: "Mobile number", done: (p) => hasText(p.mobile) },
  { label: "WhatsApp number", done: (p) => hasText(p.jB_whatsapp) },
  { label: "Country", done: (p) => hasNumber(p.jB_country_id) },
  { label: "State", done: (p) => hasNumber(p.jB_state_id) },
  { label: "City", done: (p) => hasNumber(p.jB_city_id) },
  { label: "Institute type", done: (p) => hasNumber(p.jB_institute_type_id) },
  { label: "Job category", done: (p) => hasNumber(p.jB_job_category_id) },
  { label: "Job role", done: (p) => hasNumber(p.jB_job_role_id) },
  {
    label: "Highest qualification",
    done: (p) => hasText(p.jB_highest_qualification),
  },
  { label: "Speciality", done: (p) => hasText(p.jB_speciality) },
  {
    label: "Registration number",
    done: (p) => hasText(p.jB_registration_number),
  },
  { label: "Total experience", done: (p) => hasNumber(p.jB_total_experience) },
  {
    label: "Current designation",
    done: (p) => hasText(p.jB_current_designation),
  },
  { label: "Current employer", done: (p) => hasText(p.jB_current_employer) },
  { label: "Expected salary", done: (p) => hasNumber(p.jB_expected_salary) },
  {
    label: "Preferred location",
    done: (p) => hasNumber(p.jB_preferred_location),
  },
  {
    label: "Availability to join",
    done: (p) => hasText(p.jB_availability_to_join),
  },
  { label: "CV / resume", done: (p) => hasText(p.jB_cv_file_path) },
  { label: "Work experience", done: (p) => (p.experiences?.length ?? 0) > 0 },
  { label: "Education", done: (p) => (p.educations?.length ?? 0) > 0 },
];

/* ---------------- Job helpers (same logic as JobsForYou) ---------------- */
const normalizeKeys = (item) =>
  Object.fromEntries(
    Object.entries(item ?? {}).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );

const findBody = (response) =>
  [response?.data?.data, response?.data, response].find(
    (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      ("totalRecords" in candidate || "TotalRecords" in candidate),
  ) ?? {};

const getRows = (body) => {
  const rows = body?.data ?? body?.Data ?? body?.items ?? body?.Items;
  return Array.isArray(rows) ? rows : [];
};

const normalizeJob = (item) => {
  const row = normalizeKeys(item);
  const get = (...keys) => {
    for (const key of keys) {
      const value = row[key.toLowerCase()];
      if (hasText(value)) return value;
    }
    return undefined;
  };

  return {
    id: get("jQ_job_requirement_id"),
    employerName: get("employerName") ?? "",
    position: get("jQ_position_title") ?? "Untitled position",
    location: get("jobLocationName") ?? "-",
    vacancies: get("jQ_vacancies") ?? 0,
    deadline: get("jQ_deadline"),
    applied: get("jobseekerApplied") === true,
  };
};

const formatDeadline = (value) =>
  hasText(value) && dayjs(value).isValid()
    ? dayjs(value).format("DD-MM-YYYY")
    : "-";

const isRequestFailure = (response) =>
  response?.success === false ||
  response?.Success === false ||
  response?.data?.success === false ||
  response?.data?.Success === false;

const getRequestFailureMessage = (response) =>
  response?.message ||
  response?.Message ||
  response?.data?.message ||
  response?.data?.Message ||
  "Unable to load matching jobs.";

/* ---------------- Dashboard ---------------- */
const JobSeekerDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const completion = useMemo(() => getProfileCompletion(profile), [profile]);
  const { percent, doneCount, total: checksTotal } = completion;
  const percentText = profileLoading ? "—" : `${percent}%`;

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");

  const [query, setQuery] = useState("");

  /* Load the logged-in jobseeker's profile */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error("Your login session could not be identified.");
        }

        const response = await jobseekerApi.getById(userId);
        const record = response?.data?.data ?? response?.data ?? response;

        if (!record || record.jB_jobseeker_id === undefined) {
          throw new Error("Your profile details were not returned.");
        }

        if (!cancelled) setProfile(record);
      } catch (err) {
        if (!cancelled) {
          setProfile(null);
          setJobsLoading(false);
          setJobsError(err?.message || "Unable to load your profile.");
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const jobseekerId = profile?.jB_jobseeker_id;
  const instituteTypeId = profile?.jB_institute_type_id;
  const jobRoleId = profile?.jB_job_role_id;
  const jobCategoryId = profile?.jB_job_category_id;

  /* Load matching jobs once the profile is known */
  useEffect(() => {
    if (!jobseekerId) return;

    if (!instituteTypeId || !jobRoleId || !jobCategoryId) {
      setJobs([]);
      setJobsLoading(false);
      setJobsError(
        "Add your institute type, job category and job role to see matching jobs.",
      );
      return;
    }

    let cancelled = false;

    const load = async () => {
      setJobsLoading(true);
      setJobsError("");

      try {
        const response = await getJobsForJobseeker({
          instituteTypeId: Number(instituteTypeId),
          jobRoleId: Number(jobRoleId),
          jobCategoryId: Number(jobCategoryId),
          jobseekerId: Number(jobseekerId),
          pageNo: 1,
          pageSize: PAGE_SIZE,
        });

        if (isRequestFailure(response)) {
          throw new Error(getRequestFailureMessage(response));
        }

        const rows = getRows(findBody(response)).map(normalizeJob);
        if (!cancelled) setJobs(rows);
      } catch (err) {
        if (!cancelled) {
          setJobs([]);
          setJobsError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load matching jobs.",
          );
        }
      } finally {
        if (!cancelled) setJobsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [jobseekerId, instituteTypeId, jobRoleId, jobCategoryId]);

  /* Only jobs the jobseeker has not applied to yet */
  const unappliedJobs = useMemo(
    () => jobs.filter((job) => !job.applied),
    [jobs],
  );

  const visibleJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unappliedJobs;

    return unappliedJobs.filter((job) =>
      [job.position, job.employerName, job.location]
        .filter(hasText)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [unappliedJobs, query]);

 const kpis = [
  {
    title: "Profile completion in %",
    value: toCount(profileLoading ? 0 : percent),
    note: `${doneCount} of ${checksTotal} sections`,
    icon: UserRound,
    color: "#0ea5e9",
    color2: "#2563eb",
  },
  {
    title: "Jobs for you",
    value: toCount(unappliedJobs.length),
    note: "not applied yet",
    icon: Sparkles,
    color: "#6366f1",
    color2: "#8b5cf6",
  },
  {
    title: "Feedback",
    value: 0,
    note: "received",
    icon: MessageSquareText,
    color: "#10b981",
    color2: "#059669",
  },
  {
    title: "Complaints",
    value: 0,
    note: "raised",
    icon: CircleAlert,
    color: "#f59e0b",
    color2: "#ef4444",
  },
];

  const jobsLoadingNow = profileLoading || jobsLoading;

  return (
    <div className="isharq-dash min-h-full bg-slate-50 pb-4">
      <KitStyles />

      <DashboardHeader
        title="My Job Search"
        subtitle="Jobs picked for you, and your profile progress"
        pills={[
          { value: profileLoading ? 0 : percent, label: "Profile %" },
          { value: unappliedJobs.length, label: "For you" },
        ]}
      />

      <StatCardGrid items={kpis} />

      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* Jobs for you */}
        <Panel
          className="xl:col-span-2"
          title="Jobs for you"
          subtitle="Jobs you haven't applied to yet"
          icon={Briefcase}
          action={
            <label className="relative min-w-[150px]">
              <span className="sr-only">Search jobs</span>
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search job, company or city"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-[#2f6b8a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2f6b8a]/20"
              />
            </label>
          }
        >
          {jobsLoadingNow ? (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-500">
              Finding jobs that match your profile…
            </p>
          ) : jobsError ? (
            <p className="rounded-xl bg-rose-50 px-3 py-4 text-center text-[11px] text-rose-600">
              {jobsError}
            </p>
          ) : visibleJobs.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-500">
              {unappliedJobs.length === 0
                ? "You've applied to all matching jobs right now."
                : "No jobs match your search."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {visibleJobs.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-slate-800">
                      {job.position}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Building2 size={10} /> {job.employerName || "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays size={10} />{" "}
                        {formatDeadline(job.deadline)}
                      </span>
                      <span className="font-medium text-slate-500">
                        {job.vacancies} vacanc
                        {Number(job.vacancies) === 1 ? "y" : "ies"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/jobseeker/jobs/${job.id}`)}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-[#2f6b8a] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#265976] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6b8a]"
                  >
                    <Eye size={12} />
                    View & apply
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Profile completion */}
        <Panel
          title="My profile"
          subtitle="Complete it to get better matches"
          icon={UserRound}
        >
          <ProfileOverviewCard
            profile={profile}
            loading={profileLoading}
            onOpenProfile={() => navigate("/jobseeker/profile")}
          />
        </Panel>
      </div>
    </div>
  );
};

export default JobSeekerDashboard;
