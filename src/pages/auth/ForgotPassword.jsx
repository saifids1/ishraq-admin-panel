import { useState } from "react";
import {
  sendForgotPasswordOtpApi,
  verifyForgotPasswordOtpApi,
  updatePasswordApi,
} from "../../api/authApi";
import {
  sendOtp as sendSmsOtpApi,
  verifyOtp as verifySmsOtpApi,
} from "../../api/Services/smsOtpSerivce";

/* ---------- Helpers ---------- */

// Handles axios errors (err.response.data) and the plain { success, message }
// objects thrown by smsOtpApi's normalizeError.
const getErrorMessage = (err, fallback) =>
  err?.response?.data?.Message ||
  err?.response?.data?.message ||
  (err?.isAxiosError ? fallback : err?.message) ||
  fallback;

/* ---------- Icons ---------- */

const IconWrap = ({ children }) => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const MailIcon = () => (
  <IconWrap>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </IconWrap>
);

const PhoneIcon = () => (
  <IconWrap>
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <path d="M11 18h2" />
  </IconWrap>
);

const LockIcon = () => (
  <IconWrap>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </IconWrap>
);

const EyeIcon = () => (
  <IconWrap>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </IconWrap>
);

const EyeOffIcon = () => (
  <IconWrap>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2" />
    <path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
  </IconWrap>
);

const CheckIcon = () => (
  <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const PulseIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 12h4l2.5-6 4 12 2.5-6H22" />
  </svg>
);

/* ---------- Fields ---------- */

const inputBase =
  "h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-4 text-slate-800 placeholder-slate-400 focus:border-[#2f6b8a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2f6b8a]/20 disabled:opacity-60";

const IconField = ({ icon, ...props }) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
      {icon}
    </span>
    <input {...props} className={`${inputBase} pl-12`} />
  </div>
);

