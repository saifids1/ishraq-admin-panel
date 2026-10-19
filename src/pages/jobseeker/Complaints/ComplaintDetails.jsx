import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  FileText,
  LoaderCircle,
  Mail,
  Paperclip,
  Phone,
  Tag,
  UserRound,
  Download,
} from "lucide-react";

import { getComplaintById } from "../../../api/complaintApi";
import {
  ACCENT,
  Card,
  Field,
  IconField,
  PageHeader,
  ReadOnlyValue,
} from "../../../components/common/FormUi";

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

const or = (value) => (value ? value : "-");

export default function ComplaintDetails() {
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white p-6">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <LoaderCircle className="animate-spin" style={{ color: ACCENT }} size={20} />
          Loading complaint details...
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="min-h-full bg-white p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Go Back
        </button>
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-5 text-red-700 shadow-sm">
          <h1 className="font-semibold">Could not load complaint</h1>
          <p className="mt-1 text-sm">{error || "Complaint not found."}</p>
        </div>
      </div>
    );
  }

  const statusKey = normalizeStatus(complaint.statusName);
  const statusLabel = statusKey || "UNKNOWN";
  const statusStyle = STATUS_STYLES[statusKey] ?? DEFAULT_STATUS_STYLE;
  const fileUrl = getFileUrl(complaint.cP_file_path);
  const fileName = complaint.cP_file_path ? complaint.cP_file_path.split("/").pop() : "";

  return (
    <div className="min-h-full bg-white text-slate-800">
      <PageHeader
        title="Complaint Details"
        onBack={() => navigate(-1)}
        right={
          <span
            className={`inline-flex w-fit items-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-sm ${statusStyle}`}
          >
            {statusLabel}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4">
        <Card title="Summary" icon={FileText}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Complaint ID">
              <ReadOnlyValue icon={FileText}>
                {`# ${complaint.cP_reference_no || "-"}`}
              </ReadOnlyValue>
            </Field>
            <Field label="Category">
              <ReadOnlyValue icon={Tag}>{or(complaint.complaintCategoryName)}</ReadOnlyValue>
            </Field>
            <Field label="Submitted On">
              <ReadOnlyValue icon={CalendarDays}>
                {formatDate(complaint.cP_created_at)}
              </ReadOnlyValue>
            </Field>
          </div>
        </Card>

        <Card title="Complainant Information" icon={UserRound}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Full Name / Organization">
              <ReadOnlyValue icon={Building2}>{or(complaint.cP_full_name)}</ReadOnlyValue>
            </Field>
            <Field label="User Type">
              <ReadOnlyValue icon={UserRound}>{or(complaint.userTypeName)}</ReadOnlyValue>
            </Field>
            <Field label="Mobile Number">
              <ReadOnlyValue icon={Phone}>{or(complaint.cP_mobile)}</ReadOnlyValue>
            </Field>
            <Field label="Email Address">
              <ReadOnlyValue icon={Mail}>{or(complaint.cP_email)}</ReadOnlyValue>
            </Field>
            <Field label="Complaint Category">
              <ReadOnlyValue icon={Tag}>{or(complaint.complaintCategoryName)}</ReadOnlyValue>
            </Field>
            <Field label="Reference Number">
              <ReadOnlyValue icon={FileText}>{or(complaint.cP_reference_no)}</ReadOnlyValue>
            </Field>
          </div>
        </Card>

        <Card title="Complaint Description" icon={FileText}>
          <Field label="Details">
            <ReadOnlyValue multiline>
              {complaint.cP_details || "No description provided."}
            </ReadOnlyValue>
          </Field>
        </Card>

        <Card title="Supporting Document" icon={Paperclip}>
          <Field label="Attachment">
            <IconField icon={Paperclip}>
              {complaint.cP_file_path ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open document in a new tab"
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-medium transition hover:bg-[#eaf3f7]"
                  style={{ color: ACCENT }}
                >
                  <span className="min-w-0 break-all">{fileName}</span>
                  <Download size={14} className="shrink-0" />
                </a>
              ) : (
                <div className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-500">
                  No supporting document attached.
                </div>
              )}
            </IconField>
          </Field>
        </Card>

        <Card title="Record Information" icon={CalendarDays}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Created At">
              <ReadOnlyValue icon={CalendarDays}>
                {formatDate(complaint.cP_created_at)}
              </ReadOnlyValue>
            </Field>
            <Field label="Last Updated">
              <ReadOnlyValue icon={CalendarDays}>
                {formatDate(complaint.cP_updated_at)}
              </ReadOnlyValue>
            </Field>
          </div>
        </Card>
      </div>
    </div>
  );
}