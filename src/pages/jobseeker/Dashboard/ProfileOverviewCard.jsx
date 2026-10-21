import { useEffect, useMemo, useState } from "react";
import {
  UserRound,
  User,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Globe,
  Building2,
  Layers,
  Target,
  BookOpen,
  Award,
  BadgeCheck,
  Briefcase,
  Clock,
  Wallet,
  CalendarDays,
  GraduationCap,
  FileText,
  CheckCircle2,
  CircleAlert,
  ChevronRight,
} from "lucide-react";

/* ---------------- Groups (colour + icon per section) ---------------- */
export const GROUPS = {
  personal: { label: "Personal", icon: UserRound, color: "#0ea5e9" },
  contact: { label: "Contact", icon: Mail, color: "#6366f1" },
  location: { label: "Location", icon: MapPin, color: "#10b981" },
  professional: { label: "Professional", icon: Briefcase, color: "#f59e0b" },
  education: { label: "Education", icon: GraduationCap, color: "#ec4899" },
  documents: { label: "Documents", icon: FileText, color: "#14b8a6" },
};

/* ---------------- Checks (edit this list to change what counts) ---------------- */
const hasText = (v) => v !== null && v !== undefined && String(v).trim() !== "";
const hasNumber = (v) => hasText(v) && !Number.isNaN(Number(v));

export const PROFILE_CHECKS = [
  { label: "Full name", group: "personal", icon: User, done: (p) => hasText(p.fullName) },
  { label: "Email", group: "contact", icon: Mail, done: (p) => hasText(p.email) },
  { label: "Mobile number", group: "contact", icon: Phone, done: (p) => hasText(p.mobile) },
  { label: "WhatsApp number", group: "contact", icon: MessageCircle, done: (p) => hasText(p.jB_whatsapp) },
  { label: "Country", group: "location", icon: Globe, done: (p) => hasNumber(p.jB_country_id) },
  { label: "State", group: "location", icon: MapPin, done: (p) => hasNumber(p.jB_state_id) },
  { label: "City", group: "location", icon: MapPin, done: (p) => hasNumber(p.jB_city_id) },
  { label: "Preferred location", group: "location", icon: Target, done: (p) => hasNumber(p.jB_preferred_location) },
  { label: "Institute type", group: "professional", icon: Building2, done: (p) => hasNumber(p.jB_institute_type_id) },
  { label: "Job category", group: "professional", icon: Layers, done: (p) => hasNumber(p.jB_job_category_id) },
  { label: "Job role", group: "professional", icon: Target, done: (p) => hasNumber(p.jB_job_role_id) },
  { label: "Current designation", group: "professional", icon: Briefcase, done: (p) => hasText(p.jB_current_designation) },
  { label: "Current employer", group: "professional", icon: Building2, done: (p) => hasText(p.jB_current_employer) },
  { label: "Total experience", group: "professional", icon: Clock, done: (p) => hasNumber(p.jB_total_experience) },
  { label: "Expected salary", group: "professional", icon: Wallet, done: (p) => hasNumber(p.jB_expected_salary) },
  { label: "Availability to join", group: "professional", icon: CalendarDays, done: (p) => hasText(p.jB_availability_to_join) },
  { label: "Highest qualification", group: "education", icon: BookOpen, done: (p) => hasText(p.jB_highest_qualification) },
  { label: "Speciality", group: "education", icon: Award, done: (p) => hasText(p.jB_speciality) },
  { label: "Registration number", group: "education", icon: BadgeCheck, done: (p) => hasText(p.jB_registration_number) },
  { label: "Work experience", group: "education", icon: Briefcase, done: (p) => (p.experiences?.length ?? 0) > 0 },
  { label: "Education record", group: "education", icon: GraduationCap, done: (p) => (p.educations?.length ?? 0) > 0 },
  { label: "CV / resume", group: "documents", icon: FileText, done: (p) => hasText(p.jB_cv_file_path) },
];

/* ---------------- Completion calculation (import this in the dashboard) ---------------- */
export const getProfileCompletion = (profile) => {
  const items = profile
    ? PROFILE_CHECKS.map((check) => ({
        label: check.label,
        group: check.group,
        icon: check.icon,
        done: check.done(profile),
      }))
    : [];

  const total = items.length;
  const doneCount = items.filter((i) => i.done).length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;

  const groups = Object.entries(GROUPS).map(([key, meta]) => {
    const groupItems = items.filter((i) => i.group === key);
    const groupDone = groupItems.filter((i) => i.done).length;
    return {
      key,
      ...meta,
      total: groupItems.length,
      done: groupDone,
      percent: groupItems.length
        ? Math.round((groupDone / groupItems.length) * 100)
        : 0,
    };
  });

  return {
    items,
    groups,
    total,
    doneCount,
    percent,
    missing: items.filter((i) => !i.done),
  };
};

