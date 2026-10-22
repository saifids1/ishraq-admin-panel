import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronsLeft, ExternalLink, LoaderCircle, Pencil } from "lucide-react";

import { getJobRequirementById } from "../../../api/jobRequirementApi";

const LIST_PATH = "/employer/job-requirement-list";
const detailEditPath = (id) => `/employer/job-requirements/${id}/edit`;

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "").replace(
  /\/+$/,
  "",
);

const FIELD_LABEL = "text-[13px] font-semibold text-black leading-tight";

/* ======================== HELPERS ======================== */

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const text = (value) => (hasValue(value) ? String(value).trim() : "-");

// Builds a full URL for a stored file path. Absolute URLs are returned unchanged.
const buildFileUrl = (path) => {
  if (!hasValue(path)) return "";

  const value = String(path).trim();
  if (/^https?:\/\//i.test(value)) return value;

  // Normalize Windows-style slashes and remove leading slashes so the
  // base URL and path join with exactly one "/".
  const cleanPath = value.replace(/\\/g, "/").replace(/^\/+/, "");

  return `${API_BASE_URL}/${cleanPath}`;
};

// Keys in the API are inconsistent (jQ_, JQ_, jq_), so every key is lower-cased for lookup.
const toLowerKeys = (obj) =>
  Object.fromEntries(
    Object.entries(obj ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );

// Unwraps { data: {...} } or { Data: {...} } response shapes.
const unwrap = (response) => {
  let current = response;

  for (let i = 0; i < 3; i += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current))
      break;

    const next = current.data ?? current.Data;
    if (next === undefined || next === null) break;
    current = next;
  }

  return current;
};

const yesNo = (value) => {
  if (value === true || value === 1) return "Yes";
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "true" || normalized === "1") return "Yes";
  if (normalized === "false" || normalized === "0") return "No";
  return "-";
};

