import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  Building2,
  ChevronsRight,
  MapPin,
  MessageCircleCheck,
  MessageCircleX,
  RefreshCw,
  Search as SearchIcon,
} from "lucide-react";
import dayjs from "dayjs";

import { getJobsForJobseeker } from "../../../api/jobRequirementApi";

/* ------------------------------ CONSTANTS ------------------------------ */

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const TABLE_MIN_WIDTH = 1000;

const TABLE_COLUMNS = [
  { key: "srNo", label: "Sr.No", width: "70px" },
  { key: "org", label: "Organization & Location", width: "260px" },
  { key: "instituteType", label: "Job Type", width: "150px" },
  { key: "jobRole", label: "Job Role", width: "160px" },
  { key: "jobCategory", label: "Job Category", width: "170px" },
  { key: "vacancies", label: "Vacancies", width: "110px" },
  { key: "deadline", label: "Deadline", width: "130px" },
  { key: "actions", label: "Action", width: "130px" },
];

const TABLE_COL_COUNT = TABLE_COLUMNS.length;

/* ------------------------------ HELPERS ------------------------------ */

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

// Read the matching IDs from the existing logged-in user.
// No API request is made here.
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

const isFailedResponse = (response) =>
  response?.success === false ||
  response?.Success === false ||
  response?.data?.success === false ||
  response?.data?.Success === false;

const getResponseMessage = (response) =>
  response?.message ||
  response?.Message ||
  response?.data?.message ||
  response?.data?.Message ||
  "Unable to load matching jobs.";

/* ------------------------------ COMPONENT ------------------------------ */

