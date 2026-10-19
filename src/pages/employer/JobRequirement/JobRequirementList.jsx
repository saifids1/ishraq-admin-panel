import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ChevronsRight,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";

import { StatCardGrid } from "../../../components/common/Dashboardkit";
import { getCurrentUserId } from "../../../utils/authUtils";
import {
  getPayload,
  extractEmployerRecord,
  normalizeEmployer,
  getEmployerRequest,
} from "../../../utils/employerProfile";
import { getEmployerJobRequirementsPaginated } from "../../../api/jobRequirementApi";

const PAGE_SIZES = [10, 25, 50, 100];

const STATIC_STATS = [
  {
    title: "Job requirements posted",
    value: "303",
    note: "All time",
    icon: BriefcaseBusiness,
    color: "#6366f1",
    color2: "#8b5cf6",
    from: "#6366f1",
    to: "#8b5cf6",
  },
  {
    title: "Open jobs",
    value: "404",
    note: "Coming soon",
    icon: BadgeCheck,
    color: "#10b981",
    color2: "#34d399",
    from: "#10b981",
    to: "#059669",
  },
  {
    title: "Total vacancies",
    value: "907",
    note: "Coming soon",
    icon: UserPlus,
    color: "#f59e0b",
    color2: "#fb923c",
    from: "#f59e0b",
    to: "#ef4444",
  },
  {
    title: "Total applicants",
    value: "203",
    note: "Coming soon",
    icon: Users,
    color: "#0ea5e9",
    color2: "#38bdf8",
    from: "#0ea5e9",
    to: "#2563eb",
  },
];

// Every badge shares this size so they line up with the h-8 action buttons.
const BADGE_BASE =
  "inline-flex h-8 w-35 items-center justify-center rounded-lg px-3 text-sm font-semibold text-white shadow-sm";

// Lower-cases keys so "JQ_position_title" and "jQ_position_title" resolve the same way.
const toLowerKeys = (obj) =>
  Object.fromEntries(
    Object.entries(obj ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const normalizeJob = (item) => {
  const row = toLowerKeys(item);

  const get = (...keys) => {
    for (const key of keys) {
      const value = row[key.toLowerCase()];
      if (hasValue(value)) return value;
    }
    return undefined;
  };

  return {
    id: get("jQ_job_requirement_id", "id"),
    position: get("jQ_position_title", "positionTitle") ?? "Untitled position",
    department: get("jQ_department_speciality") ?? "",
    location: get("jobLocationName", "cityName") ?? "-",
    instituteType: get("instituteTypeName") ?? "-",
    jobRole: get("jobRoleName") ?? "-",
    jobCategory: get("jobCategoryName") ?? "-",
    vacancies: get("jQ_vacancies", "vacancies") ?? 0,
    applied: Number(get("appliedCount") ?? 0) || 0,
    isActive: row["jq_is_active"] === true,
  };
};

/* Supports:
   { data: [...] }
   { data: { data: [...], totalRecords, totalPages } }
   { Data: { Data: [...], TotalRecords, TotalPages } }
*/
const getValue = (obj, keys, fallback = undefined) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  }
  return fallback;
};

const extractPage = (response) => {
  let current = response;
  let rows = null;
  let totalRecords;
  let totalPages;

  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (Array.isArray(current)) {
      rows = current;
      break;
    }

    if (typeof current !== "object") break;

    totalRecords ??= getValue(current, [
      "totalRecords",
      "TotalRecords",
      "totalCount",
      "TotalCount",
    ]);

    totalPages ??= getValue(current, ["totalPages", "TotalPages"]);

    const collection = getValue(current, [
      "items",
      "Items",
      "records",
      "Records",
      "data",
      "Data",
    ]);

    if (Array.isArray(collection)) {
      rows = collection;
      break;
    }

    if (collection && typeof collection === "object") {
      current = collection;
    } else {
      break;
    }
  }

  return {
    rows: rows ?? [],
    totalRecords: totalRecords !== undefined ? Number(totalRecords) : undefined,
    totalPages: totalPages !== undefined ? Number(totalPages) : undefined,
  };
};

// Solid, high-contrast colors so each badge type is easy to tell apart.
const TONE = {
  jobCategory: "bg-orange-600 cursor-pointer",
  active: "bg-green-600",
  inactive: "bg-red-600",
};

