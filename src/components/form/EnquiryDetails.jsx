import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronsLeft, FileText } from "lucide-react";
import { adminEnquiryService } from "../../api/Services/adminEnquiryService";

const formatDate = (value) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return "-";
  return new Date(value).toLocaleDateString("en-GB");
};

const DETAIL_CONFIGS = {
  complaint: {
    title: "Complaints",
    activeField: "CP_is_active",
    detailFields: [
      { key: "CP_reference_no", label: "Request ID" },
      { key: "CP_full_name", label: "Full Name" },
      { key: "CP_mobile", label: "Mobile" },
      { key: "CP_email", label: "Email" },
      { key: "UserTypeName", label: "You are" },
      { key: "ComplaintCategoryName", label: "Category" },
      { key: "CP_details", label: "Complaint Details", type: "multiline" },
      { key: "CP_file_path", label: "Supporting Document", type: "file" },
      { key: "CP_created_at", label: "Submitted", type: "date" },
    ],
  },
  career: {
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
  },
  contact: {
    title: "Contact Enquiries",
    activeField: "CN_is_active",
    detailFields: [
      { key: "CN_request_no", label: "Request ID" },
      { key: "CN_full_name", label: "Full Name" },
      { key: "CN_mobile", label: "Mobile" },
      { key: "CN_email", label: "Email" },
      { key: "UserTypeName", label: "You are" },
      { key: "CN_subject", label: "Subject" },
      { key: "CN_message", label: "Message", type: "multiline" },
      { key: "CN_created_at", label: "Submitted", type: "date" },
    ],
  },
  feedback: {
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
  },
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

const EnquiryDetails = ({ formType }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const cfg = DETAIL_CONFIGS[formType] || DETAIL_CONFIGS.contact;

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      </main>
    </div>
  );
};

export default EnquiryDetails;
