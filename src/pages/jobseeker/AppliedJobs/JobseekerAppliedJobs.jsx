
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronsRight,
  Search as SearchIcon,
  ChevronDown,
  RotateCcw,
  BriefcaseBusiness,
  Building2,
  MapPin,
  CalendarDays,
  LoaderCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

import applicationApi from "../../../api/applicationApi";
import { getCurrentUserId } from "../../../utils/authUtils";

const ACCENT = "#2c6b8a";

const APPLICATION_STATUSES = ["All", "Open", "Closed"];

const BADGE_BASE =
  "inline-flex h-7 min-w-[100px] items-center justify-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium ring-1 ring-inset whitespace-nowrap";

const STATUS_STYLES = {
  Open: "bg-emerald-600 text-white ring-emerald-700",
  Closed: "bg-slate-500 text-white ring-slate-600",
};

const getStatusStyle = (status) =>
  STATUS_STYLES[status] || STATUS_STYLES.Closed;

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
  // axios response -> API envelope -> paginated response
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

const Select = ({ label, value, onChange, options }) => (
  <div className="relative min-w-[170px] flex-1 xl:flex-none">
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full appearance-none rounded-lg border border-[#c9d5dd] bg-white px-3 pr-9 text-sm text-[#34445a] outline-none hover:border-[#2c6b8a] focus:ring-2 focus:ring-[#2c6b8a]/30"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option === "All" ? `${label}: All` : option}
        </option>
      ))}
    </select>

    <ChevronDown
      size={15}
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
    />
  </div>
);

const JobStatusBadge = ({ status }) => (
  <span className={`${BADGE_BASE} ${getStatusStyle(status)}`}>
    <span
      className={`h-2 w-2 rounded-full ${
        status === "Open" ? "bg-white" : "bg-slate-200"
      }`}
    />
    {status}
  </span>
);

