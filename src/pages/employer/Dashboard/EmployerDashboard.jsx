import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Inbox,
  MapPin,
  Target,
  UserPlus,
  Users,
} from "lucide-react";

import {
  StatCardGrid,
  Panel,
  KitStyles,
  DashboardHeader,
} from "../../../components/common/Dashboardkit";
import EmployerProfileProgress from "./EmployerProfileProgress";
import { getCurrentUserId } from "../../../utils/authUtils";
import {
  getPayload,
  extractEmployerRecord,
  normalizeEmployer,
  getEmployerRequest,
} from "../../../utils/employerProfile";
import { getEmployerJobRequirementsPaginated } from "../../../api/jobRequirementApi";

/* ------------------------------ CONSTANTS ------------------------------ */

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

const STATUS_BAR = {
  open: "bg-emerald-500",
  hold: "bg-amber-500",
  closed: "bg-rose-500",
};
const STATUS_BADGE = {
  open: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  hold: "bg-amber-50 text-amber-700 ring-amber-100",
  closed: "bg-rose-50 text-rose-600 ring-rose-100",
};
const barClass = (s) => STATUS_BAR[s.toLowerCase()] || "bg-slate-400";
const badgeClass = (s) =>
  STATUS_BADGE[s.toLowerCase()] || "bg-slate-100 text-slate-600 ring-slate-200";

/* ------------------------------ HELPERS ------------------------------ */

const normalizeJob = (item) => ({
  id: item?.jQ_job_requirement_id,
  position: item?.jQ_position_title || "Untitled position",
  location: item?.jobLocationName || "-",
  vacancies: Number(item?.jQ_vacancies) || 0,
  applied: Number(item?.appliedCount) || 0,
  statusName: item?.jobStatusName || "-",
});

const parseResponse = (response) => {
  const body =
    response?.totalRecords !== undefined || Array.isArray(response?.data)
      ? response
      : response?.data ?? response;

  const rows = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body)
      ? body
      : [];

  return {
    rows,
    totalPages: Math.max(1, Number(body?.totalPages ?? 1) || 1),
  };
};

const isFailed = (r) => r?.Success === false || r?.success === false;

const fetchAllJobs = async (employerId) => {
  const all = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await getEmployerJobRequirementsPaginated(employerId, {
      pageNo: page,
      pageSize: PAGE_SIZE,
    });
    if (isFailed(response)) {
      throw new Error(
        response?.Message ||
          response?.message ||
          "Unable to load job requirements.",
      );
    }
    const result = parseResponse(response);
    all.push(...result.rows.map(normalizeJob));
    totalPages = result.totalPages;
    page += 1;
  } while (page <= totalPages && page <= MAX_PAGES);

  return all;
};

const sum = (arr, key) => arr.reduce((s, item) => s + item[key], 0);

/* ------------------------------ DATA HOOK ------------------------------ */

const useEmployerDashboard = () => {
  const [state, setState] = useState({ loading: true, error: "", jobs: [] });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((s) => ({ ...s, loading: true, error: "" }));

      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error(
            "Your login session could not be identified. Please sign in again.",
          );
        }

        const employer = normalizeEmployer(
          extractEmployerRecord(getPayload(await getEmployerRequest(userId))),
        );
        if (!employer || employer.EM_employer_id === undefined) {
          throw new Error("Employer details were not returned by the API.");
        }

        const jobs = await fetchAllJobs(employer.EM_employer_id);
        if (!cancelled) setState({ loading: false, error: "", jobs });
      } catch (err) {
        if (!cancelled) {
          setState({
            loading: false,
            jobs: [],
            error:
              err?.response?.data?.Message ||
              err?.response?.data?.message ||
              err?.message ||
              "Failed to load dashboard data.",
          });
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return {
    ...state,
    retry: () => setReloadKey((k) => k + 1),
  };
};

/* ------------------------------ UI BITS ------------------------------ */

const EmptyState = ({ text }) => (
  <div className="flex flex-col items-center rounded-xl bg-slate-50 px-3 py-6 text-center">
    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a]">
      <Inbox size={18} />
    </div>
    <p className="mt-2 text-[12px] text-slate-500">{text}</p>
  </div>
);

const Loading = () => (
  <p className="py-6 text-center text-[12px] text-slate-500">Loading...</p>
);

