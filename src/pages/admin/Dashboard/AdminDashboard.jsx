import { useStatusToast } from "../../../components/common/StatusModalProvider";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  User,
  Building2,
  BriefcaseBusiness,
  FileText,
  MessageSquareWarning,
  UserPlus,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Download,
  Check,
  X,
  MapPin,
  Clock3,
  TrendingUp,
  Sparkles,
  CircleAlert,
  Flag,
} from "lucide-react";

import { StatCardGrid } from "../../../components/common/Dashboardkit";

/* ------------------------------------------------------------------ */
/*  Sample data (replace with your API)                                */
/* ------------------------------------------------------------------ */

const TOTALS = { seekers: 41380, employers: 6880, activeJobs: 3412 };

const RANGES = {
  d7: {
    label: "7 days",
    sub: "Last 7 days",
    series: [
      { label: "Mon", seekers: 112, employers: 14, jobs: 46, apps: 820 },
      { label: "Tue", seekers: 128, employers: 18, jobs: 58, apps: 964 },
      { label: "Wed", seekers: 141, employers: 21, jobs: 64, apps: 1050 },
      { label: "Thu", seekers: 119, employers: 16, jobs: 52, apps: 910 },
      { label: "Fri", seekers: 157, employers: 24, jobs: 71, apps: 1180 },
      { label: "Sat", seekers: 98, employers: 9, jobs: 30, apps: 640 },
      { label: "Sun", seekers: 76, employers: 7, jobs: 22, apps: 510 },
    ],
    d: {
      users: "+4.1%",
      seekers: "+3.8%",
      employers: "+6.2%",
      jobs: "+9%",
      apps: "+12%",
      fresh: "+7%",
      complaints: "-4",
    },
  },
  d30: {
    label: "30 days",
    sub: "Last 30 days",
    series: [
      { label: "Week 1", seekers: 790, employers: 96, jobs: 310, apps: 5600 },
      { label: "Week 2", seekers: 860, employers: 104, jobs: 342, apps: 6100 },
      { label: "Week 3", seekers: 935, employers: 118, jobs: 371, apps: 6700 },
      { label: "Week 4", seekers: 1010, employers: 131, jobs: 398, apps: 7200 },
    ],
    d: {
      users: "+9.6%",
      seekers: "+8.9%",
      employers: "+14%",
      jobs: "+11%",
      apps: "+16%",
      fresh: "+13%",
      complaints: "-9",
    },
  },
};

const STATUS_MIX = [
  { name: "Active", value: 38900, color: "#2f6b8a" },
  { name: "Inactive", value: 7420, color: "#73c8a4" },
  { name: "Suspended", value: 1180, color: "#f3b47d" },
  { name: "Pending", value: 760, color: "#b9a1ed" },
];

const CATEGORIES = [
  { name: "IT & Software", value: 842, color: "#2f6b8a" },
  { name: "Healthcare", value: 521, color: "#4e9fc0" },
  { name: "Sales & Marketing", value: 498, color: "#75c5c4" },
  { name: "Manufacturing", value: 402, color: "#7bc8a6" },
  { name: "Finance & Banking", value: 366, color: "#91a8dc" },
  { name: "Education", value: 331, color: "#b9a1ed" },
  { name: "Hospitality", value: 262, color: "#f3b47d" },
  { name: "Others", value: 190, color: "#cbd5e1" },
];

const APP_STAGES = [
  { name: "Received", share: 1, color: "#2f6b8a" },
  { name: "Viewed by employer", share: 0.71, color: "#4e9fc0" },
  { name: "Shortlisted", share: 0.24, color: "#75c5c4" },
  { name: "Interview", share: 0.09, color: "#a78bfa" },
  { name: "Hired", share: 0.032, color: "#22c58b" },
];

const CITIES = [
  { name: "Mumbai", value: 24 },
  { name: "Pune", value: 19 },
  { name: "Aurangabad", value: 12 },
  { name: "Nagpur", value: 9 },
  { name: "Nashik", value: 7 },
  { name: "Other cities", value: 29 },
];

