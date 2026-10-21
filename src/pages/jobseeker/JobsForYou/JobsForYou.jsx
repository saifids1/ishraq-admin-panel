import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  ChevronsRight,
  MapPin,
  RefreshCw,
  Building2,
  Search,
  MessageCircleCheck,
  MessageCircleX,
} from "lucide-react";

import { getJobsForJobseeker } from "../../../api/jobRequirementApi";
import { getCurrentUser } from "../../../utils/authUtils";
import dayjs from "dayjs";

const PAGE_SIZE = 10;

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

// Read the matching IDs from the existing logged-in user.
// No jobseeker profile API request is made.
const getMatchingProfile = () => {
  const jobseekerId = localStorage.getItem("jB_jobseeker_id");
  const instituteTypeId = localStorage.getItem("jB_institute_type_id");
  const jobRoleId = localStorage.getItem("jB_job_role_id");
  const jobCategoryId = localStorage.getItem("jB_job_category_id");

  if (!jobseekerId || !instituteTypeId || !jobRoleId || !jobCategoryId) {
    throw new Error(
      "Your jobseeker profile is not loaded yet. Please refresh the page and try again.",
    );
  }

  return {
    jobseekerId: Number(jobseekerId),
    instituteTypeId: Number(instituteTypeId),
    jobRoleId: Number(jobRoleId),
    jobCategoryId: Number(jobCategoryId),
  };
};