/* ------------------------------ COMPONENT ------------------------------ */

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { jobs, loading, error, retry } = useEmployerDashboard();

  const stats = useMemo(() => {
    const open = jobs.filter((j) => j.statusName.toLowerCase() === "open");
    const vacancies = sum(jobs, "vacancies");
    const applicants = sum(jobs, "applied");

    const statusCounts = jobs.reduce((acc, j) => {
      acc[j.statusName] = (acc[j.statusName] || 0) + 1;
      return acc;
    }, {});

    const topByApplicants = [...jobs]
      .sort((a, b) => b.applied - a.applied)
      .slice(0, 5);

    return {
      posted: jobs.length,
      openCount: open.length,
      vacancies,
      applicants,
      statusCounts: Object.entries(statusCounts).sort((a, b) => b[1] - a[1]),
      topByApplicants,
      maxApplied: topByApplicants[0]?.applied || 0,
      recent: jobs.slice(0, 5),
    };
  }, [jobs]);

  const kpis = [
    {
      title: "Job requirements posted",
      value: stats.posted,
      note: "All time",
      icon: BriefcaseBusiness,
      color: "#6366f1",
      color2: "#8b5cf6",
      from: "#6366f1",
      to: "#8b5cf6",
    },
    {
      title: "Open jobs",
      value: stats.openCount,
      note: `of ${stats.posted} posted`,
      icon: BadgeCheck,
      color: "#10b981",
      color2: "#34d399",
      from: "#10b981",
      to: "#059669",
    },
    {
      title: "Total vacancies",
      value: stats.vacancies,
      note: "across all jobs",
      icon: Target,
      color: "#f59e0b",
      color2: "#fb923c",
      from: "#f59e0b",
      to: "#ef4444",
    },
    {
      title: "Total applicants",
      value: stats.applicants,
      note: "across all jobs",
      icon: Users,
      color: "#0ea5e9",
      color2: "#38bdf8",
      from: "#0ea5e9",
      to: "#2563eb",
    },
  ];

  return (
    <div className="isharq-dash min-h-full bg-slate-50 pb-4">
      <KitStyles />

      <DashboardHeader
        title="Isharq Employer"
        subtitle="Hiring overview"
        pills={[
          { value: stats.posted, label: "Job requirements" },
          { value: stats.openCount, label: "Open" },
          { value: stats.applicants, label: "Applicants" },
        ]}
      />

      {error && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={retry}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <StatCardGrid items={kpis} />

      {/* Row 1 */}
      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Applicants by job"
          subtitle="Top 5 jobs by applications"
          icon={UserPlus}
        >
          {loading ? (
            <Loading />
          ) : stats.topByApplicants.length === 0 ? (
            <EmptyState text="No job requirements yet" />
          ) : (
            <ul className="space-y-3">
              {stats.topByApplicants.map((j) => (
                <li key={j.id} className="text-[12px]">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-slate-800">
                      {j.position}
                    </span>
                    <b className="tabular-nums text-slate-800">{j.applied}</b>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600"
                      style={{
                        width: `${
                          stats.maxApplied
                            ? (j.applied / stats.maxApplied) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Jobs by status"
          subtitle={`${stats.posted} job requirements`}
          icon={Target}
        >
          {loading ? (
            <Loading />
          ) : stats.statusCounts.length === 0 ? (
            <EmptyState text="No job requirements yet" />
          ) : (
            <ul className="space-y-2">
              {stats.statusCounts.map(([status, count]) => (
                <li
                  key={status}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[12px]"
                >
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${badgeClass(
                      status,
                    )}`}
                  >
                    {status}
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`block h-1.5 rounded-full ${barClass(status)}`}
                      style={{ width: `${(count / stats.posted) * 80 || 0}px` }}
                    />
                    <b className="tabular-nums text-slate-800">{count}</b>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Row 2 */}
      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Recent job requirements"
          subtitle="Latest 5 postings"
          icon={BriefcaseBusiness}
          action={
            <button
              type="button"
              onClick={() => navigate("/employer/job-requirement-list")}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              View all
            </button>
          }
        >
          {loading ? (
            <Loading />
          ) : stats.recent.length === 0 ? (
            <EmptyState text="No job requirements yet" />
          ) : (
            <ul className="space-y-1">
              {stats.recent.map((j) => (
                <li
                  key={j.id}
                  className="grid grid-cols-[2fr_0.8fr_0.8fr_0.9fr] items-center gap-2 rounded-xl px-2 py-1.5 text-[12px] hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-800">
                      {j.position}
                    </span>
                    <span className="flex items-center gap-1 truncate text-[10px] text-slate-400">
                      <MapPin size={10} className="shrink-0" />
                      {j.location}
                    </span>
                  </span>
                  <span className="text-center tabular-nums text-slate-700">
                    {j.vacancies} <span className="text-slate-400">vac.</span>
                  </span>
                  <span className="text-center tabular-nums text-slate-700">
                    {j.applied} <span className="text-slate-400">applied</span>
                  </span>
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeClass(
                      j.statusName,
                    )}`}
                  >
                    {j.statusName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <EmployerProfileProgress />
      </div>
    </div>
  );
};

export default EmployerDashboard;