import { useId, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loginApi } from "../../api/authApi";
import "./Login.css";
import toast from "react-hot-toast";
import StatusModal from "../../components/common/StatusModal";

/* ------------------------------------------------------------------ */
/* Role configuration                                                  */
/* ------------------------------------------------------------------ */

const ROLES = [
  {
    key: "admin",
    label: "Admin",
    title: "Admin sign in",
    blurb: "Review listings, approve employers and keep the portal healthy.",
    placeholder: "admin@ishraqhr.com",
    redirect: "/admin/dashboard",
    registerUrl: null,
  },
  {
    key: "employer",
    label: "Employer",
    title: "Employer sign in",
    blurb: "Post openings, shortlist candidates and track every hire.",
    placeholder: "employer@ishraqhr.com",
    redirect: "/employer/dashboard",
    registerUrl: "https://ishraqhr.com/employers/",
  },
  {
    key: "jobseeker",
    label: "Job seeker",
    title: "Job seeker sign in",
    blurb:
      "Find roles that fit, apply in one click and follow your applications.",
    placeholder: "jobseeker@ishraqhr.com",
    redirect: "/jobseeker/dashboard",
    registerUrl: "https://ishraqhr.com/jobseekers/",
  },
];

/* ------------------------------------------------------------------ */
/* Dashboard routes                                                    */
/* ------------------------------------------------------------------ */

const DASHBOARD_ROUTES = {
  admin: "/admin/dashboard",
  employer: "/employer/dashboard",
  jobseeker: "/jobseeker/dashboard",
};

/* ------------------------------------------------------------------ */
/* Normalize API role names                                            */
/* ------------------------------------------------------------------ */

const normalizeRole = (role) => {
  const normalized = String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  if (normalized === "admin") {
    return "admin";
  }

  // The API uses Recruiter for employer accounts.
  if (normalized === "recruiter" || normalized === "employer") {
    return "employer";
  }

  if (normalized === "jobseeker") {
    return "jobseeker";
  }

  return null;
};

/* ------------------------------------------------------------------ */
/* Heartbeat line                                                      */
/* ------------------------------------------------------------------ */

const PERIOD = 380;

const buildPulsePath = (beats) => {
  let d = "M0 60";

  for (let i = 0; i < beats; i++) {
    const x = i * PERIOD + 40;

    d += ` H${x} l22 -4 l30 7 l16 -53 l16 76 l15 -26 l23 -6 l15 8 l15 -8 l16 6`;
  }

  return d + ` H${beats * PERIOD}`;
};

