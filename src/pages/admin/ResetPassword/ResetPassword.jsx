import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  KeyRound,
  Lock,
  LockKeyhole,
  Eye,
  EyeOff,
  User,
  Building2,
  Mail,
  Phone,
  X,
  Check,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
} from "lucide-react";

import { updatePasswordByEmailApi } from "../../../api/authApi";
import jobseekerApi from "../../../api/Services/adjobseekerApi";
import { getAllEmployers } from "../../../api/employerApi";

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

const ROLE = {
  jobseeker: { label: "Job Seeker", icon: User, badge: "bg-sky-50 text-sky-700 ring-sky-200", avatar: "from-[#2c6b8a] to-[#5ba6bd]" },
  employer: { label: "Employer", icon: Building2, badge: "bg-violet-50 text-violet-700 ring-violet-200", avatar: "from-violet-500 to-indigo-400" },
};

const ROLE_FILTERS = [
  // { value: "all", label: "All", icon: Users },
  { value: "jobseeker", label: "Job Seekers", icon: User },
  { value: "employer", label: "Employers", icon: Building2 },
];

const RULES = [
  { id: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "num", label: "One number", test: (p) => /\d/.test(p) },
  { id: "sym", label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH = [
  { label: "Too weak", bar: "bg-rose-500", text: "text-rose-600" },
  { label: "Weak", bar: "bg-rose-500", text: "text-rose-600" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-600" },
  { label: "Good", bar: "bg-sky-500", text: "text-sky-600" },
  { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
  { label: "Very strong", bar: "bg-emerald-500", text: "text-emerald-600" },
];

const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const digits = (s = "") => s.replace(/\D/g, "");

const firstValue = (item, ...keys) =>
  keys
    .map((key) => item?.[key])
    .find((value) => value !== undefined && value !== null && value !== "") ?? "";

const extractList = (response) => {
  // Axios response: { data: { success, data: [...] } }
  // Also support an already-unwrapped response and paginated list wrappers.
  const body = response?.data ?? response;
  const payload = body?.data ?? body?.Data ?? body;
  const list = Array.isArray(payload)
    ? payload
    : payload?.items ?? payload?.Items ?? payload?.data ?? payload?.Data;

  return Array.isArray(list) ? list : [];
};

const normalizeJobSeeker = (user) => ({
  id: firstValue(user, "id", "jB_jobseeker_id", "jS_jobseeker_id", "jobseeker_id", "jS_id", "userId"),
  name: firstValue(user, "name", "fullName", "jS_full_name", "jS_name", "JB_full_name", "email", "jS_email"),
  email: String(firstValue(user, "email", "Email", "jS_email")),
  phone: String(firstValue(user, "phone", "phoneNumber", "mobile", "jS_mobile")),
  role: "jobseeker",
});

const normalizeEmployer = (user) => ({
  id: firstValue(user, "id", "employerId", "eM_employer_id", "userId"),
  name: firstValue(user, "name", "organizationName", "eM_organization_name", "companyName", "email"),
  email: String(firstValue(user, "email", "Email")),
  phone: String(firstValue(user, "phone", "phoneNumber", "mobile")),
  role: "employer",
});

const Avatar = ({ user, size = "h-9 w-9", text = "text-[12px]" }) => (
  <span
    className={`grid ${size} shrink-0 place-items-center rounded-full bg-gradient-to-br ${ROLE[user.role].avatar} ${text} font-bold text-white shadow-sm ring-2 ring-white`}
  >
    {initials(user.name)}
  </span>
);

const RoleBadge = ({ role }) => {
  const r = ROLE[role];
  const Icon = r.icon;
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-md px-2 text-[12px] font-semibold ring-1 ring-inset ${r.badge}`}>
      <Icon size={12} />
      {r.label}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  PASSWORD FIELD                                                     */
/* ------------------------------------------------------------------ */

const PasswordField = ({ id, label, value, onChange, icon: Icon, placeholder, disabled, error, autoComplete }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-[#34445a]">
        {label}
      </label>
      <div className="relative">
        <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa5b1]" />
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className={`h-11 w-full rounded-[10px] border bg-white pl-10 pr-11 text-sm text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] disabled:cursor-not-allowed disabled:bg-[#f3f6f8] disabled:text-[#9aa5b1] focus:ring-2 ${
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
              : "border-[#c9d5dd] hover:border-[#2c6b8a] focus:border-[#2c6b8a] focus:ring-[#2c6b8a]/30"
          }`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          disabled={disabled}
          aria-label={show ? "Hide password" : "Show password"}
          title={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-[#6b7a88] transition hover:bg-[#e8f1f6] hover:text-[#2c6b8a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

const ResetPassword = () => {
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [selected, setSelected] = useState(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  /* LOAD USERS FROM API */

  useEffect(() => {
    let cancelled = false;
    const loadUsers = async () => {
      setLoading(true);
      setApiError("");
      try {
        const jobseekerPromises = roleFilter === "all" || roleFilter === "jobseeker"
          ? jobseekerApi.getList().then(extractList)
          : Promise.resolve([]);

        const employerPromises = roleFilter === "all" || roleFilter === "employer"
          ? getAllEmployers().then(extractList)
          : Promise.resolve([]);

        const [jobSeekersResult, employersResult] = await Promise.allSettled([
          jobseekerPromises,
          employerPromises,
        ]);
        const jobSeekers = jobSeekersResult.status === "fulfilled" ? jobSeekersResult.value : [];
        const employers = employersResult.status === "fulfilled" ? employersResult.value : [];

        if (jobSeekersResult.status === "rejected" && employersResult.status === "rejected") {
          throw jobSeekersResult.reason;
        }

        const combined = [
          ...jobSeekers.map(normalizeJobSeeker),
          ...employers.map(normalizeEmployer),
        ];

        if (!cancelled) setUsers(combined);
      } catch (err) {
        if (!cancelled) {
          setApiError("Failed to load users. Please try again.");
          setUsers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadUsers();
    return () => { cancelled = true; };
  }, [roleFilter]);

  const boxRef = useRef(null);
  const inputRef = useRef(null);

  /* SEARCH */

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = digits(q);
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        (qDigits.length >= 3 && digits(u.phone).includes(qDigits))
      );
    }).slice(0, 8);
  }, [query, roleFilter]);

  useEffect(() => setHighlight(0), [query, roleFilter]);

  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const t = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(t);
  }, [success]);

  const pick = (user) => {
    setSelected(user);
    setOpen(false);
    setQuery("");
    setError("");
    setSuccess(null);
  };

  const clearSelected = () => {
    setSelected(null);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const onSearchKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && open && results[highlight]) {
      e.preventDefault();
      pick(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  /* PASSWORD VALIDATION */

  const passed = RULES.filter((r) => r.test(newPassword)).length;
  const allRules = passed === RULES.length;
  const strength = STRENGTH[newPassword ? passed : 0];
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const matches = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = !!selected && allRules && matches && !submitting;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await updatePasswordByEmailApi(selected.email, newPassword);
      setSuccess(selected);
      setSelected(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("We couldn't change the password. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const listId = "reset-user-listbox";

  return (
    <div className="rp-page  bg-[#f7f9fb] text-[#1e2b36]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        .rp-page { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; }
        @keyframes rp-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes rp-halo { 0%, 100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.18); opacity: .35; } }
        .rp-pop { animation: rp-pop .25s cubic-bezier(.2,.9,.3,1.1) both; }
        .rp-halo { animation: rp-halo 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .rp-pop, .rp-halo { animation: none !important; } }
      `}</style>

      <div className="mx-auto  rounded-[12px] border border-[#e2e8ee] bg-white shadow-sm">
        {/* HEADER */}
        <div className="flex items-center gap-3.5 border-b border-[#e2e8ee] px-2 py-2 sm:px-4 sm:py-4">
          <div className="relative grid h-12 w-12 shrink-0 place-items-center">
            <span className="rp-halo absolute inset-0 rounded-2xl bg-[#e8f1f6]" />
            <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#2c6b8a] to-[#5ba6bd] text-white shadow-md">
              <KeyRound size={19} />
            </span>
          </div>
          <div>
            <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[24px]">Reset Password</h1>
            <p className="mt-0.5 text-[13px] text-[#6b7a88]">Find a job seeker or employer and set a new password for their account.</p>
          </div>
        </div>

        {/* SUCCESS BANNER */}
        {success && (
          <div role="status" aria-live="polite" className="rp-pop mx-5 mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 sm:mx-6">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1f9d63] to-[#3ccf8e] text-white">
              <CheckCircle2 size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-emerald-800">Password changed</p>
              <p className="text-[13px] text-emerald-700">
                The password for <strong>{success.name}</strong> has been updated. Share the new password with them securely.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              aria-label="Dismiss"
              className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6 px-5 py-4 sm:px-4 sm:py-4">
          {/* STEP 1 */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#2c6b8a] text-[12px] font-bold text-white">1</span>
              <h2 className="text-[15px] font-bold text-[#1e2b36]">Find the user</h2>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 py-4 text-[13px] text-[#6b7a88]">
                <Loader2 size={16} className="animate-spin" /> Loading users…
              </div>
            ) : apiError ? (
              <div className="flex items-start gap-2 py-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {apiError}
              </div>
            ) : selected ? (
              <div className="rp-pop flex flex-wrap items-center gap-3 rounded-xl border border-[#2c6b8a]/30 bg-[#e8f1f6]/60 p-3">
                <Avatar user={selected} size="h-11 w-11" text="text-[14px]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14px] font-semibold text-[#1e2b36]">{selected.name}</p>
                    <RoleBadge role={selected.role} />
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-[#6b7a88]">
                    <span className="inline-flex items-center gap-1 break-all"><Mail size={12} />{selected.email}</span>
                    <span className="inline-flex items-center gap-1"><Phone size={12} />{selected.phone}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearSelected}
                  disabled={submitting}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#c9d5dd] bg-white px-3 text-[13px] font-medium text-[#34445a] transition hover:border-[#d64545] hover:text-[#d64545] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={14} />
                  Change
                </button>
              </div>
            ) : (
              <>
                {/* Role filter */}
                <div className="mb-3 inline-flex rounded-lg bg-[#f1f5f8] p-1" role="group" aria-label="Filter by account type">
                  {ROLE_FILTERS.map((f) => {
                    const Icon = f.icon;
                    const on = roleFilter === f.value;
                    return (
                      <button
                        key={f.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => { setRoleFilter(f.value); inputRef.current?.focus(); }}
                        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] ${
                          on ? "bg-white text-[#2c6b8a] shadow-sm" : "text-[#6b7a88] hover:text-[#34445a]"
                        }`}
                      >
                        <Icon size={14} />
                        {f.label}
                      </button>
                    );
                  })}
                </div>

                {/* Combobox */}
                <div ref={boxRef} className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa5b1]" />
                  <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-label="Search user by name, email or phone"
                    aria-activedescendant={open && results[highlight] ? `ru-${results[highlight].id}` : undefined}
                    placeholder="Search by name, email or phone number"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onSearchKey}
                    className="h-11 w-full rounded-[10px] border border-[#c9d5dd] bg-white pl-10 pr-10 text-sm text-[#1e2b36] outline-none transition placeholder:text-[#9aa5b1] hover:border-[#2c6b8a] focus:border-[#2c6b8a] focus:ring-2 focus:ring-[#2c6b8a]/30"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-[#9aa5b1] transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a]"
                    >
                      <X size={14} />
                    </button>
                  )}

                  {open && (
                    <ul
                      id={listId}
                      role="listbox"
                      className="rp-pop absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-[320px] overflow-y-auto rounded-xl border border-[#e2e8ee] bg-white p-1.5 shadow-xl"
                    >
                      {results.length === 0 ? (
                        <li className="px-3 py-8 text-center">
                          <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a]">
                            <Search size={18} />
                          </span>
                          <p className="mt-2 text-[13.5px] font-semibold text-[#1e2b36]">No users found</p>
                          <p className="text-[12.5px] text-[#6b7a88]">Check the spelling or try an email or phone number.</p>
                        </li>
                      ) : (
                        results.map((u, i) => (
                          <li
                            key={u.id}
                            id={`ru-${u.id}`}
                            role="option"
                            aria-selected={i === highlight}
                            onMouseEnter={() => setHighlight(i)}
                            onMouseDown={(e) => { e.preventDefault(); pick(u); }}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ${
                              i === highlight ? "bg-[#e8f1f6]" : ""
                            }`}
                          >
                            <Avatar user={u} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13.5px] font-semibold text-[#1e2b36]">{u.name}</p>
                              <p className="flex flex-wrap items-center gap-x-3 text-[12px] text-[#6b7a88]">
                                <span className="inline-flex items-center gap-1 truncate"><Mail size={11} />{u.email}</span>
                                <span className="inline-flex items-center gap-1"><Phone size={11} />{u.phone}</span>
                              </p>
                            </div>
                            <RoleBadge role={u.role} />
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </>
            )}
          </section>

          {/* STEP 2 */}
          <section className={`transition-opacity duration-300 ${selected ? "opacity-100" : "opacity-60"}`}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold text-white ${selected ? "bg-[#2c6b8a]" : "bg-[#9aa5b1]"}`}>2</span>
              <h2 className="text-[15px] font-bold text-[#1e2b36]">Set a new password</h2>
            </div>
            {!selected && (
              <p className="mb-3 flex items-center gap-1.5 text-[12.5px] text-[#6b7a88]">
                <Lock size={13} /> Select a user above to unlock these fields.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField
                id="new-password"
                label="New password"
                icon={Lock}
                placeholder="Enter new password"
                value={newPassword}
                onChange={setNewPassword}
                disabled={!selected || submitting}
                autoComplete="new-password"
              />
              <div>
                <PasswordField
                  id="confirm-password"
                  label="Confirm password"
                  icon={LockKeyhole}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  disabled={!selected || submitting}
                  error={mismatch}
                  autoComplete="new-password"
                />
                <p className="mt-1.5 min-h-[18px] text-[12.5px]" aria-live="polite">
                  {mismatch && (
                    <span className="inline-flex items-center gap-1 font-medium text-rose-600">
                      <AlertCircle size={13} /> Passwords don't match
                    </span>
                  )}
                  {matches && (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                      <Check size={13} strokeWidth={3} /> Passwords match
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Strength + rules */}
            {selected && newPassword && (
              <div className="rp-pop mt-1 rounded-xl border border-[#e2e8ee] bg-[#f9fbfc] p-3.5">
                <div className="mb-2.5 flex items-center justify-between text-[12.5px]">
                  <span className="font-medium text-[#6b7a88]">Password strength</span>
                  <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                </div>
                <div className="mb-3 flex gap-1" aria-hidden="true">
                  {RULES.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < passed ? strength.bar : "bg-[#e2e8ee]"}`}
                    />
                  ))}
                </div>
                <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {RULES.map((r) => {
                    const ok = r.test(newPassword);
                    return (
                      <li key={r.id} className={`flex items-center gap-1.5 text-[12.5px] transition-colors ${ok ? "text-emerald-700" : "text-[#6b7a88]"}`}>
                        <span className={`grid h-4 w-4 place-items-center rounded-full ${ok ? "bg-emerald-500 text-white" : "bg-[#e2e8ee] text-transparent"}`}>
                          <Check size={10} strokeWidth={3.5} />
                        </span>
                        {r.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex flex-col-reverse gap-2.5 border-t border-[#e2e8ee] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-[12.5px] text-[#6b7a88]">
              <ShieldCheck size={14} className="text-[#2c6b8a]" />
              The user's current password stops working immediately.
            </p>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-5 text-[13.5px] font-semibold text-white shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Changing password
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  Change password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