const Badge = ({ value, tone }) => (
  <span className={`${BADGE_BASE} ${tone}`} title={value}>
    <span className="truncate">{value}</span>
  </span>
);
// Shared text style for every table body cell.
const CELL_TEXT = "text-sm font-semibold text-[#34445a]";
const JobRequirementList = () => {
  const navigate = useNavigate();

  const [employer, setEmployer] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [apiTotalPages, setApiTotalPages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const employerId = employer?.EM_employer_id;

  // Step 1: load employer so jobs can be filtered by employer ID.
  useEffect(() => {
    let cancelled = false;

    const loadEmployer = async () => {
      setError("");

      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error(
            "Your login session could not be identified. Please sign in again.",
          );
        }

        const response = await getEmployerRequest(userId);
        const record = normalizeEmployer(
          extractEmployerRecord(getPayload(response)),
        );

        if (!record || record.EM_employer_id === undefined) {
          throw new Error("Employer details were not returned by the API.");
        }

        if (!cancelled) setEmployer(record);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load employer details.");
          setLoading(false);
        }
      }
    };

    loadEmployer();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Step 2: load job requirements once employer ID is known.
  useEffect(() => {
    if (!employerId) return undefined;

    let cancelled = false;

    const loadJobs = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getEmployerJobRequirementsPaginated(employerId, {
          pageNo: page,
          pageSize,
        });

        if (response?.Success === false || response?.success === false) {
          throw new Error(
            response?.Message ||
              response?.message ||
              "Unable to load job requirements.",
          );
        }

        const result = extractPage(response);

        if (cancelled) return;

        setJobs(result.rows.map(normalizeJob));
        setTotalRecords(
          result.totalRecords !== undefined
            ? result.totalRecords
            : result.rows.length,
        );
        setApiTotalPages(
          result.totalPages !== undefined
            ? Math.max(1, result.totalPages)
            : null,
        );
      } catch (err) {
        if (cancelled) return;

        setJobs([]);
        setTotalRecords(0);
        setApiTotalPages(null);
        setError(
          err?.response?.data?.Message ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load job requirements.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadJobs();

    return () => {
      cancelled = true;
    };
  }, [employerId, page, pageSize, reloadKey]);

  const totalPages = Math.max(
    1,
    apiTotalPages ?? Math.ceil(totalRecords / pageSize),
  );

  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage]);

  const headings = [
    "Sr.No",
    "Position & Location",
    "Job Type",
    "Job Role",
    "Job Category",
    "Vacancies",
    "Applied",
    "Status",
    "Action",
  ];

  const start = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalRecords);

  const pageNumbers = useMemo(() => {
    const count = 5;
    let from = Math.max(1, currentPage - Math.floor(count / 2));
    const to = Math.min(totalPages, from + count - 1);

    from = Math.max(1, to - count + 1);

    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [currentPage, totalPages]);

  const paginationButton =
    "grid h-8 min-w-8 place-items-center rounded-lg border px-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div>
      <StatCardGrid items={STATIC_STATS} />

      <div className="mt-2 min-h-full bg-[#f7f9fb] text-[#1e2b36]">
        <div className="mx-auto max-w-[1500px] rounded-xl border border-[#e2e8ee] bg-white p-4 shadow-sm sm:p-5">
          {/* Header */}
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#2c6b8a]">
              Job Requirement List
            </h1>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c9d5dd] px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => navigate("/employer/job-requirements/create")}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2c6b8a] px-3 text-sm font-semibold text-white hover:bg-[#245a75]"
              >
                <Plus size={16} />
                Add Job Requirement
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
                onClick={() => setReloadKey((value) => value + 1)}
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
                      Loading job requirements...
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
                        No job requirements found.
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
                        <div className="">
                          {job.position}
                        </div>
                        
                        <div className="mt-1 inline-flex items-center gap-1">
                          <MapPin
                            size={12}
                            className="shrink-0 text-[#9aa5b1]"
                          />
                          {job.location}
                        </div>
                      </td>

                      <td className={`px-3 py-3 ${CELL_TEXT}`}>
                        <span className="">
                          {job.instituteType}
                        </span>
                      </td>

                      <td className={`px-3 py-3 ${CELL_TEXT}`}>
                        <span className="">{job.jobRole}</span>
                      </td>

                      <td className={`px-3 py-3 ${CELL_TEXT}`}>
                        <Badge
                          value={job.jobCategory}
                          tone={TONE.jobCategory}
                        />
                      </td>

                      <td
                        className={`px-3 py-3 text-center tabular-nums ${CELL_TEXT}`}
                      >
                        {job.vacancies}
                      </td>

                      <td
                        className={`px-3 py-3 text-center tabular-nums ${CELL_TEXT}`}
                      >
                        {job.applied}
                      </td>

                      <td className={`px-3 py-3 ${CELL_TEXT}`}>
                        <Badge
                          value={job.isActive ? "Active" : "Inactive"}
                          tone={job.isActive ? TONE.active : TONE.inactive}
                        />
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/employer/job-requirements/${job.id}`)
                            }
                            title="View job requirement"
                            aria-label={`View ${job.position}`}
                            className="grid h-8 w-8 place-items-center rounded-md bg-[#2c9ba8] text-white transition hover:bg-[#238491]"
                          >
                            <ChevronsRight size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/employer/job-requirements/${job.id}/edit`,
                              )
                            }
                            title="Edit job requirement"
                            aria-label={`Edit ${job.position}`}
                            className="grid h-8 w-8 place-items-center rounded-md bg-[#2c6b8a] text-white transition hover:bg-[#245a75]"
                          >
                            <Pencil size={14} />
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

              <label className="flex items-center gap-2">
                <span>Show:</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-[#dce3eb] bg-white px-2 text-sm outline-none focus:border-[#2c6b8a]"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <nav
              aria-label="Job requirement pagination"
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
    </div>
  );
};

export default JobRequirementList;
