import { useEffect, useState } from "react";
import { X, ShieldCheck } from "lucide-react";

const OtpVerifyModal = ({
  isOpen,
  title,
  contact,
  sending = false,
  verifying = false,
  error = "",
  info = "",
  onClose,
  onVerify,
  onResend,
}) => {
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (isOpen) setOtp("");
  }, [isOpen]);

  if (!isOpen) return null;

  const busy = sending || verifying;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (otp.length === 6 && !busy) onVerify(otp);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#2f6b8a]" />
            <h3 className="font-semibold text-slate-800">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            aria-label="Close"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <p className="text-sm text-slate-600">
            Enter the 6-digit code sent to{" "}
            <span className="font-semibold text-slate-800">{contact}</span>.
          </p>

          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="______"
            className="h-11 w-full rounded-md border border-[#c9d5dd] text-center font-mono text-lg tracking-[0.5em] text-[#1a2b3c] outline-none focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/20"
          />

          {error && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {info && !error && <p className="text-sm text-emerald-700">{info}</p>}

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={onResend}
              disabled={busy}
              className="text-sm font-semibold text-[#1e5a7a] hover:underline disabled:opacity-50"
            >
              {sending ? "Sending..." : "Resend code"}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={verifying}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || otp.length !== 6}
                className="rounded-lg bg-[#2f6b8a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifying ? "Verifying..." : "Verify"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OtpVerifyModal;