const JobsForYou = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Resolve the current user's matching IDs locally.
  // This effect makes no API calls.
  useEffect(() => {
    try {
      setProfile(getMatchingProfile());
      setError("");
    } catch (err) {
      setProfile(null);
      setError(err.message || "Unable to load your profile.");
      setLoading(false);
    }
  }, [reloadKey]);

  // Fetch only the paginated jobs.
  const loadJobs = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError("");

    try {
      const response = await getJobsForJobseeker({
        instituteTypeId: profile.instituteTypeId,
        jobRoleId: profile.jobRoleId,
        jobCategoryId: profile.jobCategoryId,
        jobseekerId: profile.jobseekerId,
        pageNo: page,
        pageSize: PAGE_SIZE,
      });

      if (
        response?.success === false ||
        response?.Success === false ||
        response?.data?.success === false ||
        response?.data?.Success === false
      ) {
        throw new Error(
          response?.message ||
            response?.Message ||
            response?.data?.message ||
            response?.data?.Message ||
            "Unable to load matching jobs.",
        );
      }

      const body = findBody(response);
      const rows = getRows(body).map(normalizeJob);

      const rawTotal = body?.totalRecords ?? body?.TotalRecords;

      const total = Number(rawTotal);

      if (!cancelled) {
        setJobs(rows);
        setTotalRecords(
          Number.isFinite(total) && total >= 0 ? total : rows.length,
        );
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

    return () => {
      cancelled = true;
    };
  }, [profile, page]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await getJobsForJobseeker({
          instituteTypeId: profile.instituteTypeId,
          jobRoleId: profile.jobRoleId,
          jobCategoryId: profile.jobCategoryId,
          jobseekerId: profile.jobseekerId,
          pageNo: page,
          pageSize: PAGE_SIZE,
        });

        if (
          response?.success === false ||
          response?.Success === false ||
          response?.data?.success === false ||
          response?.data?.Success === false
        ) {
          throw new Error(
            response?.message ||
              response?.Message ||
              response?.data?.message ||
              response?.data?.Message ||
              "Unable to load matching jobs.",
          );
        }

        const body = findBody(response);
        const rows = getRows(body).map(normalizeJob);
        const total = Number(body?.totalRecords ?? body?.TotalRecords);

        if (!cancelled) {
          setJobs(rows);
          setTotalRecords(
            Number.isFinite(total) && total >= 0 ? total : rows.length,
          );
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

    run();

    return () => {
      cancelled = true;
    };
  }, [profile, page, reloadKey]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return jobs;

    return jobs.filter((job) =>
      [
        job.position,
        job.employerName,
        job.location,
        job.instituteType,
        job.jobRole,
        job.jobCategory,
        job.department,
      ]
        .filter(hasValue)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [jobs, search]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const start = totalRecords === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;

  const end = Math.min(currentPage * PAGE_SIZE, totalRecords);

  const pageNumbers = useMemo(() => {
    const count = 5;
    let from = Math.max(1, currentPage - Math.floor(count / 2));
    const to = Math.min(totalPages, from + count - 1);

    from = Math.max(1, to - count + 1);

    return Array.from({ length: to - from + 1 }, (_, index) => from + index);
  }, [currentPage, totalPages]);

  const headings = [
    "Sr.No",
    "Organization & Location",
    "Job Type",
    "Job Role",
    "Job Category",
    "Vacancies",
    "Deadline",
    "Action",
  ];

  const refresh = () => {
    setJobs([]);
    setPage(1);
    setReloadKey((value) => value + 1);
  };

  return (
    <div className="min-h-full bg-[#f7f9fb] text-[#1e2b36]">
      <div className="mx-auto max-w-[1500px] rounded-xl border border-[#e2e8ee] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#2c6b8a]">
            Jobs For You
          </h1>

          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-[300px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Jobs..."
                aria-label="Search Job"
                className="h-10 w-full rounded-lg border border-[#c9d5dd] pl-9 pr-3 text-sm outline-none focus:border-[#2c6b8a] focus:ring-2 focus:ring-[#2c6b8a]/20"
              />
            </div>

            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c9d5dd] px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={refresh}
              className="font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-[#cbe1f4]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6]  text-white">
                {headings.map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="whitespace-nowrap px-3 py-3 font-bold"
                  >
                    <div className="inline-flex justify-center">{heading}</div>
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
              ) : filteredJobs.length === 0 ? (
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
                filteredJobs.map((job, index) => (
                  <tr
                    key={job.id ?? `${job.position}-${index}`}
                    className="border-t border-[#e2e8ee] text-center even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                  >
                    <td
                      className={`whitespace-nowrap px-3 py-3 text-center tabular-nums ${CELL_TEXT}`}
                    >
                      {start + index}
                    </td>

                    <td className={`min-w-[14rem] py-3 ${CELL_TEXT}`}>
                      <div className="inline-flex flex-col">
                        <div className="mt-1 inline-flex items-center gap-1">
                          <Building2 size={12} className="shrink-0" />
                          {job.employerName}
                        </div>
                        <div className="mt-1 inline-flex items-center text-xs text-slate-400 gap-1">
                          <MapPin size={12} className="shrink-0" />
                          {job.location}
                        </div>
                      </div>
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

                    <td
                      className={`px-3 py-3 text-center tabular-nums ${CELL_TEXT}`}
                    >
                      {hasValue(job.deadline) && dayjs(job.deadline).isValid()
                        ? dayjs(job.deadline).format("DD-MM-YYYY")
                        : "-"}
                    </td>

                    <td className="px-3 py-3">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/jobseeker/jobs/${job.id}`)}
                          title="View job"
                          aria-label={`View ${job.position}`}
                          className="grid h-8 w-8 place-items-center rounded-md bg-[#2c9ba8] text-white transition hover:bg-[#238491]"
                        >
                          <ChevronsRight size={17} />
                        </button>
                        <div className="flex items-center justify-center">
                          {job.applied ? (
                            <button
                              type="button"
                              disabled
                              title="Already applied"
                              aria-label={`Already applied for ${job.position}`}
                              className="grid h-8 w-8 cursor-not-allowed place-items-center
                                  rounded-md bg-emerald-100 text-emerald-700"
                            >
                              <MessageCircleCheck size={19} strokeWidth={2.2} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/jobseeker/jobs/${job.id}`)
                              }
                              title="View job and apply"
                              aria-label={`View ${job.position} and apply`}
                              className="grid h-8 w-8 place-items-center rounded-md
                                  bg-[#2c9ba8] text-white transition hover:bg-[#238491]
                                  focus:outline-none focus:ring-2 focus:ring-[#2c9ba8]/40"
                            >
                              <MessageCircleX size={17} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
