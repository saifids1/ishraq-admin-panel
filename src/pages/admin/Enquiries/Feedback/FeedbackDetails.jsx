import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronsLeft, FileText } from "lucide-react";
import { useStatusToast } from "../../../../components/common/StatusModalProvider";
import { adminEnquiryService } from "../../../../api/Services/adminEnquiryService";
import { getCurrentUserId2 } from "../../../../utils/authUtils";

/* ------------------------------ HELPERS ------------------------------ */

const formatDateTime = (value) => {
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
  const yyyy = d.getFullYear();
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${dd}-${mm}-${yyyy}, ${timePart}`;
};

/* ---------- REQUEST STATUS (5-state palette) ---------- */

const REQUEST_STATUS_LABELS = {
  1: "NEW",
  2: "OPEN",
  3: "IN-PROGRESS",
  4: "HOLD",
  5: "CLOSED",
};

const REQUEST_STATUS_TONES = {
  new: {
    badge: "bg-yellow-400 text-yellow-950 ring-yellow-500 shadow-yellow-400/50",
  },
  open: { badge: "bg-blue-600 ring-blue-700 shadow-blue-600/20" },
  inprogress: { badge: "bg-orange-500 ring-orange-600 shadow-orange-500/20" },
  hold: { badge: "bg-red-600 ring-red-700 shadow-red-600/20" },
  closed: { badge: "bg-emerald-600 ring-emerald-700 shadow-emerald-600/20" },
};

const NEUTRAL_BADGE = "bg-slate-500 ring-slate-600 shadow-slate-500/20";

const normalizeRequestStatus = (value) => {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (raw === "new") return "new";
  if (["open", "opened"].includes(raw)) return "open";
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
    record?.FB_status_id ??
    record?.fb_status_id ??
    record?.enquiry_status_id;
  if (statusId != null && REQUEST_STATUS_LABELS[Number(statusId)])
    return REQUEST_STATUS_LABELS[Number(statusId)];
  return "";
};

const RESPONSE_MAX = 500;

const cfg = {
  title: "Feedback",
  activeField: "FB_is_active",
  detailFields: [
    { key: "FB_name", label: "Name" },
    { key: "FB_contact", label: "Contact" },
    { key: "UserTypeName", label: "You are" },
    { key: "FB_rating", label: "Overall Experience", type: "rating" },
    {
      key: "FB_overall_experience",
      label: "Overall Experience (text)",
      type: "multiline",
      stacked: true,
    },
    {
      key: "FB_useful_text",
      label: "What did you find useful?",
      type: "multiline",
      stacked: true,
    },
    {
      key: "FB_improve_text",
      label: "What can we improve?",
      type: "multiline",
      stacked: true,
    },
    {
      key: "FB_suggestions",
      label: "Additional Suggestions",
      type: "multiline",
      stacked: true,
    },
    { key: "FB_created_at", label: "Submitted", type: "datetime" },
  ],
};

/* ------------------------------ STYLES ------------------------------ */

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const displayInputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition cursor-default";

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

const FeedbackDetails = ({ formType = "feedback" }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [, setToast] = useStatusToast();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [responseText, setResponseText] = useState("");
  const [status, setStatus] = useState("1");
  const [saving, setSaving] = useState(false);
  const [statusOptions, setStatusOptions] = useState([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [responseLocked, setResponseLocked] = useState(false);

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
            const savedResponse =
              data?.fb_responseRetun ??
              data?.responseRetun ??
              data?.responseReturn ??
              data?.response ??
              data?.admin_response ??
              "";
            const savedStr = String(savedResponse ?? "").slice(
              0,
              RESPONSE_MAX,
            );
            setResponseText(savedStr);
            setResponseLocked(Boolean(savedStr.trim()));

            const existingStatusId =
              data?.requestStatusId ??
              data?.RequestStatusId ??
              data?.statusId ??
              data?.FB_status_id ??
              data?.fb_status_id ??
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

  const fieldDisplayValue = (field, value) => {
    if (value === null || value === undefined || value === "") return "";

    switch (field.type) {
      case "date":
        return formatDateTime(value);
      case "datetime":
        return formatDateTime(value);
      default:
        return String(value);
    }
  };

  const renderFieldInput = (field, value) => {
    if (field.type === "rating") {
      return (
        <div className={displayInputClass}>
          {value ? (
            <Stars value={value} />
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
      );
    }

    if (field.type === "file") {
      return (
        <div className={displayInputClass}>
          <button
            type="button"
            onClick={openFile}
            className="inline-flex items-center gap-2 text-[#2f6b8a] hover:underline"
          >
            <FileText size={16} />
            View Document
          </button>
        </div>
      );
    }

    if (field.type === "multiline") {
      return (
        <textarea
          readOnly
          value={fieldDisplayValue(field, value)}
          rows={3}
          className={`${displayInputClass} resize-none`}
        />
      );
    }

    return (
      <input
        type="text"
        readOnly
        value={fieldDisplayValue(field, value)}
        className={displayInputClass}
      />
    );
  };

  const handleSubmit = async () => {
    if (saving || isClosed) return;

    const trimmed = responseText.trim();

    if (!responseLocked) {
      if (!trimmed) {
        setError("Response cannot be empty.");
        setToast({ tone: "err", msg: "Response cannot be empty." });
        return;
      }

      if (trimmed.length > RESPONSE_MAX) {
        setError(`Response cannot exceed ${RESPONSE_MAX} characters.`);
        setToast({
          tone: "err",
          msg: `Response cannot exceed ${RESPONSE_MAX} characters.`,
        });
        return;
      }
    }

    if (!status) {
      setError("Select a request status before submitting.");
      setToast({
        tone: "err",
        msg: "Select a request status before submitting.",
      });
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const userId = Number(getCurrentUserId2());
      if (!Number.isInteger(userId) || userId <= 0) {
        throw new Error(
          "Unable to identify the current user. Please sign in again.",
        );
      }

      const selectedStatus = statusOptions.find(
        (option) => Number(option.value) === Number(status),
      );
      if (!selectedStatus) {
        throw new Error(
          "The selected request status is unavailable. Refresh and try again.",
        );
      }

      const tasks = [
        adminEnquiryService.updateEnquiryStatus(formType, id, {
          statusId: Number(status),
          userId,
          changedAt: new Date().toISOString(),
        }),
      ];

      if (!responseLocked) {
        tasks.push(
          adminEnquiryService.updateEnquiryResponse(
            formType,
            id,
            trimmed,
            userId,
          ),
        );
      }

      await Promise.all(tasks);

      setNotice("Submitted successfully.");
      setToast({ tone: "ok", msg: "Submitted successfully." });

      if (!responseLocked) {
        setResponseLocked(true);
      }

      setRecord((prev) =>
        prev
          ? {
              ...prev,
              ...(responseLocked
                ? {}
                : { fb_responseRetun: trimmed, response: trimmed }),
              requestStatusId: Number(status),
              RequestStatusId: Number(status),
              statusId: Number(status),
              requestStatusName: selectedStatus.label,
              RequestStatusName: selectedStatus.label,
              statusName: selectedStatus.label,
              status: selectedStatus.label,
            }
          : prev,
      );
    } catch (err) {
      const message = err?.message || "Failed to submit.";
      setError(message);
      setToast({ tone: "err", msg: message });
    } finally {
      setSaving(false);
    }
  };

  const title = cfg?.singular || cfg?.title || "Feedback";
  const pageTitle = `View ${title}`;

  const headerStatusLabel = useMemo(() => requestStatusLabel(record), [record]);
  const headerStatusTone = useMemo(
    () => requestToneOf(headerStatusLabel),
    [headerStatusLabel],
  );

  const headerRequestId = useMemo(
    () =>
      record?.FB_request_no ??
      record?.fb_request_no ??
      record?.FB_reference_no ??
      record?.requestNo ??
      "",
    [record],
  );

  const isClosed = useMemo(
    () => normalizeRequestStatus(headerStatusLabel) === "closed",
    [headerStatusLabel],
  );

  const responseDisabled = saving || isClosed || responseLocked;

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Sticky header bar */}
          <div className="sticky top-0 z-20 relative flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
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

            {headerRequestId && (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
                <span className="text-[16px]">{headerRequestId}</span>
              </div>
            )}

            {record && headerStatusLabel && (
              <span
                className={`inline-flex h-7 min-w-[110px] items-center justify-center rounded-md px-2.5 text-[15px] font-medium text-white ring-1 ring-inset whitespace-nowrap shadow-sm ${headerStatusTone.badge}`}
              >
                {headerStatusLabel}
              </span>
            )}
          </div>

          {error && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center p-6 text-slate-500">
              Loading details...
            </div>
          ) : record ? (
            <div className="p-4">
              {/* Details list */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                {/* Top group — single-line fields (2-col, label : input) */}
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                  {cfg.detailFields
                    .filter((f) => !f.stacked)
                    .map((field) => (
                      <div
                        key={field.key}
                        className="grid grid-cols-[140px_1fr] items-center gap-3"
                      >
                        <label
                          htmlFor={`field-${field.key}`}
                          className="text-[14px] font-semibold text-black"
                        >
                          {field.label}
                        </label>
                        <div className="min-w-0">
                          {renderFieldInput(field, record[field.key])}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Bottom group — stacked fields, label w-44 fixed width, input fills remaining */}
                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-1">
                  {cfg.detailFields
                    .filter((f) => f.stacked)
                    .map((field) => (
                      <div
                        key={field.key}
                        className="grid grid-cols-[176px_1fr] items-start gap-3"
                      >
                        <label
                          htmlFor={`field-${field.key}`}
                          className="pt-2.5 text-[14px] font-semibold leading-tight text-black"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {field.label}
                        </label>
                        <div className="min-w-0">
                          {renderFieldInput(field, record[field.key])}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* ---- Response 70% | Status 30%, same row ---- */}
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[7fr_3fr]">
                  <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                    <label
                      htmlFor="admin-response"
                      className="pt-2.5 text-[14px] font-semibold text-black"
                    >
                      Response
                    </label>
                    <div className="min-w-0">
                      <textarea
                        id="admin-response"
                        value={responseText}
                        onChange={(event) =>
                          setResponseText(
                            String(event.target.value).slice(0, RESPONSE_MAX),
                          )
                        }
                        rows={4}
                        maxLength={RESPONSE_MAX}
                        placeholder={
                          responseLocked
                            ? ""
                            : "Type your response to this feedback..."
                        }
                        className={`${inputClass} resize-none ${
                          responseLocked
                            ? "cursor-not-allowed bg-slate-50 text-slate-600"
                            : ""
                        }`}
                        disabled={responseDisabled}
                        readOnly={responseLocked}
                      />
                      <div className="mt-1 flex justify-end">
                        <span className="text-[11px] text-slate-500">
                          {responseText.length}/{RESPONSE_MAX}
                        </span>
                      </div>

                      {responseLocked && (
                        <p className="mt-1 text-xs text-slate-500">
                          Response has already been submitted and can no longer
                          be edited.
                        </p>
                      )}
                      {isClosed && (
                        <p className="mt-1 text-xs text-slate-500">
                          This feedback is closed — status and response can no
                          longer be changed.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-[90px_1fr] items-start gap-3">
                    <label
                      htmlFor="status-select"
                      className="pt-2.5 text-[14px] font-semibold text-black"
                    >
                      Status
                    </label>
                    <div className="relative min-w-0">
                      <select
                        id="status-select"
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className={selectClass}
                        disabled={statusLoading || saving || isClosed}
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
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving || isClosed}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FeedbackDetails;