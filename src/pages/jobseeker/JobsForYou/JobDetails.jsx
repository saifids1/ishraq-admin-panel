import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  ChevronsLeft,
  ExternalLink,
  LoaderCircle,
} from "lucide-react";

import applicationApi from "../../../api/applicationApi";
import { getJobRequirementById } from "../../../api/jobRequirementApi";
import { getCurrentUserId } from "../../../utils/authUtils";
import StatusModal from "../../../components/common/StatusModal";

/* ======================== CONSTANTS ======================== */

const JOB_LIST_PATH = "/jobseeker/job-list";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "").replace(
  /\/+$/,
  "",
);

const FIELD_LABEL = "text-[13px] font-semibold text-black leading-tight";

/* ======================== HELPERS ======================== */

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const isValidId = (value) => Number.isInteger(value) && value > 0;

const text = (value) => (hasValue(value) ? String(value).trim() : "-");

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message ||
  err?.response?.data?.Message ||
  err?.message ||
  fallback;

/** Returns a copy of an object with all keys lowercased (shallow). */
const lowerKeys = (obj) =>
  Object.fromEntries(
    Object.entries(obj ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );

/** Case-insensitive lookup: returns the first key that has a value. */
const makePicker =
  (row) =>
  (...keys) => {
    for (const key of keys) {
      const value = row[key.toLowerCase()];
      if (hasValue(value)) return value;
    }
    return undefined;
  };

const buildFileUrl = (path) => {
  if (!hasValue(path)) return "";

  const value = String(path).trim();
  if (/^https?:\/\//i.test(value)) return value;

  const cleanPath = value.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${API_BASE_URL}/${cleanPath}`;
};

const fileNameFromPath = (path) =>
  hasValue(path) ? String(path).split(/[\\/]/).pop() : "";

/** Unwraps nested `{ data: ... }` envelopes (max 3 levels). */
const unwrap = (response) => {
  let current = response;

  for (let i = 0; i < 3; i += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      break;
    }

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

const formatDate = (value, withTime = false) => {
  if (!hasValue(value)) return "-";

  // Trim sub-millisecond precision (e.g. ".7471041" -> ".747")
  const cleaned = String(value).replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(cleaned);

  if (Number.isNaN(date.getTime())) return "-";

  const options = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {}),
  };

  return date
    .toLocaleString("en-GB", options)
    .replace(/\//g, "-")
    .replace(",", "")
    .replace(/\b(am|pm)\b/i, (period) => period.toUpperCase());
};
/** Extracts the application list from the API response. */
const extractApplications = (body) => {
  if (Array.isArray(body?.data?.data)) return body.data.data;
  if (Array.isArray(body?.data)) return body.data;
  return [];
};

const normalizeJob = (raw) => {
  const row = lowerKeys(raw);
  const pick = makePicker(row);

  const employer = lowerKeys(row.employer);
  const location = lowerKeys(row.joblocation);
  const instituteType = lowerKeys(row.institutetype);
  const jobRole = lowerKeys(row.jobrole);
  const jobCategory = lowerKeys(row.jobcategory);

  return {
    id: pick("jQ_job_requirement_id"),
    requirementNumber: pick("jQ_job_re_id"),
    position: pick("jQ_position_title"),
    employerName: pick("employerName") ?? employer.em_organization_name,
    instituteType: pick("instituteTypeName") ?? instituteType.name,
    jobRole: pick("jobRoleName") ?? jobRole.name,
    jobCategory: pick("jobCategoryName") ?? jobCategory.name,
    status: pick("jobStatusName"),
    employmentType: pick("employmentTypeName"),
    department: pick("jQ_department_speciality"),
    vacancies: pick("jQ_vacancies"),
    location: pick("jobLocationName") ?? location.ctm_cityname,
    qualification: pick("jQ_qualification_required"),
    experience: pick("jQ_experience_required"),
    salary: pick("jQ_salary_range"),
    dutyHours: pick("jQ_duty_hours"),
    accommodation: pick("jQ_accommodation"),
    food: pick("jQ_food_facility"),
    joiningDate: pick("jQ_expected_joining_date"),
    deadline: pick("jQ_deadline"),
    createdAt: pick("jQ_created_at"),
    updatedAt: pick("jQ_updated_at"),
    description: pick("jQ_description"),
    attachmentPath: pick("jQ_jd_file_path"),
  };
};

/* ======================== UI COMPONENTS ======================== */

const SectionTitle = ({ children }) => (
  <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
    {children}
  </h3>
);

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

/** Renders a two-column grid of [label, value] pairs. */
const InfoGrid = ({ items }) => (
  <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
    {items.map(([label, value]) => (
      <FieldRow key={label} label={label}>
        <ReadOnlyValue>{text(value)}</ReadOnlyValue>
      </FieldRow>
    ))}
  </div>
);

const PageHeader = ({ onBack, action }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        title="Back"
        aria-label="Back"
        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f]"
      >
        <ChevronsLeft size={18} strokeWidth={2} />
      </button>

      <h2 className="font-semibold text-slate-800">View Job Requirement</h2>
    </div>

    {action}
  </div>
);

const PageShell = ({ children }) => (
  <div className="min-h-full bg-[#f4f8fb]">
    <div className="mx-auto">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {children}
      </div>
    </div>
  </div>
);

/* ======================== PAGE ======================== */

export default function JobRequirementDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [appliedAt, setAppliedAt] = useState(null);
  const [checkingApplication, setCheckingApplication] = useState(true);
  const [applying, setApplying] = useState(false);

  const [modal, setModal] = useState(null);

  const job = useMemo(() => (raw ? normalizeJob(raw) : null), [raw]);

  /* ---------- modal helpers ---------- */

  const closeModal = () => setModal(null);

  const openStatus = (type, message, extra = {}) => {
    setModal({
      type,
      title: extra.title,
      message,
      confirmText: extra.confirmText || "OK",
      showCancel: false,
      onConfirm: () => {
        closeModal();
        extra.onConfirm?.();
      },
      onCancel: closeModal,
    });
  };

  const openConfirm = ({ title, message, confirmText, onConfirm }) => {
    setModal({
      type: "confirm",
      title,
      message,
      confirmText: confirmText || "Confirm",
      cancelText: "Cancel",
      showCancel: true,
      onConfirm: () => {
        closeModal();
        onConfirm?.();
      },
      onCancel: closeModal,
    });
  };

  /* ---------- load job requirement ---------- */

  useEffect(() => {
    const numericId = Number(id);

    if (!isValidId(numericId)) {
      setError("Invalid job requirement ID.");
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

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
          !lowerKeys(record).jq_job_requirement_id
        ) {
          throw new Error("Job requirement not found.");
        }

        if (!cancelled) setRaw(record);
      } catch (err) {
        if (!cancelled) {
          setRaw(null);
          setError(getErrorMessage(err, "Failed to load job requirement."));
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

  /* ---------- check existing application ---------- */

  useEffect(() => {
    const jobseekerId = Number(getCurrentUserId());
    const jobRequirementId = Number(id);

    setAlreadyApplied(false);
    setAppliedAt(null);

    if (!isValidId(jobseekerId) || !isValidId(jobRequirementId)) {
      setCheckingApplication(false);
      return undefined;
    }

    let cancelled = false;
    setCheckingApplication(true);

    const checkApplication = async () => {
      try {
        const response = await applicationApi.getApplicationsByJobseekerAndJob(
          jobseekerId,
          jobRequirementId,
        );

        const body = response?.data;
        const ok = body?.success === true || body?.Success === true;

        const match = extractApplications(body).find(
          (application) =>
            Number(application.aP_job_requirement_id) === jobRequirementId &&
            Number(application.aP_jobseeker_id) === jobseekerId &&
            application.aP_is_active !== false,
        );

        if (!cancelled) {
          setAlreadyApplied(ok && Boolean(match));
          setAppliedAt(match?.aP_created_at ?? null);
        }
      } catch (err) {
        console.error("Failed to check application status:", err);
      } finally {
        if (!cancelled) setCheckingApplication(false);
      }
    };

    checkApplication();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ---------- submit application ---------- */

  const submitApplication = async (jobseekerId, jobRequirementId) => {
    setApplying(true);

    try {
      const response = await applicationApi.applyForJob({
        AP_job_requirement_id: jobRequirementId,
        AP_jobseeker_id: jobseekerId,
        AP_remarks: "",
        AP_created_by: jobseekerId,
        AP_is_active: true,
      });

      const result = response?.data;
      const ok = Boolean(result?.success ?? result?.Success);
      const message = result?.message || result?.Message;

      if (ok) {
        setAlreadyApplied(true);
        setAppliedAt(result?.data?.aP_created_at ?? new Date().toISOString());

        openStatus("update", message || "Application submitted successfully.", {
          confirmText: "Continue",
          onConfirm: () => navigate(JOB_LIST_PATH),
        });
      } else {
        openStatus("error", message || "Failed to submit application.");
      }
    } catch (err) {
      openStatus(
        "error",
        getErrorMessage(err, "Failed to submit application."),
      );
    } finally {
      setApplying(false);
    }
  };

  const handleApply = () => {
    if (applying || alreadyApplied || checkingApplication) return;

    const jobseekerId = Number(getCurrentUserId());
    const jobRequirementId = Number(id);

    if (!isValidId(jobseekerId)) {
      openStatus("error", "Unable to identify your jobseeker profile.");
      return;
    }

    if (!isValidId(jobRequirementId)) {
      openStatus("error", "Invalid job requirement.");
      return;
    }

    openConfirm({
      title: "Confirm application",
      message: "Are you sure you want to apply for this job?",
      confirmText: "Apply",
      onConfirm: () => submitApplication(jobseekerId, jobRequirementId),
    });
  };

  /* ---------- header action (Applied badge or Apply button) ---------- */

  const headerAction = alreadyApplied ? (
    <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle2 size={16} strokeWidth={2.2} />
      Applied
      {appliedAt && (
        <span className="text-xs font-medium text-emerald-600">
          on {formatDate(appliedAt, true)}
        </span>
      )}
    </span>
  ) : (
    <button
      type="button"
      onClick={handleApply}
      disabled={applying || checkingApplication}
      className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {(applying || checkingApplication) && (
        <LoaderCircle size={15} className="animate-spin" />
      )}
      {checkingApplication ? "Checking..." : "Apply"}
    </button>
  );

  const goBack = () => navigate(-1);

  const modalElement = (
    <StatusModal
      isOpen={Boolean(modal)}
      type={modal?.type}
      title={modal?.title}
      message={modal?.message}
      confirmText={modal?.confirmText}
      cancelText={modal?.cancelText}
      showCancel={modal?.showCancel}
      busy={applying}
      onConfirm={modal?.onConfirm}
      onCancel={modal?.onCancel}
    />
  );

  /* ---------- loading / error states ---------- */

  if (loading) {
    return (
      <PageShell>
        <PageHeader onBack={goBack} />
        <div className="p-8 text-center text-sm text-slate-500">
          Loading job requirement...
        </div>
      </PageShell>
    );
  }

  if (!job) {
    return (
      <PageShell>
        <PageHeader onBack={goBack} />
        <div className="p-8 text-center">
          <p className="text-sm font-semibold text-slate-800">
            Could not load job requirement
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {error || "Job requirement not found."}
          </p>
          <button
            type="button"
            onClick={() => navigate(JOB_LIST_PATH)}
            className="mt-4 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
          >
            Back to list
          </button>
        </div>
      </PageShell>
    );
  }

  /* ---------- field configs ---------- */

  const jobInfoItems = [
    // ["Employer", job.employerName],
    ["Job Type", job.instituteType],
    ["Job Category", job.jobCategory],
    ["Job Role", job.jobRole],
    ["Position Title", job.position],
    ["Department / Speciality", job.department],
    ["Number of Vacancies", job.vacancies],
    ["Employment Type", job.employmentType],
    ["Qualification Required", job.qualification],
    ["Experience Required", job.experience],
    ["Salary Range", job.salary],
    ["Duty Hours", job.dutyHours],
  ];

  const facilityDateItems = [
    ["Accommodation", yesNo(job.accommodation)],
    ["Food Facility", yesNo(job.food)],
    ["Expected Joining Date", formatDate(job.joiningDate)],
    ["Application Deadline", formatDate(job.deadline)],
    ["Created On", formatDate(job.createdAt, true)],
    // ["Last Updated", formatDate(job.updatedAt, true)],
  ];

  const locationItems = [["Location", job.location]];

  const attachmentName = fileNameFromPath(job.attachmentPath);
  const attachmentUrl = buildFileUrl(job.attachmentPath);

  /* ----------------------------- UI ----------------------------- */

  return (
    <PageShell>
      <PageHeader onBack={goBack} action={headerAction} />

      <div className="space-y-6 p-4">
        <section>
          <SectionTitle>Job Information</SectionTitle>
          <InfoGrid items={jobInfoItems} />
        </section>

        <section>
          <SectionTitle>Facilities & Dates</SectionTitle>
          <InfoGrid items={facilityDateItems} />
        </section>

        <section>
          <SectionTitle>Job Location</SectionTitle>
          <InfoGrid items={locationItems} />
        </section>

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
      </div>

      {modalElement}
    </PageShell>
  );
}
