import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  ChevronsRight,
  MapPin,
  RefreshCw,
} from "lucide-react";

import jobseekerApi from "../../../api/Services/adjobseekerApi";
import { getJobsForJobseeker } from "../../../api/jobRequirementApi";
import { getCurrentUserId } from "../../../utils/authUtils";

const PAGE_SIZE = 10;

// Shared text style for every table body cell.
const CELL_TEXT = "text-sm font-semibold text-black";

const BADGE_BASE =
  "inline-flex h-8 w-44 items-center justify-center rounded-full px-3 text-xs font-semibold text-white shadow-sm";

const TONE = {
  jobCategory: "bg-orange-600",
};

const paginationButton =
  "grid h-8 min-w-8 place-items-center rounded-lg border px-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40";

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const normalizeKeys = (item) =>
  Object.fromEntries(
    Object.entries(item ?? {}).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );

// Profile endpoint: the logged-in jobseeker's record.
const getPayload = (response) =>
  response?.data?.data ?? response?.data ?? response;

// Finds the object that carries the paging fields (totalRecords, totalPages).
// Works whether the service returns the axios response or the unwrapped body.
const findBody = (response) =>
  [response, response?.data, response?.data?.data].find(
    (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      ("totalRecords" in candidate || "TotalRecords" in candidate),
  ) ?? {};

// Returns the array of job rows from a paged body: { data: [...] }.
const getRows = (body) => {
  const rows = body?.data ?? body?.Data ?? body?.items ?? body?.Items;
  return Array.isArray(rows) ? rows : [];
};

const formatDate = (value) => {
  if (!hasValue(value)) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${date.getFullYear()}`;
};

// Maps one job row from the API to the table model.
const normalizeJob = (item) => {
  const row = normalizeKeys(item);

  const get = (...keys) => {
    for (const key of keys) {
      const value = row[key.toLowerCase()];
      if (hasValue(value)) return value;
    }
    return undefined;
  };

  return {
    id: get("jQ_job_requirement_id"),
    employerName: get("employerName") ?? "",
    position: get("jQ_position_title") ?? "Untitled position",
    department: get("jQ_department_speciality") ?? "",
    location: get("jobLocationName") ?? "-",
    instituteType: get("instituteTypeName") ?? "-",
    jobRole: get("jobRoleName") ?? "-",
    jobCategory: get("jobCategoryName") ?? "-",
    vacancies: get("jQ_vacancies") ?? 0,
    deadline: get("jQ_deadline"),
    applied: get("jobseekerApplied") === true,
  };
};

const Badge = ({ value, tone }) => (
  <span className={`${BADGE_BASE} ${tone}`} title={value}>
    <span className="truncate">{value}</span>
  </span>
);

const JobsForYou = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Load the logged-in jobseeker's profile.
  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const userId = getCurrentUserId();

        if (!userId) {
          throw new Error(
            "Your login session has expired. Please log in again.",
          );
        }

        const response = await jobseekerApi.getById(userId);
        const record = getPayload(response);

        if (!record?.jB_jobseeker_id) {
          throw new Error("Jobseeker profile could not be found.");
        }

        if (
          !record.jB_institute_type_id ||
          !record.jB_job_role_id ||
          !record.jB_job_category_id
        ) {
          throw new Error(
            "Complete your institute type, job role, and job category in your profile to see matching jobs.",
          );
        }

        if (!cancelled) setProfile(record);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.Message ||
              err.message ||
              "Unable to load your profile.",
          );
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Load jobs matching all three profile IDs.
  useEffect(() => {
    if (!profile) return undefined;

    let cancelled = false;

    const loadJobs = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getJobsForJobseeker({
          instituteTypeId: profile.jB_institute_type_id,
          jobRoleId: profile.jB_job_role_id,
          jobCategoryId: profile.jB_job_category_id,
          jobseekerId: profile.jB_jobseeker_id,
          pageNo: page,
          pageSize: PAGE_SIZE,
        });

        if (response?.success === false || response?.Success === false) {
          throw new Error(
            response?.message ||
              response?.Message ||
              "Unable to load matching jobs.",
          );
        }

        const body = findBody(response);
        const rows = getRows(body).map(normalizeJob);
        const total = Number(body?.totalRecords ?? body?.TotalRecords);

        if (!cancelled) {
          setJobs(rows);
          setTotalRecords(Number.isFinite(total) ? total : rows.length);
        }
      } catch (err) {
        if (!cancelled) {
          setJobs([]);
          setTotalRecords(0);
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.Message ||
              err.message ||
              "Failed to load matching jobs.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadJobs();

    return () => {
      cancelled = true;
    };
  }, [profile, page, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage]);

  const start = totalRecords === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalRecords);

  const pageNumbers = useMemo(() => {
    const count = 5;
    let from = Math.max(1, currentPage - Math.floor(count / 2));
    const to = Math.min(totalPages, from + count - 1);

    from = Math.max(1, to - count + 1);

    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, totalPages]);

  const headings = [
    "Sr.No",
    "Position & Location",
    "Organization Name",
    "Job Type",
    "Job Role",
    "Job Category",
    "Vacancies",
    // "Deadline",
    "Action",
  ];

  return (
    <div className="min-h-full bg-[#f7f9fb] text-[#1e2b36]">
      <div className="mx-auto max-w-[1500px] rounded-xl border border-[#e2e8ee] bg-white p-4 shadow-sm sm:p-5">
        {/* Header */}
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#2c6b8a]">
            Jobs For You
          </h1>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setProfile(null);
                setReloadKey((value) => value + 1);
              }}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c9d5dd] px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setProfile(null);
                setReloadKey((value) => value + 1);
              }}
              className="font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-[#cbe1f4]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] text-left text-white">
                {headings.map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="whitespace-nowrap px-3 py-3 font-bold"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={headings.length}
                    className="px-4 py-12 text-center text-[#60738a]"
                  >
                    <RefreshCw
                      size={22}
                      className="mx-auto mb-2 animate-spin text-[#2c6b8a]"
                    />
                    Finding jobs that match your profile...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={headings.length}
                    className="px-4 py-12 text-center"
                  >
                    <BriefcaseBusiness
                      size={28}
                      className="mx-auto mb-3 text-[#2c6b8a]"
                    />
                    <p className="font-semibold text-[#34445a]">
                      No matching jobs available right now.
                    </p>
                    <p className="mt-1 text-xs text-[#60738a]">
                      Check again later for new opportunities.
                    </p>
                  </td>
                </tr>
              ) : (
                jobs.map((job, index) => (
                  <tr
                    key={job.id ?? `${job.position}-${index}`}
                    className="border-t border-[#e2e8ee] even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                  >
                    <td
                      className={`whitespace-nowrap px-3 py-3 text-center tabular-nums ${CELL_TEXT}`}
                    >
                      {start + index}
                    </td>

                    <td className={`min-w-[14rem] px-3 py-3 ${CELL_TEXT}`}>
                      <div className="">{job.position}</div>

                      <div className="mt-1 inline-flex items-center gap-1 ">
                        <MapPin size={12} className="shrink-0" />
                        {job.location}
                      </div>
                    </td>

                    <td className={`px-3 py-3 ${CELL_TEXT}`}>
                      {job.employerName}
                    </td>
                    <td className={`px-3 py-3 ${CELL_TEXT}`}>
                      {job.instituteType}
                    </td>

                    <td className={`px-3 py-3 ${CELL_TEXT}`}>
                      <div className="inline-flex w-[100px]">{job.jobRole}</div>
                    </td>

                    <td className={`px-3 py-3 ${CELL_TEXT}`}>
                      <Badge value={job.jobCategory} tone={TONE.jobCategory} />
                    </td>

                    <td
                      className={`px-3 py-3 text-center tabular-nums ${CELL_TEXT}`}
                    >
                      {job.vacancies}
                    </td>

                    

                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {job.applied && (
                          <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                            Applied
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/jobseeker/jobs/${job.id}`)}
                          title="View job"
                          aria-label={`View ${job.position}`}
                          className="grid h-8 w-8 place-items-center rounded-md bg-[#2c9ba8] text-white transition hover:bg-[#238491]"
                        >
                          <ChevronsRight size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-col gap-3 border-t border-[#e2e8ee] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#60738a]">
            <span>
              Showing <strong>{start}</strong> to <strong>{end}</strong> of{" "}
              <strong>{totalRecords}</strong>
            </span>
          </div>

          <nav
            aria-label="Matching jobs pagination"
            className="flex flex-wrap items-center gap-1"
          >
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage <= 1 || loading}
              className={`${paginationButton} border-[#dce3eb] bg-white hover:bg-[#e8f1f6]`}
            >
              Previous
            </button>

            {pageNumbers.map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                disabled={loading}
                aria-current={number === currentPage ? "page" : undefined}
                className={`${paginationButton} ${
                  number === currentPage
                    ? "border-[#2c6b8a] bg-[#2c6b8a] font-semibold text-white"
                    : "border-[#dce3eb] bg-white hover:bg-[#e8f1f6]"
                }`}
              >
                {number}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
              disabled={currentPage >= totalPages || loading}
              className={`${paginationButton} border-[#dce3eb] bg-white hover:bg-[#e8f1f6]`}
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default JobsForYou;