/* ---------------- Animation helpers ---------------- */
// Becomes true after the first frame so CSS transitions can run from their start value.
const useMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
};

// Counts from 0 to target with an ease-out curve.
const useCountUp = (target, duration = 1100) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
};

/* ---------------- Donut chart ---------------- */
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DonutChart = ({ percent, done, total }) => {
  const mounted = useMounted();
  const shown = useCountUp(percent);
  const offset = mounted ? CIRCUMFERENCE * (1 - percent / 100) : CIRCUMFERENCE;

  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="pc-donut-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2f6b8a" />
            <stop offset="100%" stopColor="#35b8c4" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#eef2f6" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="url(#pc-donut-gradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tabular-nums text-[#2c6b8a]">{shown}%</span>
        <span className="text-[10px] text-slate-400">
          {done} of {total}
        </span>
      </div>
    </div>
  );
};

/* ---------------- Card ---------------- */
const ProfileOverviewCard = ({ profile, loading, onOpenProfile }) => {
  const mounted = useMounted();
  const completion = useMemo(() => getProfileCompletion(profile), [profile]);

  if (loading) {
    return (
      <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-500">
        Loading your profile…
      </p>
    );
  }

  const { percent, doneCount, total, groups, missing } = completion;
  const complete = percent === 100;

  return (
    <>
      <style>{`
        @keyframes pcFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes pcPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.35); }
          50% { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
        }
        .pc-fade { animation: pcFadeUp .5s ease both; }
        .pc-pulse { animation: pcPulse 2s ease-in-out infinite; }
      `}</style>

      {/* Top: donut + legend */}
      <div className="pc-fade flex items-center gap-4">
        <DonutChart percent={percent} done={doneCount} total={total} />

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#2f6b8a] to-[#35b8c4]" />
            Completed
            <span className="ml-auto tabular-nums text-slate-800">{doneCount}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            Pending
            <span className="ml-auto tabular-nums text-slate-800">{total - doneCount}</span>
          </div>

          {complete ? (
            <p className="pc-pulse flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 size={13} /> Profile complete
            </p>
          ) : (
            <p className="text-[10px] text-slate-400">Complete it to get better matches.</p>
          )}
        </div>
      </div>

      {/* Group breakdown */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {groups.map((g, i) => {
          const Icon = g.icon;
          return (
            <div
              key={g.key}
              className="pc-fade rounded-xl border border-slate-100 p-2.5 transition hover:shadow-sm"
              style={{ animationDelay: `${120 + i * 80}ms` }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white shadow-sm"
                  style={{ background: g.color }}
                >
                  <Icon size={14} />
                </span>
                <span className="flex-1 truncate text-[11px] font-semibold text-slate-700">
                  {g.label}
                </span>
                <span className="text-[10px] tabular-nums text-slate-400">
                  {g.done}/{g.total}
                </span>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: mounted ? `${g.percent}%` : "0%",
                    background: g.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Missing items */}
      {missing.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <CircleAlert size={12} className="text-amber-500" />
            Still missing
          </p>
          <ul className="space-y-1.5">
            {missing.slice(0, 4).map((item, i) => {
              const Icon = item.icon;
              const color = GROUPS[item.group]?.color ?? "#94a3b8";
              return (
                <li
                  key={item.label}
                  className="pc-fade flex items-center gap-2 rounded-lg bg-amber-50/60 px-2.5 py-1.5 ring-1 ring-amber-100"
                  style={{ animationDelay: `${400 + i * 90}ms` }}
                >
                  <Icon size={13} style={{ color }} />
                  <span className="flex-1 truncate text-[11px] font-medium text-slate-700">
                    {item.label}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-600">
                    Add
                  </span>
                </li>
              );
            })}
            {missing.length > 4 && (
              <li className="px-2.5 text-[10px] font-semibold text-slate-400">
                +{missing.length - 4} more
              </li>
            )}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onOpenProfile}
        className="pc-fade mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2f6b8a] px-3 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#265976] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6b8a]"
        style={{ animationDelay: "550ms" }}
      >
        Profile overview
        <ChevronRight size={14} />
      </button>
    </>
  );
};

export default ProfileOverviewCard;