const JOBS_INIT = [
  {
    id: 1,
    title: "Senior Java Developer",
    company: "Sahyadri Infotech",
    cat: "IT & Software",
    city: "Pune",
    applicants: 86,
    status: "Active",
    posted: "2h ago",
  },
  {
    id: 2,
    title: "Staff Nurse",
    company: "Godavari Hospital",
    cat: "Healthcare",
    city: "Aurangabad",
    applicants: 41,
    status: "Pending",
    posted: "35m ago",
  },
  {
    id: 3,
    title: "Field Sales Executive",
    company: "Brightline FMCG",
    cat: "Sales & Marketing",
    city: "Nagpur",
    applicants: 63,
    status: "Active",
    posted: "4h ago",
  },
  {
    id: 4,
    title: "Work from home data entry, pay upfront",
    company: "QuickEarn Services",
    cat: "Others",
    city: "Mumbai",
    applicants: 212,
    status: "Flagged",
    posted: "1h ago",
  },
  {
    id: 5,
    title: "CNC Machine Operator",
    company: "Waluj Components",
    cat: "Manufacturing",
    city: "Aurangabad",
    applicants: 29,
    status: "Pending",
    posted: "50m ago",
  },
  {
    id: 6,
    title: "Relationship Manager",
    company: "Deccan Finserv",
    cat: "Finance & Banking",
    city: "Nashik",
    applicants: 54,
    status: "Active",
    posted: "6h ago",
  },
  {
    id: 7,
    title: "Primary School Teacher",
    company: "Little Oak School",
    cat: "Education",
    city: "Pune",
    applicants: 37,
    status: "Pending",
    posted: "1h ago",
  },
  {
    id: 8,
    title: "Front Office Associate",
    company: "Ajanta Residency",
    cat: "Hospitality",
    city: "Aurangabad",
    applicants: 22,
    status: "Active",
    posted: "8h ago",
  },
];

const JOB_STATUS_STYLE = {
  Active: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  Pending: "bg-amber-50 text-amber-600 ring-amber-100",
  Flagged: "bg-rose-50 text-rose-600 ring-rose-100",
};

const COMPLAINTS_INIT = [
  {
    id: "C-2041",
    subject: "Job post asks for a registration fee",
    from: "Job seeker",
    cat: "Fraud",
    pri: "High",
    status: "Open",
    age: "1h",
  },
  {
    id: "C-2040",
    subject: "Recruiter sent abusive messages",
    from: "Job seeker",
    cat: "Harassment",
    pri: "High",
    status: "Open",
    age: "3h",
  },
  {
    id: "C-2039",
    subject: "Candidate stopped responding after offer",
    from: "Employer",
    cat: "Conduct",
    pri: "Medium",
    status: "In review",
    age: "5h",
  },
  {
    id: "C-2038",
    subject: "Company documents fail to upload",
    from: "Employer",
    cat: "Technical",
    pri: "Low",
    status: "Open",
    age: "7h",
  },
  {
    id: "C-2037",
    subject: "Same job posted many times",
    from: "Job seeker",
    cat: "Spam",
    pri: "Medium",
    status: "In review",
    age: "1d",
  },
  {
    id: "C-2036",
    subject: "Resume visible to unverified company",
    from: "Job seeker",
    cat: "Privacy",
    pri: "High",
    status: "Resolved",
    age: "1d",
  },
];

const PRI_STYLE = {
  High: "bg-rose-50 text-rose-600",
  Medium: "bg-amber-50 text-amber-600",
  Low: "bg-slate-100 text-slate-500",
};

const VERIFY_INIT = [
  {
    id: 1,
    company: "Kailash Logistics",
    industry: "Transport",
    city: "Nagpur",
    docs: "GST, PAN",
    when: "20 min ago",
  },
  {
    id: 2,
    company: "BluePeak Solutions",
    industry: "IT services",
    city: "Pune",
    docs: "GST, CIN",
    when: "1h ago",
  },
  {
    id: 3,
    company: "Ananya Diagnostics",
    industry: "Healthcare",
    city: "Aurangabad",
    docs: "PAN",
    when: "2h ago",
  },
  {
    id: 4,
    company: "Vikram Auto Parts",
    industry: "Manufacturing",
    city: "Nashik",
    docs: "GST, PAN",
    when: "3h ago",
  },
];

const SIGNUPS = [
  {
    id: 1,
    name: "Pooja Jadhav",
    type: "Job seeker",
    city: "Aurangabad",
    when: "2 min ago",
    verified: true,
  },
  {
    id: 2,
    name: "Orbit Retail Pvt Ltd",
    type: "Employer",
    city: "Mumbai",
    when: "9 min ago",
    verified: false,
  },
  {
    id: 3,
    name: "Imran Khan",
    type: "Job seeker",
    city: "Pune",
    when: "14 min ago",
    verified: true,
  },
  {
    id: 4,
    name: "Neha Bhosale",
    type: "Job seeker",
    city: "Nagpur",
    when: "21 min ago",
    verified: true,
  },
  {
    id: 5,
    name: "Harmony Cafe & Co",
    type: "Employer",
    city: "Nashik",
    when: "34 min ago",
    verified: false,
  },
  {
    id: 6,
    name: "Sagar Wagh",
    type: "Job seeker",
    city: "Aurangabad",
    when: "41 min ago",
    verified: true,
  },
];