// Trims fractions past milliseconds (e.g. "2026-10-16T15:42:08.2901637")
// so every browser parses the date.
const formatDate = (value, withTime = false) => {
  if (!hasValue(value)) return "-";

  const cleaned = String(value).replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

const fileNameFromPath = (path) =>
  hasValue(path) ? String(path).split(/[\\/]/).pop() : "";

const normalizeJob = (raw) => {
  const row = toLowerKeys(raw);

  const get = (...keys) => {
    for (const key of keys) {
      const value = row[key.toLowerCase()];
      if (hasValue(value)) return value;
    }
    return undefined;
  };

  return {
    id: get("jQ_job_requirement_id"),
    requirementNumber: get("jQ_job_re_id"),
    position: get("jQ_position_title"),
    employerName: get("employerName"),
    instituteType: get("instituteTypeName"),
    jobRole: get("jobRoleName"),
    jobCategory: get("jobCategoryName"),
    status: get("jobStatusName"),
    employmentType: get("employmentTypeName"),
    department: get("jQ_department_speciality"),
    vacancies: get("jQ_vacancies"),
    location: get("jobLocationName"),
    qualification: get("jQ_qualification_required"),
    experience: get("jQ_experience_required"),
    salary: get("jQ_salary_range"),
    dutyHours: get("jQ_duty_hours"),
    accommodation: row["jq_accommodation"],
    food: row["jq_food_facility"],
    joiningDate: get("jQ_expected_joining_date"),
    deadline: get("jQ_deadline"),
    createdAt: get("jQ_created_at"),
    updatedAt: get("jQ_updated_at"),
    description: get("jQ_description"),
    attachmentPath: get("jQ_jd_file_path"),
  };
};

const STATUS_STYLES = {
  open: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  paused: "bg-amber-50 text-amber-700 ring-amber-200",
  closed: "bg-slate-100 text-slate-600 ring-slate-200",
};

const getStatusStyle = (status = "") =>
  STATUS_STYLES[status.trim().toLowerCase()] ??
  "bg-slate-50 text-slate-600 ring-slate-200";

/* ======================== LAYOUT HELPERS (same as EditJobSeeker) ======================== */

const SectionTitle = ({ children }) => (
  <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
    {children}
  </h3>
);

const FieldRow = ({ label, fullWidth = false, children }) => (
  <div
    className={`grid grid-cols-[160px_1fr] items-start gap-3 ${
      fullWidth ? "md:col-span-2" : ""
    }`}
  >
    <span className={`${FIELD_LABEL} pt-2`}>{label}</span>
    <div className="min-w-0">{children}</div>
  </div>
);

// Read-only value styled like the form inputs so it reads the same but cannot be edited.
const ReadOnlyValue = ({ children, multiline = false }) => (
  <div
    className={`w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 ${
      multiline
        ? "min-h-[120px] whitespace-pre-line leading-relaxed"
        : "min-h-[38px] break-words"
    }`}
  >
    {children}
  </div>
);

/* ======================== PAGE ======================== */

export default function JobRequirementView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError("Invalid job requirement ID.");
      setLoading(false);
      return undefined;
    }

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getJobRequirementById(numericId);

        if (response?.Success === false || response?.success === false) {
          throw new Error(
            response?.Message ||
              response?.message ||
              "Job requirement not found.",
          );
        }

        const record = unwrap(response);

        if (
          !record ||
          typeof record !== "object" ||
          !toLowerKeys(record).jq_job_requirement_id
        ) {
          throw new Error("Job requirement not found.");
        }

        if (!cancelled) setRaw(record);
      } catch (err) {
        if (!cancelled) {
          setRaw(null);
          setError(
            err?.response?.data?.Message ||
              err?.response?.data?.message ||
              err?.message ||
              "Failed to load job requirement.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const job = useMemo(() => (raw ? normalizeJob(raw) : null), [raw]);

  const header = (
    <div className="flex flex-wrap justify-between gap-3 border-b border-slate-200 px-6 py-4">
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
        <h2 className="font-semibold text-slate-800">View Job Requirement</h2>
      </div>

    </div>
  );

  if (loading) {
    return (
      <div className="min-h-full bg-[#f4f8fb]">
        <div className="mx-auto">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {header}
            <div className="p-8 text-center text-sm text-slate-500">
              Loading job requirement...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-full bg-[#f4f8fb]">
        <div className="mx-auto">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {header}
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                Could not load job requirement
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {error || "Job requirement not found."}
              </p>
              <button
                type="button"
                onClick={() => navigate(LIST_PATH)}
                className="mt-4 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
              >
                Back to list
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const attachmentName = fileNameFromPath(job.attachmentPath);
  const attachmentUrl = buildFileUrl(job.attachmentPath);

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {header}

          <div className="space-y-6 p-4">
            {/* JOB INFORMATION */}
            <section>
              <SectionTitle>Job Information</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow label="Employer">
                  <ReadOnlyValue>{text(job.employerName)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Job Type">
                  <ReadOnlyValue>{text(job.instituteType)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Job Category">
                  <ReadOnlyValue>{text(job.jobCategory)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Job Role">
                  <ReadOnlyValue>{text(job.jobRole)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Position Title">
                  <ReadOnlyValue>{text(job.position)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Department / Speciality">
                  <ReadOnlyValue>{text(job.department)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Number of Vacancies">
                  <ReadOnlyValue>{text(job.vacancies)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Employment Type">
                  <ReadOnlyValue>{text(job.employmentType)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Qualification Required">
                  <ReadOnlyValue>{text(job.qualification)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Experience Required">
                  <ReadOnlyValue>{text(job.experience)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Salary Range">
                  <ReadOnlyValue>{text(job.salary)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Duty Hours">
                  <ReadOnlyValue>{text(job.dutyHours)}</ReadOnlyValue>
                </FieldRow>
              </div>
            </section>

            {/* FACILITIES & DATES */}
            <section>
              <SectionTitle>Facilities & Dates</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow label="Accommodation">
                  <ReadOnlyValue>{yesNo(job.accommodation)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Food Facility">
                  <ReadOnlyValue>{yesNo(job.food)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Expected Joining Date">
                  <ReadOnlyValue>{formatDate(job.joiningDate)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Application Deadline">
                  <ReadOnlyValue>{formatDate(job.deadline)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Created On">
                  <ReadOnlyValue>{formatDate(job.createdAt, true)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Last Updated">
                  <ReadOnlyValue>{formatDate(job.updatedAt, true)}</ReadOnlyValue>
                </FieldRow>
              </div>
            </section>

            {/* LOCATION */}
            <section>
              <SectionTitle>Job Location</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow label="Location">
                  <ReadOnlyValue>{text(job.location)}</ReadOnlyValue>
                </FieldRow>
              </div>
            </section>

            {/* DESCRIPTION & ATTACHMENT */}
            <section>
              <SectionTitle>Description & Attachment</SectionTitle>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <FieldRow label="Job Description" fullWidth>
                  <ReadOnlyValue multiline>{text(job.description)}</ReadOnlyValue>
                </FieldRow>

                <FieldRow label="Attachment" fullWidth>
                  {attachmentUrl ? (
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open attachment in a new tab"
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-[#1e5a7a] transition hover:bg-[#eaf3f7]"
                    >
                      <span className="min-w-0 break-all">{attachmentName}</span>
                      <ExternalLink size={14} className="shrink-0" />
                    </a>
                  ) : (
                    <ReadOnlyValue>No attachment uploaded.</ReadOnlyValue>
                  )}
                </FieldRow>
              </div>
            </section>

            {/* FOOTER */}
            <div className="flex justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => navigate(LIST_PATH)}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Back to List
              </button>

              <button
                type="button"
                onClick={() => navigate(detailEditPath(id))}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
              >
                <Pencil size={15} />
                Edit Job Requirement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}