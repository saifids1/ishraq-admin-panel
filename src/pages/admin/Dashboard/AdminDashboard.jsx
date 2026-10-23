import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  FileText,
  MessageSquareWarning,
  RefreshCw,
  ShieldCheck,
  Star,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCardGrid } from "../../../components/common/Dashboardkit";
import { adminDashboardApi } from "../../../api/Services/adminDashboardApi";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";

const ENDPOINTS = [
  ["summary", "Dashboard summary", adminDashboardApi.getSummary],
  ["registrations", "Registration statistics", adminDashboardApi.getRegistrations],
  ["jobs", "Job statistics", adminDashboardApi.getJobs],
  ["enquiries", "Enquiry statistics", adminDashboardApi.getEnquiries],
  ["feedback", "Feedback statistics", adminDashboardApi.getFeedback],
  ["activity", "Recent activity", adminDashboardApi.getRecentActivity],
];

// Supports raw API data, Axios responses, and { success, message, data } responses.
const unwrapResponse = (response) => {
  let result = response?.data ?? response;
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result) {
    result = result.data;
  }
  return result ?? {};
};

const readValue = (record, key) => {
  const data = unwrapResponse(record);
  const value = data?.[key] ?? data?.[key[0].toUpperCase() + key.slice(1)] ?? 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const readItems = (response) => {
  const data = unwrapResponse(response);
  if (Array.isArray(data)) return data;
  const items = data?.items ?? data?.Items ?? data?.activity ?? data?.Activity;
  return Array.isArray(items) ? items : [];
};

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

const formatActivityDate = (value) => {
  if (!value) return "Date unavailable";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Date unavailable";

  const minutes = Math.round((timestamp - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
};

const Panel = ({ title, subtitle, icon: Icon, children, className = "" }) => (
  <section
    className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ${className}`}
  >
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2f6b8a]/10 text-[#2f6b8a]">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
);

const Metric = ({ label, value, detail }) => (
  <div className="rounded-xl bg-slate-50 px-3 py-2.5">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800">
      {formatNumber(value)}
    </p>
    {detail && <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>}
  </div>
);

const AnalyticsChart = ({
  title,
  subtitle,
  icon,
  data,
  bars,
  stacked = false,
  maxBarSize = 36,
}) => (
  <Panel title={title} subtitle={subtitle} icon={icon}>
    <div className="h-[260px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -18, bottom: 18 }}
          barCategoryGap="25%"
          accessibilityLayer
        >
          <CartesianGrid stroke="#e9eef3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#64748b" }}
            interval={0}
            height={42}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={formatNumber}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            formatter={(value, name) => [formatNumber(value), name]}
            contentStyle={{
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
          {bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name}
              fill={bar.color}
              radius={
                stacked
                  ? bar.topOfStack
                    ? [4, 4, 0, 0]
                    : [0, 0, 0, 0]
                  : [4, 4, 0, 0]
              }
              maxBarSize={maxBarSize}
              stackId={stacked ? "stack" : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </Panel>
);

const JobStatusChart = ({ data, total }) => {
  const hasValues = data.some((item) => item.value > 0);

  return (
    <Panel
      title="Job status distribution"
      subtitle="Open jobs compared with expired jobs"
      icon={BriefcaseBusiness}
    >
      <div className="relative h-[260px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={hasValues ? 3 : 0}
              stroke="none"
            >
              {data.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatNumber(value), name]}
              contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }}
            />
            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-5">
          <span className="text-xl font-bold tabular-nums text-slate-800">{formatNumber(total)}</span>
          <span className="text-[11px] text-slate-500">Total jobs</span>
        </div>
        {!hasValues && (
          <p className="pointer-events-none absolute inset-x-0 bottom-12 text-center text-[11px] text-slate-400">
            No job status data available
          </p>
        )}
      </div>
    </Panel>
  );
};

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled(ENDPOINTS.map(([, , request]) => request()));
    const updates = {};
    const failures = [];

    results.forEach((result, index) => {
      const [key, label] = ENDPOINTS[index];
      if (result.status === "fulfilled") {
        updates[key] = key === "activity" ? readItems(result.value) : unwrapResponse(result.value);
      } else {
        failures.push(`${label}: ${getApiErrorMessage(result.reason)}`);
      }
    });

    setDashboard((current) => ({ ...current, ...updates }));
    setErrors(failures);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = dashboard.summary;
  const registrations = dashboard.registrations;
  const jobs = dashboard.jobs;
  const enquiries = dashboard.enquiries;
  const feedback = dashboard.feedback;

  const totalJobseekers = readValue(summary, "totalJobseekers");
  const totalEmployers = readValue(summary, "totalEmployers");

  const registrationChartData = [
    {
      label: "Total",
      jobSeekers: readValue(registrations, "totalJobseekers"),
      employers: readValue(registrations, "totalEmployers"),
    },
    {
      label: "Today",
      jobSeekers: readValue(registrations, "jobseekersToday"),
      employers: readValue(registrations, "employersToday"),
    },
    {
      label: "This month",
      jobSeekers: readValue(registrations, "jobseekersThisMonth"),
      employers: readValue(registrations, "employersThisMonth"),
    },
  ];

  // Split account status into two separate charts.
  const jobseekerStatusChartData = [
    {
      label: "Jobseekers",
      active: readValue(summary, "activeJobseekers"),
      inactiveOrPending: readValue(summary, "inactiveJobseekers"),
    },
  ];

  const employerStatusChartData = [
    {
      label: "Employers",
      active: readValue(summary, "activeEmployers"),
      inactiveOrPending: readValue(summary, "pendingEmployers"),
    },
  ];

  // Job status pie: show only Open jobs (totalJobs − expiredJobs) and Expired jobs.
  const totalJobs = readValue(jobs, "totalJobs");
  const expiredJobs = readValue(jobs, "expiredJobs");
  const openJobs = Math.max(totalJobs - expiredJobs, 0);

  const jobStatusChartData = [
    { name: "Open jobs", value: openJobs, color: "#10b981" },
    { name: "Expired jobs", value: expiredJobs, color: "#f59e0b" },
  ];

  // Single stacked bar: each category contributes an "open" and a "resolved"
  // segment, stacked one above the other with its own color family.
  const complaintsTotal = readValue(enquiries, "totalComplaints");
  const complaintsOpen = readValue(enquiries, "openComplaints");
  const careerTotal = readValue(enquiries, "totalCareerEnquiries");
  const careerOpen = readValue(enquiries, "openCareerEnquiries");
  const contactTotal = readValue(enquiries, "totalContactEnquiries");
  const contactOpen = readValue(enquiries, "openContactEnquiries");

  const enquiryChartData = [
    {
      label: "Enquiries & complaints",
      complaintsResolved: Math.max(complaintsTotal - complaintsOpen, 0),
      complaintsOpen,
      careerResolved: Math.max(careerTotal - careerOpen, 0),
      careerOpen,
      contactResolved: Math.max(contactTotal - contactOpen, 0),
      contactOpen,
    },
  ];

  const jobRequirementChartData = [
    {
      label: "Job requirements",
      total: readValue(summary, "totalJobRequirements"),
      active: readValue(summary, "activeJobRequirements"),
      pending: readValue(summary, "pendingJobRequirements"),
    },
  ];

  const applicationChartData = [
    {
      label: "Applications",
      total: readValue(summary, "totalApplications"),
      active: readValue(summary, "activeApplications") || readValue(jobs, "activeApplications"),
    },
  ];

  const cards = [
    { title: "Jobseekers", value: totalJobseekers, icon: UserRound, color: "#0ea5e9", color2: "#38bdf8" },
    { title: "Employers", value: totalEmployers, icon: Building2, color: "#7c3aed", color2: "#818cf8" },
    { title: "Job requirements", value: readValue(summary, "totalJobRequirements"), icon: BriefcaseBusiness, color: "#f59e0b", color2: "#fb923c" },
    { title: "Applications", value: readValue(summary, "totalApplications"), icon: FileText, color: "#2f6b8a", color2: "#75c5c4" },
    { title: "Complaints", value: readValue(summary, "totalComplaints"), icon: MessageSquareWarning, color: "#e11d48", color2: "#fb7185" },
    { title: "Career enquiries", value: readValue(summary, "totalCareerEnquiries"), icon: UserPlus, color: "#10b981", color2: "#2dd4bf" },
    { title: "Contact enquiries", value: readValue(summary, "totalContactEnquiries"), icon: Users, color: "#6366f1", color2: "#a78bfa" },
    { title: "Feedback", value: readValue(summary, "totalFeedback"), icon: Star, color: "#d97706", color2: "#fbbf24" },
  ];

  return (
    <div className="min-h-full space-y-3 pb-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#17405a] via-[#2f6b8a] to-[#4a9bb3] px-4 py-4 text-white shadow-sm">
        <div>
          <h1 className="text-lg font-bold">Ishraq Admin</h1>
          <p className="mt-1 text-xs text-white/75">Platform overview and analytics</p>
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 text-sm font-semibold transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {errors.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-semibold">Some dashboard data could not be loaded.</p>
          <ul className="mt-1 list-inside list-disc">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
          <button type="button" onClick={loadDashboard} className="mt-2 font-semibold underline">Try again</button>
        </div>
      )}

      <div aria-busy={loading}>
        <StatCardGrid items={cards} />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <AnalyticsChart
          title="Registration overview"
          subtitle="Compare total, today, and this-month registrations"
          icon={UserPlus}
          data={registrationChartData}
          bars={[
            { dataKey: "jobSeekers", name: "Jobseekers", color: "#0ea5e9" },
            { dataKey: "employers", name: "Employers", color: "#8b5cf6" },
          ]}
        />
        <JobStatusChart data={jobStatusChartData} total={totalJobs} />
        <AnalyticsChart
          title="Enquiry and complaint status"
          subtitle="Single stacked bar — each category shown one above the other (resolved + open)"
          icon={MessageSquareWarning}
          data={enquiryChartData}
          stacked
          maxBarSize={140}
          bars={[
            // Complaints (rose)
            { dataKey: "complaintsResolved", name: "Complaints · Resolved", color: "#fda4af" },
            { dataKey: "complaintsOpen", name: "Complaints · Open", color: "#e11d48" },
            // Career enquiries (emerald)
            { dataKey: "careerResolved", name: "Career · Resolved", color: "#6ee7b7" },
            { dataKey: "careerOpen", name: "Career · Open", color: "#10b981" },
            // Contact enquiries (indigo)
            { dataKey: "contactResolved", name: "Contact · Resolved", color: "#a5b4fc" },
            { dataKey: "contactOpen", name: "Contact · Open", color: "#6366f1", topOfStack: true },
          ]}
        />
        <AnalyticsChart
          title="Jobseeker account status"
          subtitle="Active jobseekers compared with inactive jobseekers"
          icon={UserRound}
          data={jobseekerStatusChartData}
          bars={[
            { dataKey: "active", name: "Active", color: "#10b981" },
            { dataKey: "inactiveOrPending", name: "Inactive", color: "#f59e0b" },
          ]}
        />
        <AnalyticsChart
          title="Employer account status"
          subtitle="Active employers compared with pending employers"
          icon={Building2}
          data={employerStatusChartData}
          bars={[
            { dataKey: "active", name: "Active", color: "#8b5cf6" },
            { dataKey: "inactiveOrPending", name: "Pending", color: "#f59e0b" },
          ]}
        />
        <AnalyticsChart
          title="Job requirement overview"
          subtitle="Total, active, and pending job requirements"
          icon={BriefcaseBusiness}
          data={jobRequirementChartData}
          bars={[
            { dataKey: "total", name: "Total", color: "#64748b" },
            { dataKey: "active", name: "Active", color: "#10b981" },
            { dataKey: "pending", name: "Pending", color: "#f59e0b" },
          ]}
        />
        <AnalyticsChart
          title="Application overview"
          subtitle="Total applications compared with active applications"
          icon={FileText}
          data={applicationChartData}
          bars={[
            { dataKey: "total", name: "Total applications", color: "#2f6b8a" },
            { dataKey: "active", name: "Active applications", color: "#10b981" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel title="Feedback summary" subtitle="Feedback volume and average user rating" icon={Star}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Metric label="Total feedback" value={readValue(feedback, "totalFeedback")} />
            <Metric label="Active feedback" value={readValue(feedback, "activeFeedback")} />
            <Metric
              label="Average rating"
              value={Number(feedback?.averageRating ?? feedback?.AverageRating ?? 0).toFixed(1)}
              detail="out of 5"
            />
          </div>
        </Panel>

        <Panel title="Recent activity" subtitle={`${dashboard.activity?.length ?? 0} latest records`} icon={Activity}>
          {!dashboard.activity?.length ? (
            <p className="rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
              {loading ? "Loading recent activity..." : "No recent activity found."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {dashboard.activity.map((item, index) => {
                const type = item?.type ?? item?.Type ?? "Activity";
                const title = item?.title ?? item?.Title ?? "Untitled activity";
                const id = item?.id ?? item?.Id ?? index;
                const createdAt = item?.createdAt ?? item?.CreatedAt;
                const isActive = item?.isActive ?? item?.IsActive;

                return (
                  <li key={`${type}-${id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{type} · {formatActivityDate(createdAt)}</p>
                    </div>
                    {typeof isActive === "boolean" && (
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default AdminDashboard;