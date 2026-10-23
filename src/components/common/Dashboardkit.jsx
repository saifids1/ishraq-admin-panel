import React, { useEffect, useId, useRef, useState } from "react";

export const fmt = (n) => n.toLocaleString("en-IN");

export function useCountUp(value, duration = 800) {
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
    const from = prev.current,
      start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      setV(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return Math.round(v);
}


/* item: { title, value,  icon, color, color2,  } */
export const GradientStatCard = ({ item, index, selected, onSelect }) => {
  const Icon = item.icon;
  const n = useCountUp(item.value);
  const clickable = !!item.metric && !!onSelect;
  const Tag = clickable ? "button" : "div";
  return (
    <Tag
      {...(clickable
        ? {
            type: "button",
            onClick: () => onSelect(item.metric),
            "aria-pressed": selected,
          }
        : {})}
      className={`stat-card relative w-full min-w-0 overflow-hidden rounded-2xl p-3.5 text-left text-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6b8a] focus-visible:ring-offset-2 ${
        selected ? "ring-2 ring-[#2f6b8a] ring-offset-2" : ""
      } ${clickable ? "cursor-pointer" : ""}`}
      style={{
        background: `linear-gradient(135deg, ${item.color}, ${item.color2})`,
        animationDelay: `${index * 70}ms`,
      }}
    >
      <span className="stat-orb stat-orb-a" />
      <span className="stat-orb stat-orb-b" />
      <div className="relative flex items-center justify-between gap-2">
        <p className="truncate text-[17px] font-semibold text-white">
          {item.title}
        </p>
        <span className="stat-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
          <Icon size={14} />
        </span>
      </div>
      <div className="relative mt-1.5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[26px] font-extrabold leading-none tabular-nums tracking-tight">
            {fmt(n)}
          </span>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
          </div>
        </div>
      </div>
    </Tag>
  );
};

export const StatCardGrid = ({ items, metric, onSelect, isSelected }) => (
  <div className="mb-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
    <KitStyles />
    {items.map((k, i) => (
      <GradientStatCard
        key={k.title}
        item={k}
        index={i}
        onSelect={onSelect}
        selected={
          isSelected ? isSelected(k) : !!k.metric && k.metric === metric
        }
      />
    ))}
  </div>
);

/* ---------------- Header with heartbeat ---------------- */
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
  for (let k = 0; k < 5; k++)
    BEAT.forEach(([dx, y]) => {
      d += ` L${(k * 192 + 36 + dx * 0.5).toFixed(1)},${(30 + (y - 138) * 0.3).toFixed(1)}`;
    });
  return `${d} L960,30`;
})();

export const HeartbeatStrip = () => (
  <svg
    viewBox="0 0 960 60"
    preserveAspectRatio="none"
    className="h-11 w-full"
    role="img"
    aria-label="Live activity pulse"
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

export const DashboardHeader = ({ title, subtitle, pills, control }) => (
  <header
    className="relative mb-3 overflow-hidden rounded-2xl text-white shadow-sm"
    style={{
      background: "linear-gradient(110deg,#17405a 0%,#2f6b8a 52%,#4a9bb3 100%)",
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
            {title}
          </h1>
        </div>
        <p className="mt-1 text-[11px] text-white/70">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden items-center gap-3 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] sm:flex">
          {pills.map((p, i) => (
            <React.Fragment key={p.label}>
              {i > 0 && <span className="h-4 w-px bg-white/20" />}
              <span>
                <b className="text-sm tabular-nums">{fmt(p.value)}</b>{" "}
                <span className="text-white/70">{p.label}</span>
              </span>
            </React.Fragment>
          ))}
        </div>
        {control}
      </div>
    </div>
    <div className="relative px-1 pb-1 pt-1">
      <HeartbeatStrip />
    </div>
  </header>
);

/* ---------------- Light-theme building blocks ---------------- */
export const Segmented = ({
  options,
  value,
  onChange,
  dark = false,
  label,
}) => (
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

export const Panel = ({
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

export const BarRow = ({
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

export const ChartTooltip = ({ active, payload, label }) => {
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

export const KitStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
    .isharq-dash { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; }
    @keyframes stat-in { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
    @keyframes stat-float { 50% { transform: translateY(10px) scale(1.12); } }
    @keyframes stat-bob { 50% { transform: translateY(-3px) rotate(-8deg); } }
    @keyframes ecg-sweep { from { stroke-dashoffset: 0.16; } to { stroke-dashoffset: -1; } }
    @keyframes ecg-beat { 0%,100% { opacity: 0; transform: scale(.6); } 8% { opacity: 1; transform: scale(1.5); } 30% { opacity: 0; transform: scale(2.4); } }
    @keyframes live-ping { 75%,100% { transform: scale(2.4); opacity: 0; } }
    @keyframes row-in { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
    @keyframes bar-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @keyframes toast-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    .stat-card { animation: stat-in .55s cubic-bezier(.2,.8,.2,1) both; }
    .stat-orb { position: absolute; border-radius: 9999px; pointer-events: none; background: rgba(255,255,255,.16); }
    .stat-orb-a { width: 92px; height: 92px; right: -26px; top: -30px; animation: stat-float 4s ease-in-out infinite; }
    .stat-orb-b { width: 60px; height: 60px; right: 36px; bottom: -34px; background: rgba(255,255,255,.10); animation: stat-float 5s ease-in-out infinite reverse; }
    .stat-icon { animation: stat-bob 2.6s ease-in-out infinite; }
    .ecg-trace { stroke-dasharray: 0.16 1; filter: drop-shadow(0 0 4px rgba(255,255,255,.9)); animation: ecg-sweep 3.6s linear infinite; }
    .ecg-dot { transform-box: fill-box; transform-origin: center; animation: ecg-beat 3.6s ease-out infinite; animation-delay: 1.6s; }
    .live-ping { animation: live-ping 1.6s cubic-bezier(0,0,.2,1) infinite; }
    .row-in { animation: row-in .25s ease both; }
    .bar-grow { transform-origin: left; animation: bar-grow .7s cubic-bezier(.2,.8,.2,1) both; }
    .toast-in { animation: toast-in .25s ease both; }
    @media (prefers-reduced-motion: reduce) {
      .stat-card,.stat-orb,.stat-icon,.ecg-trace,.ecg-dot,.live-ping,.row-in,.bar-grow,.toast-in { animation: none !important; }
      .ecg-trace { stroke-dasharray: none; filter: none; } .ecg-dot { opacity: 1; }
    }
  `}</style>
);