const JobsForYou = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  /* refs for horizontal scroll sync */
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);

  // Resolve the current user's matching IDs locally.
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

  // Fetch the current page of matching jobs.
  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getJobsForJobseeker({
          instituteTypeId: profile.instituteTypeId,
          jobRoleId: profile.jobRoleId,
          jobCategoryId: profile.jobCategoryId,
          jobseekerId: profile.jobseekerId,
          pageNo: page,
          pageSize,
        });

        if (isFailedResponse(response)) {
          throw new Error(getResponseMessage(response));
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
  }, [profile, page, pageSize, reloadKey]);

  /* sync header & body horizontal scroll */
  useEffect(() => {
    const body = bodyScrollRef.current;
    const header = headerScrollRef.current;
    if (!body || !header) return undefined;

    const onScroll = () => {
      header.scrollLeft = body.scrollLeft;
    };

    body.addEventListener("scroll", onScroll);
    return () => body.removeEventListener("scroll", onScroll);
  }, []);

  // Search filters the jobs on the current page only.
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

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalRecords);

  const pageNumbers = useMemo(() => {
    const count = 5;
    let from = Math.max(1, currentPage - Math.floor(count / 2));
    const to = Math.min(totalPages, from + count - 1);
    from = Math.max(1, to - count + 1);
    return Array.from({ length: to - from + 1 }, (_, index) => from + index);
  }, [currentPage, totalPages]);

  const refresh = () => {
    setJobs([]);
    setPage(1);
    setReloadKey((value) => value + 1);
  };

  /* --------------------------- STYLES --------------------------- */

  const pageBtn =
    "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg px-2.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]";
  const navBtn = `${pageBtn} border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] disabled:cursor-not-allowed disabled:border-[#e2e8ee] disabled:text-[#b8c4d3] disabled:hover:bg-white disabled:hover:text-[#b8c4d3]`;
  const td =
    "border-t border-[#e2e8ee] px-3.5 py-2.5 text-[15px] text-slate-900";
  const thClass =
    "whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-center text-[15px] font-semibold tracking-wide text-white shadow-[0_3px_6px_-3px_rgba(30,43,54,0.45)]";

  const btnRefresh =
    "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-semibold text-[#34445a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

  /* Sticky actions column — header + cells */
  const stickyActionsHead =
    "sticky right-0 z-30 whitespace-nowrap bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-1.5 text-center text-[15px] font-semibold tracking-wide text-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.25)]";
  const stickyActionsCell =
    "sticky right-0 z-20 bg-white shadow-[-8px_0_12px_-8px_rgba(30,43,54,0.15)] group-even:bg-[#f9fbfc] group-hover:bg-[#e8f1f6]";

  /* --------------------------- RENDER --------------------------- */

  return (
    <div className="mx-auto max-w-[1500px] rounded-[14px] border border-[#e2e8ee] bg-white p-4 text-[#1e2b36] shadow-[0_1px_2px_rgba(30,43,54,0.05),0_12px_28px_-16px_rgba(44,107,138,0.35)] sm:px-5">
      {/* HEADER */}
      <div className="mb-2 flex flex-col items-start justify-between gap-3 xl:flex-row xl:items-center">
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]">
          Jobs For You
        </h1>

        <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto">
          <div className="relative min-w-[320px] flex-1 xl:flex-none">
            <SearchIcon
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b1]"
            />
            <input
              type="search"
              aria-label="Search jobs"
              placeholder="Search by position, employer, location or category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#c9d5dd] bg-[#f9fbfc] pl-9 pr-3 text-[13px] text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] hover:border-[#2c6b8a] hover:bg-white focus:border-[#2c6b8a] focus:bg-white focus:ring-2 focus:ring-[#2c6b8a]/30"
            />
          </div>

          <button
            type="button"
            title="Refresh table"
            aria-label="Refresh table"
            onClick={refresh}
            disabled={loading}
            className={btnRefresh}
          >
            <RefreshCw
              size={15}
              strokeWidth={2.2}
              className={`transition-transform duration-500 ${
                loading ? "animate-spin" : "group-hover:rotate-90"
              }`}
            />
            <span className="hidden sm:inline">
              {loading ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="my-3.5 h-px bg-gradient-to-r from-[#2c6b8a]/45 via-[#e2e8ee] to-transparent"
      />

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="mb-3 flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
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

      {/* TABLE */}
      <div className="mt-4 h-[470px] overflow-hidden rounded-lg border border-[#cbe1f4]">
        <div className="flex h-full flex-col">
          {/* Header strip */}
          <div ref={headerScrollRef} className="shrink-0 overflow-hidden">
            <table
              className="w-full table-fixed border-collapse text-[15px]"
              style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
            >
              <colgroup>
                {TABLE_COLUMNS.map((c) => (
                  <col key={c.key} style={{ width: c.width }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {TABLE_COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={
                        c.key === "actions" ? stickyActionsHead : thClass
                      }
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>

          {/* Body */}
          <div
            ref={bodyScrollRef}
            className="common-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-auto"
            style={{ scrollbarGutter: "stable" }}
          >
            <table
              className="w-full table-fixed border-collapse text-[15px]"
              style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}
            >
              <colgroup>
                {TABLE_COLUMNS.map((c) => (
                  <col key={c.key} style={{ width: c.width }} />
                ))}
              </colgroup>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={TABLE_COL_COUNT}
                      className="px-4 py-12 text-center"
                    >
                      <div className="flex flex-col items-center">
                        <span
                          aria-hidden="true"
                          className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#e8f1f6] border-t-[#2c6b8a]"
                        />
                        <p className="mt-3 text-[15px] text-[#6b7a88]">
                          Finding jobs that match your profile...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredJobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={TABLE_COL_COUNT}
                      className="border-t border-[#e2e8ee] px-4 py-12 text-center"
                    >
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                        <BriefcaseBusiness size={22} />
                      </div>
                      <p className="mt-3 text-[15px] text-[#1e2b36]">
                        No matching jobs available right now
                      </p>
                      <p className="mt-1 text-[13px] text-[#60738a]">
                        Check again later for new opportunities.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job, index) => (
                    <tr
                      key={job.id ?? `${job.position}-${index}`}
                      style={{
                        animationDelay: `${Math.min(index, 12) * 35}ms`,
                      }}
                      className="js-row group transition-colors even:bg-[#f9fbfc] hover:bg-[#e8f1f6]"
                    >
                      <td className={`${td} tabular-nums text-center`}>
                        {start + index}
                      </td>

                      <td className={td}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate font-semibold">
                            <Building2 size={13} className="shrink-0" />
                            <span className="truncate">
                              {job.employerName || "-"}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 truncate text-[13px] text-[#60738a]">
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate">{job.location}</span>
                          </div>
                        </div>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <div className="w-full min-w-0 truncate">
                          {job.instituteType}
                        </div>
                      </td>

                      <td className={`${td} whitespace-nowrap`}>
                        <div className="w-full min-w-0 truncate">
                          {job.jobRole}
                        </div>
                      </td>

                      <td className={`${td} whitespace-nowrap text-center`}>
                        <span
                          className="inline-flex max-w-full items-center rounded-md bg-orange-600 px-2.5 py-1 text-[13px] font-medium text-white ring-1 ring-inset ring-orange-700 shadow-sm"
                          title={job.jobCategory}
                        >
                          <span className="truncate">{job.jobCategory}</span>
                        </span>
                      </td>

                      <td className={`${td} tabular-nums text-center`}>
                        {job.vacancies}
                      </td>

                      <td className={`${td} tabular-nums whitespace-nowrap text-center`}>
                        {hasValue(job.deadline) && dayjs(job.deadline).isValid()
                          ? dayjs(job.deadline).format("DD-MM-YYYY")
                          : "-"}
                      </td>

                      <td className={`${td} ${stickyActionsCell} text-center`}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/jobseeker/jobs/${job.id}`)}
                            title="View job"
                            aria-label={`View ${job.position}`}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                          >
                            <ChevronsRight size={14} strokeWidth={2.2} />
                          </button>

                          {job.applied ? (
                            <button
                              type="button"
                              disabled
                              title="Already applied"
                              aria-label={`Already applied for ${job.position}`}
                              className="grid h-7 w-7 cursor-not-allowed place-items-center rounded-md bg-emerald-100 text-emerald-700"
                            >
                              <MessageCircleCheck size={15} strokeWidth={2.2} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate(`/jobseeker/jobs/${job.id}`)}
                              title="View job and apply"
                              aria-label={`View ${job.position} and apply`}
                              className="grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#2c6b8a] to-[#3b86a6] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                            >
                              <MessageCircleX size={14} strokeWidth={2.2} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="mt-3.5 flex flex-col gap-3 border-t border-[#e2e8ee] pt-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3.5 text-[13px] text-[#60738a]">
          <span>
            Showing{" "}
            <strong className="font-semibold text-[#53677f]">{start}</strong>{" "}
            to{" "}
            <strong className="font-semibold text-[#53677f]">{end}</strong>{" "}
            of{" "}
            <strong className="font-semibold text-[#53677f]">
              {totalRecords}
            </strong>{" "}
            entries
          </span>

          <label className="flex items-center gap-1.5">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              disabled={loading}
              className="h-8 cursor-pointer rounded-lg border border-[#dce3eb] bg-white px-2 text-[13px] text-[#34445a] hover:border-[#2c6b8a] focus:border-[#2c6b8a] focus:outline-none focus:ring-2 focus:ring-[#2c6b8a]/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {DEFAULT_PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <nav
          aria-label="Matching jobs pagination"
          className="flex flex-wrap items-center gap-1"
        >
          <button
            type="button"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || loading}
            className={navBtn}
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
              className={`${pageBtn} ${
                number === currentPage
                  ? "bg-gradient-to-br from-[#2c6b8a] to-[#3b86a6] font-semibold text-white shadow-[0_2px_6px_rgba(44,107,138,0.45)] ring-2 ring-[#2c6b8a]/25"
                  : "border border-[#dce3eb] bg-white text-[#34445a] hover:border-[#2c6b8a] hover:bg-[#e8f1f6] hover:text-[#2c6b8a]"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {number}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages || loading}
            className={navBtn}
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  );
};

export default JobsForYou;