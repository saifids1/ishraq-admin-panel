import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronsLeft, FileText } from "lucide-react";
import { adminEnquiryService } from "../../../../api/Services/adminEnquiryService";
import { getCurrentUserId } from "../../../../utils/authUtils";

const formatDate = (value) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return "-";
  return new Date(value).toLocaleDateString("en-GB");
};

const cfg = {
  title: "Feedback",
  activeField: "FB_is_active",
  detailFields: [
    { key: "FB_request_no", label: "Request ID" },
    { key: "FB_name", label: "Name" },
    { key: "FB_contact", label: "Contact" },
    { key: "UserTypeName", label: "You are" },
    { key: "FB_rating", label: "Overall Experience", type: "rating" },
    { key: "FB_overall_experience", label: "Overall Experience (text)", type: "multiline" },
    { key: "FB_useful_text", label: "What did you find useful?", type: "multiline" },
    { key: "FB_improve_text", label: "What can we improve?", type: "multiline" },
    { key: "FB_suggestions", label: "Additional Suggestions", type: "multiline" },
    { key: "FB_created_at", label: "Submitted", type: "date" },
  ],
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const STATUS_OPTIONS = [
  { value: 1, label: "In Progress" },
  { value: 2, label: "On Hold" },
  { value: 3, label: "Closed" },
];

const statusIdFromName = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return STATUS_OPTIONS.find(
    (option) => option.label.toLowerCase() === normalized,
  )?.value ?? 1;
};

const Stars = ({ value }) => (
  <span className="inline-flex items-center gap-2">
    <span className="text-lg leading-none">
      <span className="text-yellow-400">{"â˜…".repeat(Number(value))}</span>
      <span className="text-slate-300">{"â˜…".repeat(5 - Number(value))}</span>
    </span>
    <span className="text-sm text-slate-500">({value}/5)</span>
  </span>
);

const FeedbackDetails = ({ formType = "feedback" }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responseText, setResponseText] = useState("");
  const [status, setStatus] = useState("1");
  const [savingResponse, setSavingResponse] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        // Pass the form type, not cfg.endpoint.
        const data = await adminEnquiryService.getById(formType, id);

        if (!cancelled) {
          setRecord(data);
          if (!data) {
            setError("Record not found.");
          } else {
            setResponseText(
              data?.responseRetun ??
                data?.responseReturn ??
                data?.response ??
                data?.admin_response ??
                "",
            );
            setStatus(
              String(
                data?.statusId ??
                  data?.FB_status_id ??
                  data?.fb_status_id ??
                  statusIdFromName(data?.statusName ?? data?.status),
              ),
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load this record.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [formType, id]);

  const openFile = async () => {
    try {
      await adminEnquiryService.openFile(formType, id);
    } catch (err) {
      setError(err?.message || "Could not open the document.");
    }
  };

  const handleSubmitResponse = async () => {
    if (savingResponse) return;
    const trimmed = responseText.trim();
    if (!trimmed) {
      setError("Response cannot be empty.");
      return;
    }

    setSavingResponse(true);
    setError("");
    setNotice("");
    try {
      await adminEnquiryService.updateEnquiryResponse(
        formType,
        id,
        trimmed,
        Number(getCurrentUserId()) || 0,
      );
      setResponseText(trimmed);
      setNotice("Response submitted successfully.");
    } catch (err) {
      setError(err?.message || "Failed to submit response.");
    } finally {
      setSavingResponse(false);
    }
  };

  const handleSaveStatus = async () => {
    if (savingStatus) return;
    setSavingStatus(true);
    setError("");
    setNotice("");
    try {
      await adminEnquiryService.updateEnquiryStatus(formType, id, {
        statusId: Number(status),
        userId: Number(getCurrentUserId()) || 0,
        changedAt: new Date().toISOString(),
      });
      setNotice("Status updated successfully.");
    } catch (err) {
      setError(err?.message || "Failed to update status.");
    } finally {
      setSavingStatus(false);
    }
  };

  const renderValue = (field, value) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-slate-400">â€”</span>;
    }

    switch (field.type) {
      case "date":
        return formatDate(value);

      case "rating":
        return <Stars value={value} />;

      case "multiline":
        return <span className="whitespace-pre-wrap break-words">{value}</span>;

      case "file":
        return (
          <button
            type="button"
            onClick={openFile}
            className="inline-flex items-center gap-2 text-[#2f6b8a] hover:underline"
          >
            <FileText size={16} />
            View Document
          </button>
        );

      default:
        return <span className="break-words">{String(value)}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-slate-500">
        Loading details...
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          {error || "Record not found."}
        </div>
      </div>
    );
  }

  const active = Boolean(record[cfg.activeField]);

  return (
    <div className="bg-[#f4f7f9]">
      <header
        className="rounded-2xl p-4 text-white shadow-sm sm:px-4 sm:py-3"
        style={{
          backgroundImage:
            "linear-gradient(110deg,#17405a 0%,#2f6b8a 40%,#4a9bb3 70%,#2f6b8a 100%)",
        }}
      >
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            title="Back"
            aria-label="Back"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-white/15 text-white transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronsLeft size={18} />
          </button>

          <h1 className="m-0 truncate text-[22px] font-extrabold tracking-tight sm:text-[26px]">
            {cfg.title}
          </h1>
        </div>
      </header>

      <main className="mx-auto py-4">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[#e9f4f7] p-2 text-[#2f6b8a]">
                <FileText size={18} />
              </div>
              <h2 className="font-semibold text-slate-800">Details</h2>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                active
                  ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                  : "border-slate-200 bg-slate-100 text-slate-700"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {cfg.detailFields.map((field) => (
              <div
                key={field.key}
                className="grid grid-cols-1 gap-1 px-5 py-4 sm:grid-cols-[220px_1fr] sm:gap-5"
              >
                <div className="text-sm font-medium text-slate-500">
                  {field.label}
                </div>
                <div className="text-sm text-slate-800">
                  {renderValue(field, record[field.key])}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
              {notice}
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="feedback-response" className="mb-1.5 block text-sm font-medium text-slate-700">
                Response
              </label>
              <textarea
                id="feedback-response"
                value={responseText}
                onChange={(event) => setResponseText(event.target.value)}
                rows={4}
                placeholder="Type your response to this feedback..."
                className={inputClass}
                disabled={savingResponse || savingStatus}
              />
            </div>
            <div>
              <label htmlFor="feedback-status" className="mb-1.5 block text-sm font-medium text-slate-700">
                Request Status
              </label>
              <div className="relative">
                <select
                  id="feedback-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className={selectClass}
                  disabled={savingResponse || savingStatus}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
            <div className="flex items-end justify-end gap-3">
              <button type="button" onClick={handleSaveStatus} disabled={savingStatus || savingResponse} className="rounded-lg border border-[#2f6b8a] bg-white px-5 py-2.5 text-sm font-semibold text-[#2f6b8a] transition hover:bg-[#e9f4f7] disabled:cursor-not-allowed disabled:opacity-60">
                {savingStatus ? "Saving..." : "Save Status"}
              </button>
              <button type="button" onClick={handleSubmitResponse} disabled={savingResponse || savingStatus} className="rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60">
                {savingResponse ? "Submitting..." : "Submit Response"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default FeedbackDetails;