const FEED_POOL = [
  { icon: UserPlus, tone: "sky", text: "New job seeker registered from Pune" },
  {
    icon: BriefcaseBusiness,
    tone: "emerald",
    text: "Waluj Components posted 3 new jobs",
  },
  {
    icon: MessageSquareWarning,
    tone: "rose",
    text: "New complaint filed: misleading salary",
  },
  {
    icon: ShieldCheck,
    tone: "violet",
    text: "Employer submitted documents for review",
  },
  {
    icon: FileText,
    tone: "amber",
    text: "Applications are up 18% in the last hour",
  },
  { icon: Building2, tone: "sky", text: "New employer registered from Nagpur" },
];

const TONE = {
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  sky: "bg-sky-50 text-[#2f6b8a]",
  rose: "bg-rose-50 text-rose-500",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function useCountUp(value, duration = 800) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setV(value);
      prev.current = value;
      return undefined;
    }
    const from = prev.current;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setV(from + (value - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return Math.round(v);
}

const sparkFrom = (end, seed) =>
  Array.from({ length: 8 }, (_, i) =>
    i === 7 ? end : end * (0.9 + 0.05 * Math.sin(i * 1.2 + seed) + i * 0.012),
  );

const Sparkline = ({ data, color }) => {
  const w = 60,
    h = 24;
  const min = Math.min(...data),
    max = Math.max(...data);
  const pts = data.map((d, i) => [
    (i / (data.length - 1)) * w,
    h - 3 - ((d - min) / (max - min || 1)) * (h - 6),
  ]);
  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const id = `sp-${color.replace("#", "")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/* Heartbeat trace, shaped after the supplied ECG reference line */
const BEAT = [
  [0, 138],
  [22, 133],
  [53, 142],
  [68, 75],
  [84, 170],
  [99, 138],
  [122, 130],
  [137, 142],
  [153, 130],
  [168, 138],
];
const ECG_PATH = (() => {
  let d = "M0,30";
  for (let k = 0; k < 5; k++) {
    BEAT.forEach(([dx, y]) => {
      d += ` L${(k * 192 + 36 + dx * 0.5).toFixed(1)},${(30 + (y - 138) * 0.3).toFixed(1)}`;
    });
  }
  return `${d} L960,30`;
})();

const HeartbeatStrip = () => (
  <svg
    viewBox="0 0 960 60"
    preserveAspectRatio="none"
    className="h-11 w-full"
    role="img"
    aria-label="Live platform activity pulse"
  >
    <path
      d={ECG_PATH}
      fill="none"
      stroke="#fff"
      strokeOpacity="0.22"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      className="ecg-trace"
      d={ECG_PATH}
      pathLength="1"
      fill="none"
      stroke="#fff"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle className="ecg-dot" cx="454" cy="11" r="4.5" fill="#fff" />
  </svg>
);

const fmt = (n) => n.toLocaleString("en-IN");

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */

const Segmented = ({ options, value, onChange, dark = false, label }) => (
  <div
    role="group"
    aria-label={label}
    className={`inline-flex rounded-lg p-0.5 ${dark ? "bg-white/15" : "bg-slate-100"}`}
  >
    {options.map((o) => {
      const active = value === o.value;
      return (
        <button
          key={o.value}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6b8a] ${
            active
              ? dark
                ? "bg-white text-[#1d4a63] shadow-sm"
                : "bg-white text-[#2f6b8a] shadow-sm"
              : dark
                ? "text-white/80 hover:text-white"
                : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

const Panel = ({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className = "",
}) => (
  <section
    className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm ${className}`}
  >
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#2f6b8a]/15 to-[#75c5c4]/20">
          <Icon size={14} className="text-[#2f6b8a]" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold leading-tight text-slate-800">
            {title}
          </h2>
          {subtitle && (
            <p className="truncate text-[10px] text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2 shadow-lg">
      <p className="mb-0.5 text-[10px] font-medium text-slate-500">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-1.5 text-[11px]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-slate-500">{p.name}</span>
          <span className="font-semibold text-slate-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const KpiCard = ({ item, index, selected, onSelect }) => {
  const Icon = item.icon;
  const n = useCountUp(item.value);
  const Wrapper = item.metric ? "button" : "div";
  return (
    <Wrapper
      {...(item.metric
        ? {
            type: "button",
            onClick: () => onSelect(item.metric),
            "aria-pressed": selected,
          }
        : {})}
      className={`kpi-card group relative w-full min-w-0 overflow-hidden rounded-2xl border bg-white p-3 text-left shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6b8a] ${
        selected
          ? "border-[#2f6b8a]/60 ring-1 ring-[#2f6b8a]/30"
          : "border-slate-200/80 hover:border-[#2f6b8a]/40"
      } ${item.metric ? "cursor-pointer" : ""}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full opacity-[0.10] blur-xl transition-opacity group-hover:opacity-25"
        style={{ background: item.color }}
      />
      <div className="relative flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium text-slate-500">
          {item.title}
        </p>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white"
          style={{
            background: `linear-gradient(135deg, ${item.color}, ${item.color2})`,
          }}
        >
          <Icon size={13} />
        </span>
      </div>
      <div className="relative mt-1 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[22px] font-bold tabular-nums tracking-tight text-slate-800">
            {fmt(n)}
          </span>
          <div className="mt-0.5 flex items-center gap-1 text-[10px]">
            {item.good ? (
              <ArrowUpRight size={11} className="text-emerald-600" />
            ) : (
              <ArrowDownRight size={11} className="text-rose-500" />
            )}
            <span
              className={`font-semibold ${item.good ? "text-emerald-600" : "text-rose-500"}`}
            >
              {item.delta}
            </span>
            <span className="truncate text-slate-400">{item.note}</span>
          </div>
        </div>
        <Sparkline data={item.spark} color={item.color} />
      </div>
    </Wrapper>
  );
};

const BarRow = ({
  name,
  right,
  pct,
  color,
  dim,
  onClick,
  active,
  animKey,
  delay = 0,
}) => {
  const inner = (
    <>
      <div className="mb-0.5 flex items-center justify-between text-[11px]">
        <span className="font-medium text-slate-600">{name}</span>
        <span className="tabular-nums text-slate-500">{right}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          key={animKey}
          className="bar-grow h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${color}99)`,
            animationDelay: `${delay}ms`,
          }}
        />
      </div>
    </>
  );
  const cls = `w-full rounded-lg px-1.5 py-1 text-left transition ${dim ? "opacity-45" : ""} ${active ? "bg-[#2f6b8a]/[0.07]" : onClick ? "hover:bg-slate-50" : ""}`;
  return onClick ? (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${cls} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6b8a]`}
    >
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
};

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

const AdminDashboard = () => {
  const [range, setRange] = useState("d30");
  const [metric, setMetric] = useState("users");
  const [activeStatus, setActiveStatus] = useState(null);
  const [cat, setCat] = useState(null);
  const [hoverCity, setHoverCity] = useState(null);

  const [jobs, setJobs] = useState(JOBS_INIT);
  const [jobQuery, setJobQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("All");

  const [complaints, setComplaints] = useState(COMPLAINTS_INIT);
  const [complaintTab, setComplaintTab] = useState("Open");

  const [verify, setVerify] = useState(VERIFY_INIT);
  const [userFilter, setUserFilter] = useState("All");

  const [online, setOnline] = useState(1284);
  const [signupsToday, setSignupsToday] = useState(187);
  const [feed, setFeed] = useState([
    { id: 1, ...FEED_POOL[0], when: "1 min ago" },
    { id: 2, ...FEED_POOL[3], when: "6 min ago" },
    { id: 3, ...FEED_POOL[1], when: "12 min ago" },
  ]);
  const feedCursor = useRef(3);
  const [toast, setToast] = useStatusToast();

  const r = RANGES[range];
  const sum = (k) => r.series.reduce((s, d) => s + d[k], 0);
  const newUsers = sum("seekers") + sum("employers");
  const totalUsers = TOTALS.seekers + TOTALS.employers;

  const openComplaints =
    24 + complaints.filter((c) => c.status !== "Resolved").length;
  const pendingVerify = 14 + verify.length;

  const notify = (msg) => setToast({ id: Date.now(), msg });
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Simulated live activity: replace with a websocket or polling hook
  useEffect(() => {
    const t = setInterval(() => {
      const item = FEED_POOL[feedCursor.current % FEED_POOL.length];
      feedCursor.current += 1;
      setOnline((o) =>
        Math.max(1100, o + Math.round((Math.random() - 0.45) * 14)),
      );
      if (item.icon === UserPlus || item.icon === Building2)
        setSignupsToday((s) => s + 1);
      setFeed((f) =>
        [
          { id: Date.now(), ...item, when: "just now" },
          ...f.map((x) =>
            x.when === "just now" ? { ...x, when: "1 min ago" } : x,
          ),
        ].slice(0, 5),
      );
    }, 9000);
    return () => clearInterval(t);
  }, []);

  const kpis = [
    {
      title: "Total users",
      value: totalUsers,
      delta: r.d.users,
      good: true,
      note: "vs prev.",
      icon: Users,
      color: "#2f6b8a",
      color2: "#5ba6bd",
      spark: sparkFrom(totalUsers, 1),
    },
    {
      title: "Job seekers",
      value: TOTALS.seekers,
      delta: r.d.seekers,
      good: true,
      note: "vs prev.",
      icon: User,
      color: "#0ea5e9",
      color2: "#38bdf8",
      spark: r.series.map((d) => d.seekers),
    },
    {
      title: "Employers",
      value: TOTALS.employers,
      delta: r.d.employers,
      good: true,
      note: "vs prev.",
      icon: Building2,
      color: "#7c3aed",
      color2: "#818cf8",
      spark: r.series.map((d) => d.employers),
    },
    {
      title: "Active Users",
      value: newUsers,
      delta: r.d.fresh,
      good: true,
      note: r.label,
      icon: UserPlus,
      color: "#10b981",
      color2: "#2dd4bf",
      spark: r.series.map((d) => d.seekers + d.employers),
      metric: "users",
    },
    {
      title: "Job requirements",
      value: TOTALS.activeJobs,
      delta: r.d.jobs,
      good: true,
      note: "active",
      icon: BriefcaseBusiness,
      color: "#f59e0b",
      color2: "#fb923c",
      spark: r.series.map((d) => d.jobs),
      metric: "jobs",
    },
    {
      title: "Applications",
      value: sum("apps"),
      delta: r.d.apps,
      good: true,
      note: r.label,
      icon: FileText,
      color: "#2f6b8a",
      color2: "#75c5c4",
      spark: r.series.map((d) => d.apps),
      metric: "apps",
    },
    {
      title: "Open complaints",
      value: openComplaints,
      delta: r.d.complaints,
      good: r.d.complaints.startsWith("-"),
      note: "vs prev.",
      icon: MessageSquareWarning,
      color: "#e11d48",
      color2: "#fb7185",
      spark: sparkFrom(openComplaints, 3).reverse(),
    },
    {
      title: "Feedback",
      value: pendingVerify,
      delta: "+3",
      good: false,
      note: "waiting",
      icon: ShieldCheck,
      color: "#6366f1",
      color2: "#a78bfa",
      spark: sparkFrom(pendingVerify, 5),
    },
  ];

  const chartSeries = {
    users: [
      { key: "seekers", name: "Job seekers", color: "#2f6b8a", stack: true },
      { key: "employers", name: "Employers", color: "#a78bfa", stack: true },
    ],
    jobs: [{ key: "jobs", name: "Job posts", color: "#f59e0b" }],
    apps: [{ key: "apps", name: "Applications", color: "#10b981" }],
  }[metric];

  const metricValues = r.series.map((d) =>
    metric === "users" ? d.seekers + d.employers : d[metric],
  );
  const peakIdx = metricValues.indexOf(Math.max(...metricValues));
  const metricTotal = metricValues.reduce((a, b) => a + b, 0);
  const metricLabel = {
    users: "new users",
    jobs: "job posts",
    apps: "applications",
  }[metric];

  const visibleJobs = useMemo(() => {
    const q = jobQuery.trim().toLowerCase();
    return jobs.filter(
      (j) =>
        (!cat || j.cat === cat) &&
        (jobFilter === "All" || j.status === jobFilter) &&
        (!q ||
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.city.toLowerCase().includes(q)),
    );
  }, [jobs, cat, jobFilter, jobQuery]);

  const setJobStatus = (id, status, msg) => {
    setJobs((js) =>
      status === "Removed"
        ? js.filter((j) => j.id !== id)
        : js.map((j) => (j.id === id ? { ...j, status } : j)),
    );
    notify(msg);
  };

  const advanceComplaint = (id) => {
    setComplaints((cs) =>
      cs.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "Open" ? "In review" : "Resolved" }
          : c,
      ),
    );
    const c = complaints.find((x) => x.id === id);
    notify(
      c.status === "Open" ? `${id} moved to review` : `${id} marked resolved`,
    );
  };

  const decide = (item, approved) => {
    setVerify((v) => v.filter((x) => x.id !== item.id));
    notify(approved ? `${item.company} verified` : `${item.company} rejected`);
  };

  const exportCsv = () => {
    const head = ["Job", "Company", "Category", "City", "Applicants", "Status"];
    const rows = visibleJobs.map((j) => [
      j.title,
      j.company,
      j.cat,
      j.city,
      j.applicants,
      j.status,
    ]);
    const csv = [head, ...rows]
      .map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "isharq-job-posts.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusCenter =
    activeStatus == null
      ? { v: fmt(totalUsers), l: "Total users" }
      : {
          v: fmt(STATUS_MIX[activeStatus].value),
          l: STATUS_MIX[activeStatus].name,
        };

  const visibleComplaints = complaints.filter((c) =>
    complaintTab === "Open" ? c.status !== "Resolved" : c.status === "Resolved",
  );
  const visibleSignups = SIGNUPS.filter(
    (s) => userFilter === "All" || s.type === userFilter,
  );

  return (
    <div className="isharq-dash min-h-full pb-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        .isharq-dash { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; }
        @keyframes kpi-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes ecg-sweep { from { stroke-dashoffset: 0.16; } to { stroke-dashoffset: -1; } }
        @keyframes ecg-beat { 0%, 100% { opacity: 0; transform: scale(.6); } 8% { opacity: 1; transform: scale(1.5); } 30% { opacity: 0; transform: scale(2.4); } }
        @keyframes live-ping { 75%, 100% { transform: scale(2.4); opacity: 0; } }
        @keyframes feed-in { from { opacity: 0; transform: translateY(-6px); background: #eef7fa; } to { opacity: 1; transform: none; } }
        @keyframes row-in { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
        @keyframes bar-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes toast-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .kpi-card { animation: kpi-in .5s ease both; }
        .ecg-trace { stroke-dasharray: 0.16 1; filter: drop-shadow(0 0 4px rgba(255,255,255,.9)); animation: ecg-sweep 3.6s linear infinite; }
        .ecg-dot { transform-box: fill-box; transform-origin: center; animation: ecg-beat 3.6s ease-out infinite; animation-delay: 1.6s; }
        .live-ping { animation: live-ping 1.6s cubic-bezier(0,0,.2,1) infinite; }
        .feed-item:first-child { animation: feed-in .6s ease both; }
        .row-in { animation: row-in .25s ease both; }
        .bar-grow { transform-origin: left; animation: bar-grow .7s cubic-bezier(.2,.8,.2,1) both; }
        .toast-in { animation: toast-in .25s ease both; }
        @media (prefers-reduced-motion: reduce) {
          .kpi-card, .ecg-trace, .ecg-dot, .live-ping, .feed-item:first-child, .row-in, .bar-grow, .toast-in { animation: none !important; }
          .ecg-trace { stroke-dasharray: none; filter: none; }
          .ecg-dot { opacity: 1; }
        }
      `}</style>

      {/* HEADER / PULSE */}
      <header
        className="relative mb-3 overflow-hidden rounded-2xl text-white shadow-sm"
        style={{
          background:
            "linear-gradient(110deg,#17405a 0%,#2f6b8a 52%,#4a9bb3 100%)",
        }}
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-[#9ee0e0]/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              <h1 className="text-base font-bold leading-none tracking-tight">
                Ishraq Admin
              </h1>
            </div>
            <p className="mt-1 text-[11px] text-white/70">
              Platform overview · {r.sub}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-3 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] sm:flex">
              <span>
                <b className="text-sm tabular-nums">{fmt(online)}</b>{" "}
                <span className="text-white/70">Enquiry</span>
              </span>
              <span className="h-4 w-px bg-white/20" />
              <span>
                <b className="text-sm tabular-nums">{signupsToday}</b>{" "}
                <span className="text-white/70">Feedback</span>
              </span>
              <span className="h-4 w-px bg-white/20" />
              <span>
                <b className="text-sm tabular-nums">{openComplaints}</b>{" "}
                <span className="text-white/70">open complaints</span>
              </span>
            </div>
            <Segmented
              dark
              label="Time range"
              value={range}
              onChange={setRange}
              options={Object.entries(RANGES).map(([value, v]) => ({
                value,
                label: v.label,
              }))}
            />
          </div>
        </div>
        <div className="relative px-1 pb-1 pt-1">
          <HeartbeatStrip />
        </div>
      </header>

      <StatCardGrid items={kpis} />

      {/* ROW 1: growth + user status */}
      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Platform growth"
          subtitle={`${r.sub} · pick a card above or a tab here`}
          icon={TrendingUp}
          action={
            <Segmented
              label="Metric"
              value={metric}
              onChange={setMetric}
              options={[
                { value: "users", label: "New users" },
                { value: "jobs", label: "Job posts" },
                { value: "apps", label: "Applications" },
              ]}
            />
          }
        >
          <div className="h-[176px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={r.series}
                margin={{ top: 6, right: 6, left: -18, bottom: 0 }}
              >
                <defs>
                  {["#2f6b8a", "#a78bfa", "#f59e0b", "#10b981"].map((c) => (
                    <linearGradient
                      key={c}
                      id={`g${c.slice(1)}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={c} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={c} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  stroke="#eef2f6"
                  vertical={false}
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  dy={6}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                />
                <Tooltip content={<ChartTooltip />} />
                {chartSeries.map((s) => (
                  <Area
                    key={`${metric}-${s.key}`}
                    type="monotone"
                    dataKey={s.key}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={2.2}
                    stackId={s.stack ? "a" : undefined}
                    fill={`url(#g${s.color.slice(1)})`}
                    animationDuration={700}
                    activeDot={{
                      r: 4.5,
                      fill: s.color,
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600">
            {chartSeries.map((s) => (
              <span key={s.key} className="flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: s.color }}
                />
                {s.name}
              </span>
            ))}
            <span className="ml-auto">
              <b className="tabular-nums text-slate-800">{fmt(metricTotal)}</b>{" "}
              {metricLabel} · peak {r.series[peakIdx].label}
            </span>
          </div>
        </Panel>

        <Panel
          title="Users by status"
          subtitle="Hover a segment for the count"
          icon={Users}
        >
          <div className="flex items-center gap-3">
            <div className="relative h-[132px] w-[132px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={STATUS_MIX}
                    dataKey="value"
                    innerRadius={44}
                    outerRadius={62}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                    animationDuration={900}
                    onMouseEnter={(_, i) => setActiveStatus(i)}
                    onMouseLeave={() => setActiveStatus(null)}
                  >
                    {STATUS_MIX.map((a, i) => (
                      <Cell
                        key={a.name}
                        fill={a.color}
                        opacity={
                          activeStatus == null || activeStatus === i ? 1 : 0.3
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-bold tabular-nums text-slate-800">
                  {statusCenter.v}
                </span>
                <span className="text-[9px] text-slate-400">
                  {statusCenter.l}
                </span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1">
              {STATUS_MIX.map((a, i) => (
                <li
                  key={a.name}
                  onMouseEnter={() => setActiveStatus(i)}
                  onMouseLeave={() => setActiveStatus(null)}
                  className={`flex items-center justify-between rounded-md px-1.5 py-1 text-[11px] transition ${activeStatus === i ? "bg-slate-50" : ""}`}
                >
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span
                      className="h-2 w-2 rounded-sm"
                      style={{ background: a.color }}
                    />
                    {a.name}
                  </span>
                  <b className="tabular-nums text-slate-800">
                    {((a.value / totalUsers) * 100).toFixed(1)}%
                  </b>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-sky-50/70 px-3 py-1.5">
              <p className="text-[10px] text-slate-500">Job seekers</p>
              <p className="text-sm font-bold text-[#2f6b8a]">
                {((TOTALS.seekers / totalUsers) * 100).toFixed(0)}%
              </p>
            </div>
            <div className="rounded-xl bg-violet-50/70 px-3 py-1.5">
              <p className="text-[10px] text-slate-500">Employers</p>
              <p className="text-sm font-bold text-violet-600">
                {((TOTALS.employers / totalUsers) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {/* ROW 2: categories, application flow, cities */}
      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel
          title="Jobs by category"
          subtitle="Select one to filter job posts below"
          icon={BriefcaseBusiness}
          action={
            cat && (
              <button
                type="button"
                onClick={() => setCat(null)}
                className="flex items-center gap-1 rounded-md bg-[#2f6b8a]/10 px-2 py-1 text-[10px] font-semibold text-[#2f6b8a] hover:bg-[#2f6b8a]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6b8a]"
              >
                Clear <X size={11} />
              </button>
            )
          }
        >
          <ul className="space-y-0.5">
            {CATEGORIES.map((c) => (
              <li key={c.name}>
                <BarRow
                  name={c.name}
                  right={
                    <>
                      <b className="text-slate-800">{fmt(c.value)}</b>
                    </>
                  }
                  pct={(c.value / CATEGORIES[0].value) * 100}
                  color={c.color}
                  active={cat === c.name}
                  dim={cat && cat !== c.name}
                  onClick={() => setCat(cat === c.name ? null : c.name)}
                  animKey={c.name}
                />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Employer verification"
          subtitle={`${verify.length} waiting in this view`}
          icon={ShieldCheck}
        >
          {verify.length === 0 && (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-500">
              No employers waiting for verification.
            </p>
          )}
          <ul className="space-y-1.5">
            {verify.map((v) => (
              <li
                key={v.id}
                className="row-in flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-400 text-[11px] font-bold text-white">
                  {v.company[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-slate-800">
                    {v.company}
                  </p>
                  <p className="truncate text-[10px] text-slate-400">
                    {v.industry} · {v.city} · {v.docs} · {v.when}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Approve ${v.company}`}
                  onClick={() => decide(v, true)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  aria-label={`Reject ${v.company}`}
                  onClick={() => decide(v, false)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ROW 3: job posts + complaints */}
      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Job posts to moderate"
          subtitle={`${visibleJobs.length} of ${jobs.length} posts${cat ? ` · ${cat}` : ""}`}
          icon={BriefcaseBusiness}
          action={
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6b8a]"
            >
              <Download size={12} /> Export
            </button>
          }
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <label className="relative min-w-[150px] flex-1">
              <span className="sr-only">Search job posts</span>
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={jobQuery}
                onChange={(e) => setJobQuery(e.target.value)}
                placeholder="Search job, company or city"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-[#2f6b8a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2f6b8a]/20"
              />
            </label>
            <Segmented
              label="Status filter"
              value={jobFilter}
              onChange={setJobFilter}
              options={["All", "Pending", "Active", "Flagged"].map((v) => ({
                value: v,
                label: v,
              }))}
            />
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[580px]">
              <div className="grid grid-cols-[2fr_1fr_0.7fr_0.8fr_0.9fr] gap-2 px-2 pb-1 text-[10px] font-semibold text-slate-400">
                <span>Job</span>
                <span>City</span>
                <span>Applicants</span>
                <span>Status</span>
                <span className="text-right">Action</span>
              </div>
              {visibleJobs.length === 0 && (
                <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-500">
                  No job posts match. Clear the search, status or category
                  filter.
                </p>
              )}
              <ul className="space-y-1">
                {visibleJobs.map((j) => (
                  <li
                    key={j.id}
                    className="row-in grid grid-cols-[2fr_1fr_0.7fr_0.8fr_0.9fr] items-center gap-2 rounded-xl px-2 py-1.5 text-[11px] hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-800">
                        {j.title}
                      </span>
                      <span className="block truncate text-[10px] text-slate-400">
                        {j.company} · {j.cat} · {j.posted}
                      </span>
                    </span>
                    <span className="truncate text-slate-600">{j.city}</span>
                    <span className="tabular-nums font-semibold text-slate-700">
                      {j.applicants}
                    </span>
                    <span
                      className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${JOB_STATUS_STYLE[j.status]}`}
                    >
                      {j.status}
                    </span>
                    <span className="flex justify-end gap-1">
                      {j.status === "Pending" && (
                        <>
                          <button
                            type="button"
                            aria-label={`Approve ${j.title}`}
                            onClick={() =>
                              setJobStatus(
                                j.id,
                                "Active",
                                `${j.title} approved`,
                              )
                            }
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Reject ${j.title}`}
                            onClick={() =>
                              setJobStatus(
                                j.id,
                                "Removed",
                                `${j.title} rejected`,
                              )
                            }
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          >
                            <X size={13} />
                          </button>
                        </>
                      )}
                      {j.status === "Flagged" && (
                        <button
                          type="button"
                          onClick={() =>
                            setJobStatus(j.id, "Removed", `${j.title} removed`)
                          }
                          className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                          Remove
                        </button>
                      )}
                      {j.status === "Active" && (
                        <button
                          type="button"
                          onClick={() =>
                            setJobStatus(
                              j.id,
                              "Flagged",
                              `${j.title} flagged for review`,
                            )
                          }
                          aria-label={`Flag ${j.title}`}
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6b8a]"
                        >
                          <Flag size={12} />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>

        <Panel
          title="Complaints"
          subtitle={`${openComplaints} unresolved across the platform`}
          icon={MessageSquareWarning}
          action={
            <Segmented
              label="Complaint status"
              value={complaintTab}
              onChange={setComplaintTab}
              options={[
                { value: "Open", label: "Active" },
                { value: "Resolved", label: "Resolved" },
              ]}
            />
          }
        >
          {visibleComplaints.length === 0 && (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-500">
              {complaintTab === "Open"
                ? "All caught up. No active complaints."
                : "Nothing resolved yet today."}
            </p>
          )}
          <ul className="space-y-1.5">
            {visibleComplaints.map((c) => (
              <li
                key={c.id}
                className="row-in rounded-xl bg-slate-50 px-2.5 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-[11px] font-semibold leading-snug text-slate-800">
                    {c.subject}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${PRI_STYLE[c.pri]}`}
                  >
                    {c.pri}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="truncate text-[10px] text-slate-400">
                    {c.id} · {c.from} · {c.cat} · {c.age}
                  </p>
                  {c.status !== "Resolved" ? (
                    <button
                      type="button"
                      onClick={() => advanceComplaint(c.id)}
                      className="shrink-0 rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-[#2f6b8a] ring-1 ring-slate-200 hover:bg-[#2f6b8a] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6b8a]"
                    >
                      {c.status === "Open" ? "Start review" : "Resolve"}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                      <Check size={11} /> Resolved
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="toast-in fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-slate-800 px-3.5 py-2 text-[12px] font-medium text-white shadow-xl"
        >
          <CircleAlert size={14} className="text-emerald-300" />
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
