import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Hotel,
  Layers,
  LoaderCircle,
  MapPin,
  Paperclip,
  Pencil,
  Tag,
  Timer,
  Users,
  Utensils,
  Wallet,
  ExternalLink,
} from "lucide-react";

import { getJobRequirementById } from "../../../api/jobRequirementApi";
import {
  ACCENT,
  Card,
  Field,
  IconField,
  PageHeader,
} from "../../../components/common/FormUi";

/* ======================== HELPERS ======================== */

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "").replace(
  /\/+$/,
  "",
);

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

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const text = (value) => (hasValue(value) ? String(value).trim() : "-");

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
  hasValue(path) ? path.split("/").pop() : "";

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

/* ======================== SUB-COMPONENTS ======================== */

// Read-only value styled like the form inputs, so it looks the same
// but cannot be edited.
const ReadOnlyValue = ({ icon: Icon, children, multiline = false }) => {
  const box = (
    <div
      className={`w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 ${
        Icon ? "pl-10" : ""
      } ${
        multiline
          ? "min-h-[120px] whitespace-pre-line leading-relaxed"
          : "min-h-[42px] break-words"
      }`}
    >
      {children}
    </div>
  );

  return Icon ? <IconField icon={Icon}>{box}</IconField> : box;
};

/* ======================== PAGE ======================== */

export default function JobRequiremnetDetails() {
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white p-6">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <LoaderCircle
            className="animate-spin"
            style={{ color: ACCENT }}
            size={20}
          />
          Loading job requirement...
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-full bg-white p-4">
        <button
          type="button"
          onClick={() => navigate("/employer/job-requirement-list")}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to list
        </button>
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-5 text-red-700 shadow-sm">
          <h1 className="font-semibold">Could not load job requirement</h1>
          <p className="mt-1 text-sm">
            {error || "Job requirement not found."}
          </p>
        </div>
      </div>
    );
  }

  const attachmentName = fileNameFromPath(job.attachmentPath);
  const attachmentUrl = buildFileUrl(job.attachmentPath);

  return (
    <div className="min-h-full bg-white text-slate-800">
      <PageHeader
        title="View Job Requirement"
        onBack={() => navigate(-1)}
        right={
          <div className="flex items-center gap-2">
            {job.status && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusStyle(
                  job.status,
                )}`}
              >
                {job.status}
              </span>
            )}

            
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4">
        <Card title="Job Information" icon={Briefcase}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Employer">
              <ReadOnlyValue icon={Building2}>
                {text(job.employerName)}
              </ReadOnlyValue>
            </Field>

            <Field label="Job Type">
              <ReadOnlyValue icon={Building2}>
                {text(job.instituteType)}
              </ReadOnlyValue>
            </Field>

            <Field label="Job Role">
              <ReadOnlyValue icon={Briefcase}>
                {text(job.jobRole)}
              </ReadOnlyValue>
            </Field>

            <Field label="Job Category">
              <ReadOnlyValue icon={Tag}>{text(job.jobCategory)}</ReadOnlyValue>
            </Field>

            <Field label="Position Title">
              <ReadOnlyValue icon={ClipboardList}>
                {text(job.position)}
              </ReadOnlyValue>
            </Field>

            <Field label="Department / Speciality">
              <ReadOnlyValue icon={Layers}>
                {text(job.department)}
              </ReadOnlyValue>
            </Field>

            <Field label="Number of Vacancies">
              <ReadOnlyValue icon={Users}>{text(job.vacancies)}</ReadOnlyValue>
            </Field>

            <Field label="Employment Type">
              <ReadOnlyValue icon={Activity}>
                {text(job.employmentType)}
              </ReadOnlyValue>
            </Field>

            <Field label="Qualification Required">
              <ReadOnlyValue icon={GraduationCap}>
                {text(job.qualification)}
              </ReadOnlyValue>
            </Field>

            <Field label="Experience Required">
              <ReadOnlyValue icon={Clock}>{text(job.experience)}</ReadOnlyValue>
            </Field>

            <Field label="Salary Range">
              <ReadOnlyValue icon={Wallet}>{text(job.salary)}</ReadOnlyValue>
            </Field>

            <Field label="Duty Hours">
              <ReadOnlyValue icon={Timer}>{text(job.dutyHours)}</ReadOnlyValue>
            </Field>
          </div>
        </Card>

        <Card title="Facilities & Dates" icon={CalendarDays}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Accommodation">
              <ReadOnlyValue icon={Hotel}>
                {yesNo(job.accommodation)}
              </ReadOnlyValue>
            </Field>

            <Field label="Food Facility">
              <ReadOnlyValue icon={Utensils}>{yesNo(job.food)}</ReadOnlyValue>
            </Field>

            <Field label="Expected Joining Date">
              <ReadOnlyValue icon={CalendarDays}>
                {formatDate(job.joiningDate)}
              </ReadOnlyValue>
            </Field>

            <Field label="Application Deadline">
              <ReadOnlyValue icon={CalendarDays}>
                {formatDate(job.deadline)}
              </ReadOnlyValue>
            </Field>

            <Field label="Created On">
              <ReadOnlyValue icon={CalendarDays}>
                {formatDate(job.createdAt, true)}
              </ReadOnlyValue>
            </Field>

            <Field label="Last Updated">
              <ReadOnlyValue icon={CalendarDays}>
                {formatDate(job.updatedAt, true)}
              </ReadOnlyValue>
            </Field>
          </div>
        </Card>

        <Card title="Job Location" icon={MapPin}>
          <Field label="Job Location">
            <ReadOnlyValue icon={MapPin}>{text(job.location)}</ReadOnlyValue>
          </Field>
        </Card>

        <Card title="Description & Attachment" icon={FileText}>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Job Description">
              <ReadOnlyValue multiline>{text(job.description)}</ReadOnlyValue>
            </Field>

            <Field label="Attachment">
              <IconField icon={Paperclip}>
                {attachmentUrl ? (
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open attachment in a new tab"
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-medium transition hover:bg-[#eaf3f7]"
                    style={{ color: ACCENT }}
                  >
                    <span className="min-w-0 break-all">{attachmentName}</span>
                    <ExternalLink size={14} className="shrink-0" />
                  </a>
                ) : (
                  <div className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-500">
                    No attachment uploaded.
                  </div>
                )}
              </IconField>
            </Field>
          </div>
        </Card>
      </div>

      <div className="mt-4 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={() => navigate("/employer/job-requirement-list")}
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back to List
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          {/* <Pencil size={15} /> */}
          Apply for job
        </button>
      </div>
    </div>
  );
}