const Pulse = ({ beats = 3, className = "" }) => {
  const id = useId().replace(/:/g, "");
  const d = buildPulsePath(beats);
  const width = beats * PERIOD;

  return (
    <svg
      className={`pulse ${className}`}
      viewBox={`0 0 ${width} 120`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <path className="pulse-ghost" d={d} />

      <path id={id} className="pulse-line" d={d} pathLength="1" />

      <g className="pulse-dot">
        <circle r="11" className="pulse-halo" />
        <circle r="5" className="pulse-core" />

        <animateMotion
          dur="6s"
          repeatCount="indefinite"
          keyPoints="0;1;1"
          keyTimes="0;0.7;1"
          calcMode="linear"
        >
          <mpath href={`#${id}`} />
        </animateMotion>

        <animate
          attributeName="opacity"
          dur="6s"
          repeatCount="indefinite"
          values="1;1;0;0"
          keyTimes="0;0.7;0.76;1"
        />
      </g>
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Inline icons                                                        */
/* ------------------------------------------------------------------ */

const IconUser = () => (
  <svg viewBox="0 0 24 24" className="ico" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
  </svg>
);

const IconLock = () => (
  <svg viewBox="0 0 24 24" className="ico" aria-hidden="true">
    <rect x="4" y="10" width="16" height="10" rx="3" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

const IconEye = ({ off }) => (
  <svg viewBox="0 0 24 24" className="ico" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" className="ico ico-check" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Login component                                                     */
/* ------------------------------------------------------------------ */

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Admin login must remain separate.
  const isAdminLogin = location.pathname === "/admin/login";

  // Only Admin appears on /admin/login.
  // Employer and Job Seeker appear on /login.
  const visibleRoles = isAdminLogin
    ? ROLES.filter((r) => r.key === "admin")
    : ROLES.filter((r) => r.key === "employer" || r.key === "jobseeker");

  const defaultRole = isAdminLogin ? "admin" : "employer";

  const [roleKey, setRoleKey] = useState(defaultRole);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [capsOn, setCapsOn] = useState(false);

  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [status, setStatus] = useState("idle");
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: "error",
    title: "Account Inactive",
    message: "",
  });

  const roleIndex = visibleRoles.findIndex((r) => r.key === roleKey);

  const role = visibleRoles[roleIndex] ?? visibleRoles[0];

  const fail = (message) => {
    setError("");
    setStatus("idle");
    setShake(true);
    toast.error(message);
  };

  const handleRoleChange = (key) => {
    setRoleKey(key);
    setError("");
    setShake(false);
  };

  /* ---------------------------------------------------------------- */
  /* API login                                                         */
  /* ---------------------------------------------------------------- */

  const handleLogin = async (e) => {
    e.preventDefault();

    if (status !== "idle") return;

    setError("");
    setStatus("loading");

    try {
      const data = await loginApi({
        email: username.trim(),
        password,
      });

      if (!data?.token) {
        throw new Error("The server did not return an authentication token.");
      }

      if (!Array.isArray(data.roles) || data.roles.length === 0) {
        throw new Error(
          "No role is assigned to this account. Please contact the administrator.",
        );
      }

      const normalizedRoles = data.roles.map(normalizeRole).filter(Boolean);

      const actualRole = normalizedRoles.find((item) => DASHBOARD_ROUTES[item]);

      if (!actualRole) {
        throw new Error(
          "Your account role is not recognized. Please contact the administrator.",
        );
      }

      // Extra protection: only Admin can sign in on /admin/login.
      if (isAdminLogin && actualRole !== "admin") {
        fail(
          "Access denied. Please use the appropriate login page for your account.",
        );
        return;
      }

      // On the public login page, enforce the selected tab.
      if (!isAdminLogin && actualRole !== roleKey) {
        const actualLabel =
          ROLES.find((r) => r.key === actualRole)?.label ?? actualRole;

        fail(
          `This is a ${actualLabel} account. Select "${actualLabel}" above to sign in.`,
        );
        return;
      }

      // Pass actual backend user information to AuthContext.
      const userData = {
        id: data.userId,
        name: data.fullName,
        username: data.email,
        email: data.email,
        role: actualRole,
        roles: data.roles,
        token: data.token,
        profileId: data.profileId,
      };

      // Keep this signature consistent with your AuthContext.
      login(userData, { remember });

      setStatus("success");

      // Redirect using the normalized backend role.
      navigate(DASHBOARD_ROUTES[actualRole], {
        replace: true,
      });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.Message ||
        err.message ||
        "Login failed. Please try again.";

      setStatus("idle");
      setShake(true);

      if (message.trim().toLowerCase() === "user account is inactive.") {
        setStatusModal({
          isOpen: true,
          type: "warning",
          title: "Account Inactive",
          message:
            "Your account is currently inactive.\n\nPlease contact the administrator to activate your account before signing in.",
        });

        return;
      }

      toast.error(message);
    }
  };

  /* ---------------------------------------------------------------- */
  /* UI                                                                */
  /* ---------------------------------------------------------------- */

  return (
    <div className="ish-page">
      <Pulse beats={6} className="pulse-page" />

      <main className="ish-card" data-status={status}>
        {/* Brand panel */}
        <aside className="ish-panel">
          <span className="blob blob-a" />
          <span className="blob blob-b" />

          <div className="ish-brand">
            <span className="ish-logo" aria-hidden="true">
              <svg viewBox="0 0 32 32">
                <path d="M2 17h7l3-9 5 17 3-8h10" />
              </svg>
            </span>

            <span className="ish-brand-name">Ishraq HR</span>
          </div>

          <div className="ish-panel-copy">
            <h2>Where hiring finds its rhythm.</h2>

            <p key={role.key} className="ish-blurb">
              {role.blurb}
            </p>
          </div>

          <Pulse beats={3} className="pulse-panel" />
        </aside>

        {/* Form panel */}
        <section className="ish-form-side">
          {visibleRoles.length > 1 && (
            <div className="ish-tabs" role="tablist" aria-label="Account type">
              <span
                className="ish-tab-thumb"
                style={{
                  transform: `translateX(${roleIndex * 100}%)`,
                }}
              />

              {visibleRoles.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  role="tab"
                  aria-selected={r.key === roleKey}
                  className={`ish-tab ${r.key === roleKey ? "is-active" : ""}`}
                  onClick={() => handleRoleChange(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          <form
            className={`ish-form ${error ? "has-error" : ""} ${
              shake ? "shake" : ""
            }`}
            onSubmit={handleLogin}
            onAnimationEnd={(e) => {
              if (e.animationName === "ish-shake") {
                setShake(false);
              }
            }}
          >
            <header key={role.key} className="ish-form-head">
              <h1>{role.title}</h1>
              <p>Enter your details to continue.</p>
            </header>

            {/* Email */}
            <label className="ish-field">
              <span className="ish-field-icon">
                <IconUser />
              </span>

              <input
                type="text"
                value={username}
                placeholder=" "
                autoComplete="username"
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
              />

              <span className="ish-field-label">Email</span>
            </label>

            {/* Password */}
            <label className="ish-field">
              <span className="ish-field-icon">
                <IconLock />
              </span>

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder=" "
                autoComplete="current-password"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                onBlur={() => setCapsOn(false)}
                required
              />

              <span className="ish-field-label">Password</span>

              <button
                type="button"
                className="ish-eye"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <IconEye off={showPassword} />
              </button>
            </label>

            {capsOn && <p className="ish-hint">Caps Lock is on.</p>}

            <div className="ish-row">
              <label className="ish-check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className="ish-box">
                  <IconCheck />
                </span>
                Keep me signed in
              </label>

              <Link to="/forgot-password" className="ish-link">
                Forgot password?
              </Link>
            </div>

            {error && (
              <p className="ish-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className={`ish-submit ${status}`}
              disabled={status !== "idle"}
            >
              <span className="ish-submit-text">
                {status === "loading"
                  ? "Signing in..."
                  : `Sign in as ${role.label.toLowerCase()}`}
              </span>

              <span className="ish-submit-spinner" aria-hidden="true" />

              <span className="ish-submit-done" aria-hidden="true">
                <IconCheck />
              </span>
            </button>

            {role.registerUrl && (
              <p className="ish-register">
                New to Ishraq HR?{" "}
                <a href={role.registerUrl} target="_blank" rel="noreferrer">
                  Create a {role.label.toLowerCase()} account
                </a>
              </p>
            )}
          </form>
        </section>
      </main>
      <StatusModal
        isOpen={statusModal.isOpen}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        confirmText="OK"
        onConfirm={() =>
          setStatusModal((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
        onCancel={() =>
          setStatusModal((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
      />
      <footer className="ish-login-footer">
  Designed & Developed by{" "}
  <a
    href="https://i-diligence.com/"
    target="_blank"
    rel="noopener noreferrer"
  >
    I-Diligence Solutions Pvt. Ltd.
  </a>
</footer>
    </div>
  );
};

export default Login;
