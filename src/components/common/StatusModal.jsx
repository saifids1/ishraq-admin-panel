import React, { useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  Info,
  RefreshCw,
  X,
} from "lucide-react";

const STATUS_STYLES = {
  success: {
    title: "Success",
    background: "#F0FDF4",
    text: "#166534",
    accent: "#16A34A",
    Icon: CheckCircle2,
  },
  error: {
    title: "Error",
    background: "#FEF2F2",
    text: "#991B1B",
    accent: "#DC2626",
    Icon: CircleX,
  },
  warning: {
    title: "Warning",
    background: "#FFFBEB",
    text: "#92400E",
    accent: "#D97706",
    Icon: AlertTriangle,
  },
  info: {
    title: "Information",
    background: "#EFF6FF",
    text: "#1E40AF",
    accent: "#2563EB",
    Icon: Info,
  },
  update: {
    title: "Updated",
    background: "#F5F3FF",
    text: "#5B21B6",
    accent: "#7C3AED",
    Icon: RefreshCw,
  },
  confirm: {
    title: "Please confirm",
    background: "#EFF6FF",
    text: "#1E40AF",
    accent: "#2563EB",
    Icon: Info,
  },
};

const StatusModal = ({
  isOpen,
  type = "info",
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  showCancel = false,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const config = STATUS_STYLES[type] ?? STATUS_STYLES.info;

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onCancel?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, busy, onCancel]);

  if (!isOpen) return null;

  const Icon = config.Icon;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel?.();
      }}
    >
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" />
      <section
        role={showCancel ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="status-modal-title"
        aria-describedby="status-modal-message"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header bar: icon + heading on left, X button on right */}
        <div
          className="flex items-center justify-between gap-3 px-5 h-14"
          style={{ backgroundColor: config.accent }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "#ffffff",
              }}
            >
              <Icon size={18} strokeWidth={2.4} />
            </span>
            <h2
              id="status-modal-title"
              className="text-lg font-bold text-white truncate"
            >
              {title || config.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            disabled={busy}
            onClick={onCancel ?? onConfirm}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-4 p-6">
         
          <div className="pt-1">
            <p
              id="status-modal-message"
              className="mt-1.5 whitespace-pre-line text-[15px] leading-6 text-slate-600"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
          {showCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onConfirm}
            className="h-10 rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
            style={{ backgroundColor: config.accent }}
          >
            {busy ? "Please wait…" : confirmText}
          </button>
        </div>
      </section>
    </div>
  );
};

export default StatusModal;