const JobseekerAppliedJobs = () => {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadApplications = async () => {
      const jobseekerId = Number(getCurrentUserId());

      if (!Number.isInteger(jobseekerId) || jobseekerId <= 0) {
        setApplications([]);
        setTotalRecords(0);
        setTotalPages(0);
        setError("Unable to identify your jobseeker profile.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await applicationApi.fetchAppliedJobs(
          jobseekerId,
          page,
          pageSize,
        );

        const result = unwrapPage(response);

        if (cancelled) return;

        setApplications(result.rows.map(normalizeApplication));
        setTotalRecords(result.totalRecords);
        setTotalPages(result.totalPages);
      } catch (err) {
        if (cancelled) return;

        const message =
          err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          "Failed to load applied jobs.";

        setApplications([]);
        setTotalRecords(0);
        setTotalPages(0);
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadApplications();

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, refreshKey]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications.filter((application) => {
      const searchableText = [
        application.applicationNumber,
        application.organizationName,
        application.position,
        application.department,
        application.location,
        application.employmentType,
      ]
        .filter(hasValue)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        application.jobStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, search, statusFilter]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  const startRecord =
    totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;

  const endRecord = Math.min(page * pageSize, totalRecords);

  const visibleTotalPages = Math.max(1, totalPages);

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const from = Math.max(
      1,
      Math.min(
        page - Math.floor(windowSize / 2),
        visibleTotalPages - windowSize + 1,
      ),
    );

    const to = Math.min(visibleTotalPages, from + windowSize - 1);

    return Array.from(
      { length: Math.max(0, to - from + 1) },
      (_, index) => from + index,
    );
  }, [page, visibleTotalPages]);

  const changePageSize = (value) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const td =
    "border-t border-[#e2e8ee] px-3.5 py-3 text-sm text-slate-900";

  const pageBtn =
    "grid h-8 min-w-8 place-items-center rounded-lg px-2.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";

  const hasFilters = Boolean(search.trim()) || statusFilter !== "All";

  return (
    <div className="min-h-full text-[#1e2b36]">
      <div className="mx-auto mt-3 max-w-[1400px] rounded-xl border border-[#e2e8ee] bg-white p-3 shadow-sm sm:p-[18px]">
        <div className="mb-3 flex flex-col items-start justify-between gap-3 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-xl font-extrabold text-[#2c6b8a]">
              Application History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View the jobs you have applied for.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto">
            <div className="relative min-w-[240px] flex-1 xl:min-w-[300px] xl:flex-none">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
              />

              <input
                type="search"
                aria-label="Search applied jobs on this page"
                placeholder="Search jobs on this page"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 w-full rounded-lg border border-[#c9d5dd] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#9aa5b1] focus:border-[#2c6b8a] focus:ring-2 focus:ring-[#2c6b8a]/30"
              />
            </div>

            <Select
              label="Job status"
              value={statusFilter}
              options={APPLICATION_STATUSES}
              onChange={setStatusFilter}
            />

            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasFilters}
              title="Reset filters"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-[#d64545] transition hover:bg-[#fbe9e9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={14} />
              Reset
            </button>

            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={loading}
              title="Refresh applications"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-3 border-t border-[#e2e8ee]" />

        {error && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="shrink-0 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="common-scrollbar mt-4 max-h-[60vh] overflow-auto rounded-lg border border-[#cbe1f4]">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr>
                {[
                  "Sr. No.",
                  "Job Status",
                  "Organization",
                  "Job",
                  "Type",
                  "Applied On",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-3.5 py-3 text-left text-sm font-bold text-white"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                      <LoaderCircle
                        size={20}
                        className="animate-spin"
                        style={{ color: ACCENT }}
                      />
                      Loading applied jobs...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-14 text-center text-sm text-slate-500"
                  >
                    Applications could not be loaded.
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a]">
                      <BriefcaseBusiness size={22} />
                    </div>

                    <p className="mt-3 text-[15px] font-semibold text-[#1e2b36]">
                      {applications.length === 0
                        ? "No job applications yet"
                        : "No applications match these filters"}
                    </p>

                    <p className="mt-1 text-[13px] text-[#6b7a88]">
                      {applications.length === 0
                        ? "Jobs you apply for will appear here."
                        : "Try a different search or clear the filters."}
                    </p>

                    {hasFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-3 rounded-lg bg-[#2c6b8a] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#245a75]"
                      >
                        Reset filters
                      </button>
                    )}

                    {applications.length === 0 && totalRecords === 0 && (
                      <button
                        type="button"
                        onClick={() => navigate("/jobseeker/job-list")}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#2c6b8a] px-3.5 py-2 text-sm font-semibold text-[#2c6b8a] hover:bg-[#e8f1f6]"
                      >
                        Browse jobs
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredApplications.map((application, index) => (
                  <tr
                    key={application.id}
                    className="transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                  >
                    <td className={`${td} tabular-nums`}>
                      {(page - 1) * pageSize + index + 1}
                    </td>

                    <td className={td}>
                      <JobStatusBadge status={application.jobStatus} />
                    </td>

                    <td className={`${td} whitespace-nowrap`}>
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Building2
                            size={13}
                            className="shrink-0 text-[#2c6b8a]"
                          />
                          {text(application.organizationName)}
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <MapPin size={13} className="shrink-0" />
                          {text(application.location)}
                        </span>
                      </div>
                    </td>

                    <td className={td}>
                      <div className="min-w-[190px]">
                        <p className="font-semibold">
                          {text(application.position)}
                        </p>

                        {hasValue(application.department) && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {application.department}
                          </p>
                        )}

                        {hasValue(application.applicationNumber) && (
                          <p className="mt-1 text-xs text-slate-500">
                            Ref: {application.applicationNumber}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className={td}>
                      {text(application.employmentType)}
                    </td>

                    <td className={`${td} whitespace-nowrap`}>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays
                          size={13}
                          className="text-slate-500"
                        />
                        {formatDate(application.appliedDate)}
                      </span>
                    </td>

                    <td className={td}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/jobseeker/applications/${application.id}`,
                          )
                        }
                        title="View application"
                        aria-label={`View application for ${text(application.position)}`}
                        className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a9aa8] focus-visible:ring-offset-2"
                      >
                        <ChevronsRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3.5 flex flex-col gap-3 border-t border-[#e2e8ee] pt-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3.5 text-xs text-[#60738a]">
            <span>
              Showing{" "}
              <strong className="font-semibold text-[#53677f]">
                {startRecord}
              </strong>{" "}
              to{" "}
              <strong className="font-semibold text-[#53677f]">
                {endRecord}
              </strong>{" "}
              of{" "}
              <strong className="font-semibold text-[#53677f]">
                {totalRecords}
              </strong>{" "}
              applications
            </span>

            <label className="flex items-center gap-1.5">
              <span>Show:</span>

              <select
                value={pageSize}
                onChange={(event) => changePageSize(event.target.value)}
                className="h-8 rounded-lg border border-[#dce3eb] bg-white px-2 text-xs text-[#34445a] focus:outline-none focus:ring-2 focus:ring-[#2c6b8a]/30"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            {hasFilters && (
              <span className="text-slate-500">
                Filters apply to this page only.
              </span>
            )}
          </div>

          <nav
            aria-label="Applied jobs pagination"
            className="flex flex-wrap items-center gap-1"
          >
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || page <= 1}
              className={`${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:bg-[#e8f1f6] disabled:cursor-not-allowed disabled:text-[#b8c4d3]`}
            >
              Previous
            </button>

            {pageNumbers.map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                disabled={loading}
                aria-current={number === page ? "page" : undefined}
                className={`${pageBtn} ${
                  number === page
                    ? "bg-gradient-to-br from-[#2c6b8a] to-[#3b86a6] text-white shadow-sm"
                    : "border border-[#dce3eb] bg-white text-[#34445a] hover:bg-[#e8f1f6]"
                }`}
              >
                {number}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setPage((current) =>
                  Math.min(visibleTotalPages, current + 1),
                )
              }
              disabled={loading || page >= visibleTotalPages}
              className={`${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:bg-[#e8f1f6] disabled:cursor-not-allowed disabled:text-[#b8c4d3]`}
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default JobseekerAppliedJobs;
