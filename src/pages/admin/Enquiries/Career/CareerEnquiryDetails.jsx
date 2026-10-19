import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronsLeft, FileText } from "lucide-react";
import { adminEnquiryService } from "../../../../api/Services/adminEnquiryService";
import { getCurrentUserId } from "../../../../utils/authUtils";

/* ------------------------------ HELPERS ------------------------------ */

const formatDate = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const s = String(value).trim();
  if (s.startsWith("0001-01-01")) return "-";

  let d;
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (plain) {
    d = new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));
  } else {
    d = value instanceof Date ? value : new Date(s);
  }
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

/* ---------- REQUEST STATUS (same palette as CareerEnquiryList) ---------- */

const REQUEST_STATUS_LABELS = {
  1: "In Progress",
  2: "On Hold",
  3: "Closed",
};

const REQUEST_STATUS_TONES = {
  new: { badge: "bg-sky-600 ring-sky-700 shadow-sky-600/20" },
  inprogress: { badge: "bg-indigo-600 ring-indigo-700 shadow-indigo-600/20" },
  hold: { badge: "bg-amber-500 ring-amber-600 shadow-amber-500/20" },
  closed: { badge: "bg-slate-500 ring-slate-600 shadow-slate-500/20" },
};

const NEUTRAL_BADGE = "bg-slate-500 ring-slate-600 shadow-slate-500/20";

const normalizeRequestStatus = (value) => {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (raw === "new") return "new";
  if (["inprogress", "inprocess", "processing", "ongoing"].includes(raw))
    return "inprogress";
  if (["hold", "onhold", "paused", "pending"].includes(raw)) return "hold";
  if (["closed", "close", "completed", "done", "resolved"].includes(raw))
    return "closed";
  return null;
};

const requestToneOf = (value) => {
  const key = normalizeRequestStatus(value);
  if (!key) return { badge: NEUTRAL_BADGE, key: null };
  return { ...REQUEST_STATUS_TONES[key], key };
};

/* Resolve the human-readable request-status label from a record. */
const requestStatusLabel = (record) => {
  if (!record) return "";
  const statusName =
    record?.requestStatusName ??
    record?.RequestStatusName ??
    record?.statusName ??
    record?.status ??
    record?.enquiry_status;
  if (statusName) return String(statusName);

  const statusId =
    record?.requestStatusId ??
    record?.RequestStatusId ??
    record?.statusId ??
    record?.CE_status_id ??
    record?.cE_status_id ??
    record?.enquiry_status_id;
  if (statusId != null && REQUEST_STATUS_LABELS[Number(statusId)])
    return REQUEST_STATUS_LABELS[Number(statusId)];
  return "";
};

const cfg = {
  title: "Career Enquiries",
  activeField: "CE_is_active",
  detailFields: [
    { key: "CE_request_no", label: "Request ID" },
    { key: "CE_name", label: "Name" },
    { key: "CE_age", label: "Age" },
    { key: "CE_qualification", label: "Qualification" },
    { key: "CE_mobile", label: "Mobile" },
    { key: "CE_email", label: "Email" },
    { key: "CE_course_considered", label: "Course / Career" },
    { key: "CE_question", label: "Question", type: "multiline" },
    { key: "CE_created_at", label: "Submitted", type: "date" },
  ],
};

/* ------------------------------ STYLES ------------------------------ */

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const statusIdFromName = (value, options) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return options.find(
    (option) => option.label.toLowerCase() === normalized,
  )?.value;
};

const Stars = ({ value }) => (
  <span className="inline-flex items-center gap-2">
    <span className="text-lg leading-none">
      <span className="text-yellow-400">{"★".repeat(Number(value))}</span>
      <span className="text-slate-300">{"★".repeat(5 - Number(value))}</span>
    </span>
    <span className="text-sm text-slate-500">({value}/5)</span>
  </span>
);

/* ------------------------------ COMPONENT ------------------------------ */