const PasswordField = ({ placeholder, value, onChange, disabled }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
        <LockIcon />
      </span>
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        disabled={disabled}
        className={`${inputBase} pl-12 pr-12`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#2f6b8a]"
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
};

/* ---------- Page ---------- */

const ForgotPassword = () => {
  // 1: choose method + identifier, 2: OTP, 3: new password, 4: done
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState("email"); // "email" | "phone"
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEmail = method === "email";
  const identifier = isEmail ? { email } : { phoneNumber: phone };
  const displayTarget = isEmail ? email : phone;

  // Both email and SMS APIs can return { success: false } without throwing,
  // so check that before moving on.
  const run = async (action, onSuccess, fallbackError) => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await action();
      if (res?.success === false) {
        setError(res.message || res.Message || fallbackError);
        return;
      }
      onSuccess(res);
    } catch (err) {
      setError(getErrorMessage(err, fallbackError));
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (next) => {
    if (loading) return;
    setMethod(next);
    setError("");
    setMessage("");
  };

  const handleSendOtp = (e) => {
    e?.preventDefault();
    run(
      () => (isEmail ? sendForgotPasswordOtpApi(email) : sendSmsOtpApi(phone)),
      (res) => {
        setMessage(res?.Message || res?.message || "OTP sent.");
        setStep(2);
      },
      "Failed to send OTP. Please try again."
    );
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    run(
      () =>
        isEmail
          ? verifyForgotPasswordOtpApi(email, otp)
          : verifySmsOtpApi(phone, otp),
      (res) => {
        setMessage(res?.Message || res?.message || "OTP verified.");
        setStep(3);
      },
      "Invalid or expired OTP."
    );
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    run(
      () => updatePasswordApi({ ...identifier, newPassword }),
      (res) => {
        setMessage(res?.Message || res?.message || "Password reset successfully.");
        setStep(4);
      },
      "Failed to reset password."
    );
  };

  const titles = {
    1: "Forgot password",
    2: "Verify OTP",
    3: "Set new password",
    4: "Password reset",
  };

  const descriptions = {
    1: `Choose how you'd like to receive your verification code.`,
    2: `Enter the 6-digit code sent to ${displayTarget}.`,
    3: "Choose a new password for your account.",
    4: "Your password has been updated. You can now sign in.",
  };

  const buttonClass =
    "w-full rounded-xl bg-gradient-to-r from-[#4a86a4] to-[#2f6b8a] py-3.5 font-semibold text-white shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";

  const tabClass = (active) =>
    `flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
      active
        ? "bg-white text-[#2f6b8a] shadow-sm"
        : "text-slate-500 hover:text-slate-700"
    } disabled:opacity-60`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef3f5] p-4">
      <div className="grid h-[90vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(47,107,138,0.18)] md:grid-cols-2">
        {/* Left brand panel */}
        <div className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-[#4a86a4] via-[#2f6b8a] to-[#25586f] p-10 text-white md:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/30 bg-white/15">
              <PulseIcon />
            </div>
            <span className="text-xl font-bold">Ishraq HR</span>
          </div>

          <div>
            <h2 className="mt-14 text-4xl font-bold leading-tight">
              Where hiring
              <br />
              finds its
              <br />
              rhythm.
            </h2>
            <p className="mt-5 max-w-xs text-base leading-relaxed text-white/80">
              Post openings, shortlist candidates and track every hire.
            </p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <p className="mb-2 text-sm font-medium text-[#2f6b8a]">
            Step {step} of 3
          </p>
          <h1 className="text-3xl font-bold text-slate-900">{titles[step]}</h1>
          <p className="mt-2 text-sm text-slate-500">{descriptions[step]}</p>

          <div className="mt-6 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            {message && step !== 4 && (
              <div className="rounded-xl border border-[#2f6b8a]/20 bg-[#2f6b8a]/10 px-4 py-3 text-sm text-[#2f6b8a]">
                {message}
              </div>
            )}

            {/* Step 1: choose method and enter identifier */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div
                  role="tablist"
                  className="flex gap-1 rounded-xl bg-slate-100 p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isEmail}
                    onClick={() => handleMethodChange("email")}
                    disabled={loading}
                    className={tabClass(isEmail)}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!isEmail}
                    onClick={() => handleMethodChange("phone")}
                    disabled={loading}
                    className={tabClass(!isEmail)}
                  >
                    Mobile number
                  </button>
                </div>

                {isEmail ? (
                  <IconField
                    key="email"
                    icon={<MailIcon />}
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                ) : (
                  <IconField
                    key="phone"
                    icon={<PhoneIcon />}
                    type="tel"
                    inputMode="numeric"
                    placeholder="Mobile number"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))
                    }
                    required
                    disabled={loading}
                  />
                )}

                <button type="submit" disabled={loading} className={buttonClass}>
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            )}

            {/* Step 2: verify OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                  disabled={loading}
                  className={`${inputBase} pl-4 text-center text-lg tracking-[0.5em]`}
                />
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className={buttonClass}
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
                <p className="text-center text-sm text-slate-500">
                  Didn't get the code?{" "}
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="font-semibold text-[#2f6b8a] hover:underline disabled:opacity-60"
                  >
                    Resend OTP
                  </button>
                </p>
                <p className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setOtp("");
                      setError("");
                      setMessage("");
                      setStep(1);
                    }}
                    disabled={loading}
                    className="text-slate-500 hover:text-slate-700 disabled:opacity-60"
                  >
                    Change {isEmail ? "email" : "mobile number"}
                  </button>
                </p>
              </form>
            )}

            {/* Step 3: new password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <PasswordField
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
                <PasswordField
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
                <button type="submit" disabled={loading} className={buttonClass}>
                  {loading ? "Resetting..." : "Reset password"}
                </button>
              </form>
            )}

            {/* Step 4: done */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2f6b8a]/10 text-[#2f6b8a]">
                  <CheckIcon />
                </div>
                <a href="/login" className={`${buttonClass} block text-center`}>
                  Sign in
                </a>
              </div>
            )}
          </div>

          {step !== 4 && (
            <p className="mt-8 text-center text-sm text-slate-500">
              Remember your password?{" "}
              <a href="/login" className="font-semibold text-[#2f6b8a] hover:underline">
                Sign in
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;