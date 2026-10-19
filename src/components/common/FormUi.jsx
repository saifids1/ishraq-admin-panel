import { AlertCircle, ChevronsLeft, Check as CheckIcon } from "lucide-react";

export const ACCENT = "#2f6b8a";

export const Card = ({ title, icon: Icon, children, className = "" }) => (
  <section
    className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
  >
    <header className="mb-4 flex items-center gap-2.5">
      <span
        className="grid h-8 w-8 place-items-center rounded-lg bg-[#eaf3f7]"
        style={{ color: ACCENT }}
      >
        <Icon size={16} />
      </span>
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
    </header>
    {children}
  </section>
);

export const PageHeader = ({ title, onBack, right }) => (
  <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-white transition hover:opacity-90"
        style={{ backgroundColor: ACCENT }}
      >
        <ChevronsLeft size={18} />
      </button>
      <h1 className="truncate text-lg font-semibold text-slate-800">{title}</h1>
    </div>
    {right}
  </header>
);

export const Pill = ({ icon: Icon, children }) => (
  <span
    className="inline-flex items-center gap-2 rounded-lg bg-[#eaf3f7] px-3 py-1.5 text-xs font-medium"
    style={{ color: ACCENT }}
  >
    {Icon && <Icon size={13} />}
    {children}
  </span>
);

export const inputClass = (hasError, hasIcon = true) =>
  `w-full rounded-lg border bg-white py-2.5 ${hasIcon ? "pl-10" : "pl-3"} pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
    hasError ? "border-red-400" : "border-slate-200"
  }`;

export const Field = ({
  label,
  htmlFor,
  required = false,
  error,
  className = "",
  children,
}) => (
  <div className={`min-w-0 ${className}`}>
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-medium text-slate-500"
    >
      {label}
      {required && <span className="text-red-500"> *</span>}
    </label>

    {children}

    {error && (
      <p className="mt-1 text-xs text-red-600">
        {error}
      </p>
    )}
  </div>
);

export const IconField = ({ icon: Icon, children }) => (
  <div className="relative">
    <Icon
      size={15}
      className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2"
      style={{ color: ACCENT }}
    />
    {children}
  </div>
);

export const Toast = ({ toast }) => {
  if (!toast) return null;

  const ok = toast.tone === "ok";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-white shadow-xl"
    >
      <span
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
          ok ? "bg-emerald-500" : "bg-red-500"
        }`}
      >
        {ok ? (
          <CheckIcon size={12} strokeWidth={3.4} />
        ) : (
          <AlertCircle size={12} strokeWidth={3} />
        )}
      </span>
      {toast.msg}
    </div>
  );
};

// Add to components/common/FormUi.jsx (after IconField)
export const ReadOnlyValue = ({ icon, children, multiline = false }) => {
  const box = (
    <div
      className={`w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 ${
        icon ? "pl-10" : ""
      } ${
        multiline
          ? "min-h-[120px] whitespace-pre-line leading-relaxed"
          : "min-h-[42px] break-words"
      }`}
    >
      {children}
    </div>
  );

  return icon ? <IconField icon={icon}>{box}</IconField> : box;
};