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
  ShieldCheck,
  Tag,
  UserRound,
  Download,
} from "lucide-react";

import { getComplaintById } from "../../../api/complaintApi";

import {
  ACCENT,
  Card,
  PageHeader,
  ReadOnlyValue,
} from "../../../components/common/FormUi";

const STATUS_STYLES = {
  NEW: "bg-blue-600 text-white",
  OPEN: "bg-emerald-600 text-white",
  "IN-PROGRESS": "bg-amber-500 text-white",
  HOLD: "bg-violet-600 text-white",
  CLOSED: "bg-slate-700 text-white",
};

const DEFAULT_STATUS_STYLE = "bg-gray-300 text-gray-800";

const LABEL_CLASS =
  "w-full text-sm font-medium text-black sm:w-48 sm:min-w-48 sm:shrink-0 sm:pt-2";

const normalizeStatus = (value = "") =>
  String(value).trim().toUpperCase().replace(/[\s_]+/g, "-");

// Converts an ISO-like timestamp into "dd/mm/yyyy, h:mm AM/PM".
const formatDate = (value) => {
  if (!value) return "-";

  // Trim fractional seconds beyond milliseconds (e.g. ".6030947")
  // so the date parser accepts the value consistently.
  const normalized = String(value).replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const rawHours = date.getHours();
  const period = rawHours >= 12 ? "PM" : "AM";
  const hours = rawHours % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year}, ${hours}:${minutes} ${period}`;
};

const getFileUrl = (path) => {
  if (!path) return "";

  const baseUrl = (
    process.env.REACT_APP_API_BASE_URL || ""
  ).replace(/\/api\/?$/, "");

  const normalizedPath = String(path)
    .replace(/^\/+/, "")
    .replace(/^uploads?\//i, "uploads/");

  return `${baseUrl}/${normalizedPath}`;
};

const or = (value) =>
  value !== null &&
  value !== undefined &&
  String(value).trim() !== ""
    ? value
    : "-";

// Reusable horizontal label and value layout.
const DetailField = ({ label, children, className = "" }) => (
  <div
    className={`flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-5 ${className}`}
  >
    <span className={LABEL_CLASS}>{label}</span>

    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

const ComplaintDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchComplaint = async () => {
      try {
        setLoading(true);
        setError("");
        setComplaint(null);

        if (!id) {
          throw new Error("Complaint ID is missing.");
        }

        const response = await getComplaintById(id);

        if (
          response?.success === false ||
          response?.Success === false
        ) {
          throw new Error(
            response.message ||
              response.Message ||
              "Failed to load complaint details."
          );
        }

        /*
         * Supports these response formats:
         *
         * 1. Paginated API:
         *    { success: true, data: { data: [...] } }
         *
         * 2. Direct array:
         *    { success: true, data: [...] }
         *
         * 3. Single complaint:
         *    { success: true, data: { cP_complaint_id: 1, ... } }
         *
         * 4. Axios response wrapping the API response:
         *    { data: { success: true, data: { data: [...] } } }
         */

        const apiResponse = response?.data ?? response;

        if (
          apiResponse?.success === false ||
          apiResponse?.Success === false
        ) {
          throw new Error(
            apiResponse.message ||
              apiResponse.Message ||
              "Failed to load complaint details."
          );
        }

        const payload = apiResponse?.data ?? apiResponse;
        const records = payload?.data ?? payload;

        let record = null;

        if (Array.isArray(records)) {
          // Find the complaint matching the route parameter.
          record = records.find(
            (item) =>
              String(item?.cP_complaint_id) === String(id)
          );

          // Fallback for endpoints that return only one record.
          if (!record && records.length === 1) {
            record = records[0];
          }
        } else if (
          records &&
          typeof records === "object" &&
          !Array.isArray(records) &&
          records.cP_complaint_id !== undefined
        ) {
          record = records;
        }

        if (!record) {
          throw new Error(
            "Complaint not found. Please check the complaint ID."
          );
        }

        if (!cancelled) {
          setComplaint(record);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.Message ||
              err?.message ||
              "Failed to load complaint details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchComplaint();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white p-6">
        <div className="flex items-center gap-3 text-sm text-black">
          <LoaderCircle
            className="animate-spin"
            style={{ color: ACCENT }}
            size={20}
          />
          Loading complaint details...
        </div>
      </div>
    );
  }

  // Error state
  if (error || !complaint) {
    return (
      <div className="min-h-full bg-white p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-slate-50"
        >
          Go Back
        </button>

        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-5 text-red-700 shadow-sm">
          <h1 className="font-semibold">
            Could Not Load Complaint
          </h1>

          <p className="mt-1 text-sm">
            {error || "Complaint not found."}
          </p>
        </div>
      </div>
    );
  }

  const statusKey = normalizeStatus(complaint.statusName);
  const statusLabel = statusKey || "UNKNOWN";

  const statusStyle =
    STATUS_STYLES[statusKey] ?? DEFAULT_STATUS_STYLE;

  const filePath = complaint.cP_file_path || "";
  const fileUrl = getFileUrl(filePath);

  const fileName = filePath
    ? filePath.split(/[\\/]/).pop()
    : "";

  const adminResponse = complaint.cP_responseRetun;

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
        {/* Summary */}
        <Card title="Summary" icon={FileText}>
          <div className="flex flex-col gap-5">
            <DetailField label="Complaint ID">
              <ReadOnlyValue icon={FileText}>
                {or(complaint.cP_reference_no)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="Category">
              <ReadOnlyValue icon={Tag}>
                {or(complaint.complaintCategoryName)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="Submitted On">
              <ReadOnlyValue icon={CalendarDays}>
                {formatDate(complaint.cP_created_at)}
              </ReadOnlyValue>
            </DetailField>
          </div>
        </Card>

        {/* Complainant Information */}
        <Card title="Complainant Information" icon={UserRound}>
          <div className="flex flex-col gap-5">
            <DetailField label="Full Name / Organization">
              <ReadOnlyValue icon={Building2}>
                {or(complaint.cP_full_name)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="User Type">
              <ReadOnlyValue icon={UserRound}>
                {or(complaint.userTypeName)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="Mobile Number">
              <ReadOnlyValue icon={Phone}>
                {or(complaint.cP_mobile)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="Email Address">
              <ReadOnlyValue icon={Mail}>
                {or(complaint.cP_email)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="Complaint Category">
              <ReadOnlyValue icon={Tag}>
                {or(complaint.complaintCategoryName)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="Reference Number">
              <ReadOnlyValue icon={FileText}>
                {or(complaint.cP_reference_no)}
              </ReadOnlyValue>
            </DetailField>
          </div>
        </Card>

        {/* Complaint Description */}
        <Card title="Complaint Description" icon={FileText}>
          <DetailField label="Complaint Details">
            <ReadOnlyValue multiline>
              {complaint.cP_details || "No description provided."}
            </ReadOnlyValue>
          </DetailField>
        </Card>

        {/* Admin Response */}
        <Card title="Admin Response" icon={ShieldCheck}>
          <div className="flex flex-col gap-5">
            <DetailField label="Response Status">
              <ReadOnlyValue icon={Tag}>
                {or(complaint.statusName)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="Response">
              <ReadOnlyValue multiline>
                {adminResponse?.trim()
                  ? adminResponse
                  : "No response has been provided yet."}
              </ReadOnlyValue>
            </DetailField>
          </div>
        </Card>

        {/* Supporting Document */}
        <Card title="Supporting Document" icon={Paperclip}>
          <DetailField label="Attachment">
            {filePath ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open document in a new tab"
                className="flex min-h-[42px] w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-black transition hover:bg-slate-100"
              >
                <span className="min-w-0 break-all">
                  {fileName}
                </span>

                <Download
                  size={16}
                  className="shrink-0 text-black"
                />
              </a>
            ) : (
              <div className="flex min-h-[42px] w-full items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-black">
                No supporting document attached.
              </div>
            )}
          </DetailField>
        </Card>

        {/* Record Information */}
        <Card title="Record Information" icon={CalendarDays}>
          <div className="flex flex-col gap-5">
            <DetailField label="Created At">
              <ReadOnlyValue icon={CalendarDays}>
                {formatDate(complaint.cP_created_at)}
              </ReadOnlyValue>
            </DetailField>

            <DetailField label="Last Updated">
              <ReadOnlyValue icon={CalendarDays}>
                {formatDate(complaint.cP_updated_at)}
              </ReadOnlyValue>
            </DetailField>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ComplaintDetails;