import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  LoaderCircle,
  UserRound,
  Mail,
  Phone,
  FileText,
  CalendarDays,
  Tag,
  Building2,
  Download,
  MessageSquareText,
  ChevronsLeft,
} from "lucide-react";

import { getComplaintById } from "../../../api/complaintApi";

// Prominent status colors. Keys are normalized (uppercase, hyphenated).
const STATUS_STYLES = {
  NEW: "bg-blue-600 text-white",
  OPEN: "bg-emerald-600 text-white",
  "IN-PROGRESS": "bg-amber-500 text-white",
  HOLD: "bg-violet-600 text-white",
  CLOSED: "bg-slate-700 text-white",
};
const DEFAULT_STATUS_STYLE = "bg-gray-300 text-gray-800";

const normalizeStatus = (value = "") =>
  String(value).trim().toUpperCase().replace(/[\s_]+/g, "-");

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getFileUrl = (path) => {
  if (!path) return "";

  const baseUrl = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/api\/?$/, "");

  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
};

const DetailItem = ({ label, value, icon: Icon }) => (
  <div className="min-w-0">
    <p className="mb-1.5 flex items-center gap-2 text-sm text-[#60738a]">
      {Icon && <Icon size={15} className="text-[#2c6b8a]" />}
      {label}
    </p>
    <p className="break-words text-sm font-medium text-[#1e2b36]">{value || "-"}</p>
  </div>
);

const Section = ({ icon: Icon, title, children }) => (
  <section className="overflow-hidden rounded-lg border border-[#cbe1f4] bg-white">
    <div className="flex items-center gap-2 bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] px-4 py-3 text-white">
      <Icon size={17} />
      <h2 className="text-sm font-bold">{title}</h2>
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </section>
);

const ResponseSection = ({ existingResponse, respondedAt, disabled, onSubmit }) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const handleSend = async () => {
    const message = text.trim();
    if (!message) return;

    try {
      setSending(true);
      setSendError("");
      await onSubmit(message);
      setText("");
    } catch (err) {
      setSendError(
        err?.response?.data?.message || err?.message || "Failed to send response.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Section icon={MessageSquareText} title="Response">
      {existingResponse ? (
        <div className="mb-5 rounded-lg border border-[#e2e8ee] bg-[#f9fbfc] p-4">
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#1e2b36]">
            {existingResponse}
          </p>
          <p className="mt-3 text-xs text-[#60738a]">
            Responded on {formatDate(respondedAt)}
          </p>
        </div>
      ) : (
        <p className="mb-5 text-sm text-[#60738a]">No response yet.</p>
      )}

      {disabled ? (
        <p className="text-sm text-[#60738a]">
          Responses are closed for this complaint.
        </p>
      ) : (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            placeholder="Write a response to the complainant..."
            disabled={sending}
            className="w-full rounded-lg border border-[#c9d5dd] p-3 text-sm outline-none focus:border-[#2c6b8a] focus:ring-2 focus:ring-[#2c6b8a]/20 disabled:opacity-60"
          />

          {sendError && (
            <p role="alert" className="text-sm text-rose-600">
              {sendError}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2c6b8a] px-4 text-sm font-semibold text-white hover:bg-[#245a75] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending && <LoaderCircle size={15} className="animate-spin" />}
              Send Response
            </button>
          </div>
        </div>
      )}
    </Section>
  );
};

const ComplaintDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getComplaintById(id);

        if (response?.success === false) {
          throw new Error(response.message || "Failed to load complaint details.");
        }

        setComplaint(response?.data ?? response);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load complaint details.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchComplaint();
    } else {
      setError("Complaint ID is missing.");
      setLoading(false);
    }
  }, [id]);



  const pageShell = "min-h-full bg-[#f7f9fb] text-[#1e2b36]";
  const card = "mx-auto max-w-[1500px] rounded-xl border border-[#e2e8ee] bg-white p-4 shadow-sm sm:p-5";
  const backButton =
    "grid h-10 w-10 place-items-center rounded-lg border border-[#c9d5dd] bg-white text-[#2c6b8a] hover:bg-slate-50";

  if (loading) {
    return (
      <div className={pageShell}>
        <div className={`${card} flex min-h-64 items-center justify-center gap-3 text-[#60738a]`}>
          <LoaderCircle size={22} className="animate-spin text-[#2c6b8a]" />
          Loading complaint details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={pageShell}>
        <div className={`${card} flex flex-col gap-3 border-rose-200 bg-rose-50 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between`}>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-rose-200 bg-white px-4 py-2 font-semibold hover:bg-rose-100"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className={pageShell}>
        <div className={`${card} text-[#60738a]`}>Complaint not found.</div>
      </div>
    );
  }

  const statusKey = normalizeStatus(complaint.statusName);
  const statusLabel = statusKey || "UNKNOWN";
  const statusStyle = STATUS_STYLES[statusKey] ?? DEFAULT_STATUS_STYLE;
  const isClosed = statusKey === "CLOSED";
  const fileUrl = getFileUrl(complaint.cP_file_path);

  return (
    <div className={pageShell}>
      <div className={`${card} space-y-5`}>
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className={backButton}
            >
              <ChevronsLeft size={18} />
            </button>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#2c6b8a]">
                Complaint Details
              </h1>
              
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-sm ${statusStyle}`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["Complaint ID", `# ${complaint.cP_reference_no || "-"}`],
            ["Category", complaint.complaintCategoryName || "-"],
            ["Submitted On", formatDate(complaint.cP_created_at)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[#cbe1f4] bg-white p-4">
              <p className="text-sm text-[#60738a]">{label}</p>
              <p className="mt-1.5 font-semibold text-[#1e2b36]">{value}</p>
            </div>
          ))}
        </div>

        {/* Complainant */}
        <Section icon={UserRound} title="Complainant Information">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Full Name / Organization" value={complaint.cP_full_name} icon={Building2} />
            <DetailItem label="User Type" value={complaint.userTypeName} />
            <DetailItem label="Mobile Number" value={complaint.cP_mobile} icon={Phone} />
            <DetailItem label="Email Address" value={complaint.cP_email} icon={Mail} />
            <DetailItem label="Complaint Category" value={complaint.complaintCategoryName} icon={Tag} />
            <DetailItem label="Reference Number" value={complaint.cP_reference_no} icon={FileText} />
          </div>
        </Section>

        {/* Description */}
        <Section icon={FileText} title="Complaint Description">
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#1e2b36]">
            {complaint.cP_details || "No description provided."}
          </p>
        </Section>

        {/* Attachment */}
        <Section icon={Download} title="Supporting Document">
          {complaint.cP_file_path ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-3 rounded-lg border border-[#cbe1f4] bg-white px-4 py-3 text-sm font-medium text-[#2c6b8a] transition hover:bg-[#e8f1f6]"
            >
              <FileText size={20} />
              <span className="break-all">{complaint.cP_file_path.split("/").pop()}</span>
              <Download size={17} />
            </a>
          ) : (
            <p className="text-sm text-[#60738a]">No supporting document attached.</p>
          )}
        </Section>


        {/* Record info */}
        <Section icon={CalendarDays} title="Record Information">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Created At" value={formatDate(complaint.cP_created_at)} />
            <DetailItem label="Last Updated" value={formatDate(complaint.cP_updated_at)} />
          </div>
        </Section>
      </div>
    </div>
  );
};

export default ComplaintDetails;