const CareerEnquiryDetails = ({ formType = "career" }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---- Response + Status state ----
  const [responseText, setResponseText] = useState("");
  const [status, setStatus] = useState("1");
  const [savingResponse, setSavingResponse] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [responseSaved, setResponseSaved] = useState(false);
  const [statusOptions, setStatusOptions] = useState([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [data, loadedStatuses] = await Promise.all([
          adminEnquiryService.getById(formType, id),
          adminEnquiryService.getRequestStatuses().catch((err) => {
            if (!cancelled)
              setError(err?.message || "Unable to load request statuses.");
            return [];
          }),
        ]);

        if (!cancelled) {
          setStatusOptions(loadedStatuses);
          setRecord(data);
          if (!data) {
            setError("Record not found.");
          } else {
            /* ---- Response: include the API's actual key `cE_Respose` ---- */
            const savedResponse =
              data?.cE_Respose ??
              data?.responseRetun ??
              data?.responseReturn ??
              data?.response ??
              data?.admin_response ??
              "";
            setResponseText(savedResponse);
            setResponseSaved(Boolean(String(savedResponse).trim()));

            const existingStatusId =
              data?.requestStatusId ??
              data?.RequestStatusId ??
              data?.statusId ??
              data?.CE_status_id ??
              data?.cE_status_id ??
              data?.enquiry_status_id;
            const existingStatusName =
              data?.requestStatusName ??
              data?.RequestStatusName ??
              data?.statusName ??
              data?.status ??
              data?.enquiry_status;
            setStatus(
              String(
                existingStatusId ??
                  statusIdFromName(existingStatusName, loadedStatuses) ??
                  loadedStatuses[0]?.value ??
                  "",
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
          setStatusLoading(false);
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

  const renderValue = (field, value) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-slate-400">—</span>;
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

  // ---- Submit response ----
  const handleSubmitResponse = async () => {
    if (savingResponse || responseSaved) return;

    const trimmed = responseText.trim();
    if (!trimmed) {
      setError("Response cannot be empty.");
      return;
    }

    setSavingResponse(true);
    setError("");
    setNotice("");

    try {
      const userId = Number(getCurrentUserId()) || 0;
      await adminEnquiryService.updateCareerResponse(id, trimmed, userId);
      setNotice("Response submitted successfully.");
      setResponseSaved(true);
      setRecord((prev) =>
        prev ? { ...prev, cE_Respose: trimmed, response: trimmed } : prev,
      );
    } catch (err) {
      setError(err?.message || "Failed to submit response.");
    } finally {
      setSavingResponse(false);
    }
  };

  // ---- Update status ----
  const handleSaveStatus = async () => {
    // Locked once the request is Closed.
    if (savingStatus || isClosed) return;

    setSavingStatus(true);
    setError("");
    setNotice("");

    try {
      const userId = getCurrentUserId();
      await adminEnquiryService.updateCareerStatus(id, {
        statusId: Number(status),
        userId: Number(userId) || 0,
        changedAt: new Date().toISOString(),
      });
      setNotice("Status updated successfully.");
      setRecord((prev) =>
        prev ? { ...prev, statusId: Number(status) } : prev,
      );
    } catch (err) {
      setError(err?.message || "Failed to update status.");
    } finally {
      setSavingStatus(false);
    }
  };

  const title = cfg?.singular || cfg?.title || "Enquiry";
  const pageTitle = `View ${title}`;

  /* ---- Header request-status badge (same colors as CareerEnquiryList) ---- */
  const headerStatusLabel = useMemo(() => requestStatusLabel(record), [record]);
  const headerStatusTone = useMemo(
    () => requestToneOf(headerStatusLabel),
    [headerStatusLabel],
  );

  /* ---- Lock status editing once the request is Closed. ---- */
  const isClosed = useMemo(
    () => normalizeRequestStatus(headerStatusLabel) === "closed",
    [headerStatusLabel],
  );

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Header bar */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                title="Back"
                aria-label="Back"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f]"
              >
                <ChevronsLeft size={18} strokeWidth={2} />
              </button>

              <h2 className="font-semibold text-slate-800">{pageTitle}</h2>
            </div>

            {/* Request Status badge — same colors as the list, no icon */}
            {record && headerStatusLabel && (
              <span
                className={`inline-flex h-7 min-w-[110px] items-center justify-center rounded-md px-2.5 text-[15px] font-medium text-white ring-1 ring-inset whitespace-nowrap shadow-sm ${headerStatusTone.badge}`}
              >
                {headerStatusLabel}
              </span>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Success notice */}
          {notice && (
            <div className="mx-4 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
              {notice}
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center p-6 text-slate-500">
              Loading details...
            </div>
          ) : record ? (
            <div className="p-4">
              {/* Details list */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                  {cfg.detailFields.map((field) => (
                    <div key={field.key} className="flex gap-10">
                      <div className="text-[14px] uppercase tracking-wide mt-1 w-[8rem]">
                        {field.label} :
                      </div>
                      <div className="text-[15px] font-medium mt-0">
                        {renderValue(field, record[field.key])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- Merged Response + Status section ---- */}
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {/* Response — read-only if already saved */}
                  <div className="md:col-span-2">
                    <label
                      htmlFor="admin-response"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Response
                    </label>

                    {responseSaved ? (
                      <div
                        id="admin-response"
                        className="w-full whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                      >
                        {responseText || (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    ) : (
                      <textarea
                        id="admin-response"
                        value={responseText}
                        onChange={(event) =>
                          setResponseText(event.target.value)
                        }
                        rows={4}
                        placeholder="Type your response to this enquiry..."
                        className={inputClass}
                        disabled={savingResponse || savingStatus}
                      />
                    )}
                  </div>

                  {/* Status — disabled when request is Closed */}
                  <div>
                    <label
                      htmlFor="status-select"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Status
                    </label>
                    <div className="relative">
                      <select
                        id="status-select"
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className={selectClass}
                        disabled={
                          statusLoading ||
                          savingResponse ||
                          savingStatus ||
                          isClosed
                        }
                      >
                        {statusLoading ? (
                          <option value="">Loading statuses...</option>
                        ) : statusOptions.length === 0 ? (
                          <option value="">No statuses available</option>
                        ) : (
                          statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown
                        size={17}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                    </div>
                    {isClosed && (
                      <p className="mt-1.5 text-xs text-slate-500">
                        This request is closed — status can no longer be
                        changed.
                      </p>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex items-end justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleSaveStatus}
                      disabled={savingStatus || savingResponse || isClosed}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#2f6b8a] bg-white px-5 py-2.5 text-sm font-semibold text-[#2f6b8a] transition hover:bg-[#e9f4f7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingStatus
                        ? "Saving..."
                        : isClosed
                          ? "Status Locked"
                          : "Save Status"}
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitResponse}
                      disabled={savingResponse || savingStatus || responseSaved}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingResponse
                        ? "Submitting..."
                        : responseSaved
                          ? "Response Saved"
                          : "Submit Response"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="mt-4 flex justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Back
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CareerEnquiryDetails;