import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronsLeft,
  Building2,
  BriefcaseBusiness,
  ExternalLink,
  Inbox,
  ChevronsRight,
  X,
} from "lucide-react";
import {
  getEmployerById,
  updateEmployer,
} from "../../../api/employerApi";
import { getJobRequirementsByEmployer } from "../../../api/jobRequirementApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";
import { getCurrentUserId2 } from "../../../utils/authUtils";
import StatusModal from "../../../components/common/StatusModal";

/* ---------------- Design tokens (same as JobSeekerDetails) ---------------- */
const T = {
  radius: "rounded-lg",
  border: "border-[#e3e8ee]",
  borderSoft: "border-[#eef1f5]",
  bg: "bg-[#f4f8fb]",
  surface: "bg-white",
  text: "text-[#1a2b3c]",
  textMuted: "text-[#5b6b7c]",
  textFaint: "text-black",
  accent: "text-[#1e5a7a]",
  hover: "hover:bg-[#f3f6f9]",
  cardShadow: "shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
};

const val = (v) =>
  v === null || v === undefined || String(v).trim() === "" ? "—" : v;

const toYesNo = (v) => {
  if (v === true || v === 1 || v === "1" || v === "true") return "Yes";
  if (v === false || v === 0 || v === "0" || v === "false") return "No";
  return "—";
};

const BADGE =
  "inline-flex h-6 items-center rounded-md px-2 text-[11.5px] font-semibold tracking-wide whitespace-nowrap ring-1 ring-inset";

const CATEGORY_STYLE = {
  Nurse: "bg-sky-50 text-sky-700 ring-sky-200",
  Doctor: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  Pharmacist: "bg-violet-50 text-violet-700 ring-violet-200",
  "Lab Technician": "bg-teal-50 text-teal-700 ring-teal-200",
  Caregiver: "bg-amber-50 text-amber-700 ring-amber-200",
  "Admin / Office Staff": "bg-slate-100 text-slate-700 ring-slate-200",
  Other: "bg-gray-100 text-gray-700 ring-gray-200",
};

const CARD_STATUS_STYLE = {
  Open: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Paused: "bg-amber-50 text-amber-700 ring-amber-200",
  Closed: "bg-slate-100 text-slate-600 ring-slate-200",
};
const CARD_STATUS_DOT = {
  Open: "bg-emerald-500",
  Paused: "bg-amber-500",
  Closed: "bg-slate-400",
};

/* ---------------- Shared field styles (same as JobSeekerDetails) ---------------- */
const FIELD_LABEL = `text-[13px] font-semibold tracking-wide ${T.textFaint}`;
const FIELD_BOX = (mono) =>
  `flex h-9 w-full min-w-0 items-center rounded-md border ${T.border} bg-[#fbfcfd] px-3 text-[13px] font-medium ${T.text} ${
    mono ? "font-mono text-[12.5px]" : ""
  }`;

const BTN_PRIMARY =
  "inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]";
const EDIT_INPUT =
  "h-9 w-full min-w-0 rounded-md border border-[#c9d5dd] bg-white px-3 text-[13px] text-[#1a2b3c] outline-none focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/20 disabled:bg-slate-100 disabled:text-slate-500";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^\d{10}$/;

/* ---------------- Card primitive (identical to JobSeekerDetails) ---------------- */
function Card({ title, action, children, className = "" }) {
  return (
    <section
      className={`${T.surface} ${T.radius} border ${T.border} ${T.cardShadow} ${className}`}
    >
      <div className="p-3.5 sm:p-4">
        {(title || action) && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            {title && (
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                {title}
              </h3>
            )}
            {action}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/* ---------------- FieldRow (responsive: stacks on mobile) ---------------- */
const FieldRow = ({ label, value, mono = false, children }) => {
  const isEditing = children !== undefined && children !== null;

  return (
    <div className="grid grid-cols-1 items-start gap-1 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center sm:gap-3">
      <label className={`${FIELD_LABEL} text-left sm:text-right`}>{label}</label>

      {isEditing ? (
        <div className="min-w-0">{children}</div>
      ) : (
        <div className={FIELD_BOX(mono)}>
          <span className="min-w-0 flex-1 truncate" title={String(val(value))}>
            {val(value)}
          </span>
        </div>
      )}
    </div>
  );
};

/* ---------------- Nav ---------------- */
const NAV = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "jobs", label: "Job Requirements", icon: BriefcaseBusiness },
];

/* ---------------- Helpers ---------------- */
const extractList = (response) => {
  const root = response?.data ?? response;
  const candidates = [
    root?.data?.data,
    root?.Data?.Data,
    root?.data,
    root?.Data,
    root,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (Array.isArray(candidate?.data)) return candidate.data;
    if (Array.isArray(candidate?.Data)) return candidate.Data;
  }
  return [];
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  fallback;

const draftFromEmployer = (emp) => ({
  email: emp?.email ?? emp?.userName ?? "",
  mobile: emp?.mobile ?? "",
  fullName: emp?.fullName ?? "",
  organizationName: emp?.eM_organization_name ?? "",
  instituteTypeId: String(emp?.eM_institute_type_id ?? ""),
  contactPerson: emp?.eM_contact_person ?? "",
  designation: emp?.eM_designation ?? "",
  countryId: String(emp?.eM_country_id ?? ""),
  stateId: String(emp?.eM_state_id ?? ""),
  cityId: String(emp?.eM_city_id ?? ""),
  website: emp?.eM_website ?? "",
  consentGiven: Boolean(emp?.eM_consent_given),
});

const parseDate = (value) => {
  if (value === null || value === undefined || String(value).trim() === "")
    return null;
  let s = String(value).trim();
  s = s.replace(/(\.\d{3})\d+/, "$1");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (iso) => {
  const d = parseDate(iso);
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const formatDateTime = (iso) => {
  const d = parseDate(iso);
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dd}-${mm}-${yyyy} ${timePart}`;
};

const formatUser = (v) => val(v);

/* ---------------- Page ---------------- */
const EmployerProfile = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [emp, setEmp] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(mode === "edit");
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Lookups
  const [instituteTypes, setInstituteTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [draft, setDraft] = useState({});
  const [modal, setModal] = useState(null);

  const openStatus = (type, message, extra = {}) => {
    setModal({
      type,
      message,
      confirmText: extra.confirmText || "OK",
      cancelText: extra.cancelText || "Cancel",
      showCancel: false,
      title: extra.title,
      onConfirm: () => {
        setModal(null);
        extra.onConfirm?.();
      },
      onCancel: () => {
        setModal(null);
        extra.onCancel?.();
      },
    });
  };

  const openConfirm = ({
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
  }) => {
    setModal({
      type: "confirm",
      title,
      message,
      confirmText: confirmText || "Confirm",
      cancelText: cancelText || "Cancel",
      showCancel: true,
      onConfirm: () => {
        setModal(null);
        onConfirm?.();
      },
      onCancel: () => {
        setModal(null);
        onCancel?.();
      },
    });
  };

  /* --------------------------- Load draft when employer loads --------------------------- */

  useEffect(() => {
    if (!emp) return;
    setDraft(draftFromEmployer(emp));
  }, [emp]);

  /* --------------------------- Lookups: institute types + countries (edit mode) --------------------------- */

  useEffect(() => {
    if (!isEditing) return undefined;
    let cancelled = false;

    const loadBase = async () => {
      setEditError("");
      try {
        const [typeRes, countryRes] = await Promise.all([
          instituteTypeApi.getAllList(),
          countryMasterApi.getAllList(),
        ]);
        if (cancelled) return;
        setInstituteTypes(extractList(typeRes));
        setCountries(extractList(countryRes));
      } catch (err) {
        if (!cancelled) {
          setEditError(
            getErrorMessage(err, "Unable to load employer edit options."),
          );
        }
      }
    };

    loadBase();
    return () => {
      cancelled = true;
    };
  }, [isEditing]);

  /* --------------------------- Level 2: states for the draft country (by id) --------------------------- */

  useEffect(() => {
    if (!isEditing) return undefined;
    let cancelled = false;

    if (!draft.countryId) {
      setStates([]);
      setLoadingStates(false);
      return undefined;
    }

    setLoadingStates(true);
    stateMasterApi
      .getByCountry(Number(draft.countryId))
      .then((res) => {
        if (!cancelled) setStates(extractList(res));
      })
      .catch((err) => {
        if (!cancelled) {
          setStates([]);
          setEditError(getErrorMessage(err, "Unable to load states."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEditing, draft.countryId]);

  /* --------------------------- Level 3: cities for the draft state (by id) --------------------------- */

  useEffect(() => {
    if (!isEditing) return undefined;
    let cancelled = false;

    if (!draft.stateId) {
      setCities([]);
      setLoadingCities(false);
      return undefined;
    }

    setLoadingCities(true);
    cityMasterApi
      .getByState(Number(draft.stateId))
      .then((res) => {
        if (!cancelled) setCities(extractList(res));
      })
      .catch((err) => {
        if (!cancelled) {
          setCities([]);
          setEditError(getErrorMessage(err, "Unable to load cities."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEditing, draft.stateId]);

  /* --------------------------- Fetch employer + job requirements --------------------------- */

  useEffect(() => {
    let cancelled = false;

    const fetchEmployer = async () => {
      setLoading(true);
      setError(null);
      try {
        const json = await getEmployerById(id);

        if (!json?.success || !json?.data) {
          throw new Error(json?.message || "Employer not found");
        }

        let jobRequirements = [];
        try {
          const jobResponse = await getJobRequirementsByEmployer(id);
          jobRequirements = Array.isArray(jobResponse)
            ? jobResponse
            : jobResponse?.data ?? jobResponse?.Data ?? [];
        } catch {
          jobRequirements = [];
        }

        if (!cancelled) {
          setEmp(json.data);
          setJobs(
            jobRequirements.map((job) => ({
              id: job.jQ_job_requirement_id,
              title: job.jQ_position_title,
              category: job.jobCategoryName,
              status: job.jobStatusName,
              vacancies: Number(job.jQ_vacancies) || 0,
              filled: 0,
              applicants: job.appliedCount ?? 0,
              postedOn: formatDate(job.jQ_created_at),
              deadline: formatDate(job.jQ_deadline),
            })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load employer");
          setEmp(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (id) fetchEmployer();
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  const goToEditProfile = () => {
    setDraft(draftFromEmployer(emp));
    setEditError("");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditError("");
    if (mode === "edit") {
      navigate(`/admin/employers/${id}`, { replace: true });
    }
  };

  /* --------------------------- Cascading updates --------------------------- */

  const updateDraft = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));

  // Changing a parent clears all child selections so stale IDs are never saved.
  const handleCountryChange = (value) => {
    setDraft((current) => ({
      ...current,
      countryId: value,
      stateId: "",
      cityId: "",
    }));
    setStates([]);
    setCities([]);
  };

  const handleStateChange = (value) => {
    setDraft((current) => ({
      ...current,
      stateId: value,
      cityId: "",
    }));
    setCities([]);
  };

  /* --------------------------- Save --------------------------- */

  const saveEmployer = async () => {
    const userId = Number(getCurrentUserId2());
    if (!Number.isInteger(userId) || userId <= 0) {
      setEditError("Unable to identify the current user. Please sign in again.");
      return;
    }
    if (
      !draft.organizationName.trim() ||
      !draft.instituteTypeId ||
      !draft.contactPerson.trim() ||
      !draft.designation.trim() ||
      !draft.email.trim() ||
      !draft.mobile.trim() ||
      !draft.countryId ||
      !draft.stateId ||
      !draft.cityId
    ) {
      setEditError("Complete all required employer fields before saving.");
      return;
    }
    if (!MOBILE_RE.test(draft.mobile.trim())) {
      setEditError("Mobile must be exactly 10 digits.");
      return;
    }
    if (!EMAIL_RE.test(draft.email.trim())) {
      setEditError("Enter a valid email address.");
      return;
    }
    if (!draft.consentGiven) {
      setEditError("Please provide consent before submitting.");
      return;
    }
    if (
      !instituteTypes.some(
        (type) => String(type.iT_institute_type_id) === draft.instituteTypeId,
      )
    ) {
      setEditError("Select a valid Organization Type.");
      return;
    }
    if (!countries.some((c) => String(c.cM_Id) === draft.countryId)) {
      setEditError("Select a valid Country.");
      return;
    }
    if (!states.some((s) => String(s.sM_Id) === draft.stateId)) {
      setEditError("Select a State for the selected Country.");
      return;
    }
    if (!cities.some((c) => String(c.ctM_Id) === draft.cityId)) {
      setEditError("Select a City for the selected State.");
      return;
    }

    const doSave = async () => {
      setSaving(true);
      setEditError("");
      try {
        await updateEmployer(id, {
          eM_employer_id: Number(id),
          email: draft.email.trim(),
          mobile: draft.mobile.trim(),
          fullName: draft.fullName.trim(),
          eM_organization_name: draft.organizationName.trim(),
          eM_institute_type_id: Number(draft.instituteTypeId),
          eM_contact_person: draft.contactPerson.trim(),
          eM_designation: draft.designation.trim(),
          eM_country_id: Number(draft.countryId),
          eM_state_id: Number(draft.stateId),
          eM_city_id: Number(draft.cityId),
          eM_website: draft.website.trim(),
          eM_consent_given: Boolean(draft.consentGiven),
          eM_created_by: emp.eM_created_by,
          EM_updated_by: userId,
        });
        setIsEditing(false);
        setRefreshKey((current) => current + 1);
        if (mode === "edit") {
          navigate(`/admin/employers/${id}`, { replace: true });
        }
      } catch (err) {
        setEditError(
          getErrorMessage(err, "Failed to update employer."),
        );
      } finally {
        setSaving(false);
      }
    };

    openConfirm({
      title: "Confirm update",
      message: "Are you sure you want to update this employer?",
      confirmText: "Update",
      onConfirm: doSave,
    });
  };

  const pageTitle = emp?.eM_organization_name || "Employer";

  if (loading) {
    return (
      <div className={`min-h-full ${T.bg} p-4 sm:p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-8 text-center sm:p-12">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#2f6b8a] border-t-transparent" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>
            Loading employer…
          </p>
        </div>
      </div>
    );
  }

  if (error || !emp) {
    return (
      <div className={`min-h-full ${T.bg} p-4 sm:p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-8 text-center sm:p-12">
          <Building2 size={28} className="mx-auto text-[#8895a4]" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>
            {error || "Employer not found"}
          </p>
          <p className={`mt-1 text-[13px] ${T.textMuted}`}>
            The record you're looking for doesn't exist or was removed.
          </p>
          <button onClick={() => navigate(-1)} className={`mt-4 ${BTN_PRIMARY}`}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  const active = emp.eM_is_active === true;

  return (
    <div className={`min-h-full ${T.bg}`}>
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* MAIN HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                title="Back"
                aria-label="Back"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f]"
              >
                <ChevronsLeft size={18} strokeWidth={2} />
              </button>

              <h2 className="truncate font-semibold text-slate-800">
                {pageTitle}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60 sm:gap-2 sm:px-4 sm:py-2.5"
                  >
                    <X size={15} /> <span className="hidden xs:inline">Cancel</span>
                  </button>
                  <button
                    type="button"
                    onClick={saveEmployer}
                    disabled={saving}
                    className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={goToEditProfile}
                  className={BTN_PRIMARY}
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          {editError && (
            <div
              role="alert"
              className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 sm:mx-6"
            >
              {editError}
            </div>
          )}

          {/* BODY */}
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-[200px_1fr]">
              {/* LEFT: vertical nav — becomes horizontal on mobile */}
              <aside className="md:sticky md:top-4 md:h-fit md:w-[11rem]">
                <nav
                  aria-label="Employer sections"
                  className={`${T.surface} ${T.radius} border ${T.border} overflow-x-auto p-1.5 ${T.cardShadow}`}
                >
                  <div className="flex min-w-max gap-1 md:min-w-0 md:flex-col">
                    {NAV.map((n) => {
                      const on = tab === n.id;
                      const Icon = n.icon;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => setTab(n.id)}
                          aria-current={on ? "page" : undefined}
                          className={`group flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-[13px] font-semibold transition ${
                            on
                              ? "bg-[#eaf2f7] text-[#1e5a7a]"
                              : "text-[#5b6b7c] hover:bg-[#f3f6f9] hover:text-[#1a2b3c]"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 whitespace-nowrap">
                            <Icon
                              size={15}
                              className={
                                on
                                  ? "text-[#1e5a7a]"
                                  : "text-[#8895a4] group-hover:text-[#5b6b7c]"
                              }
                            />
                            {n.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </nav>
              </aside>

              {/* RIGHT: detail panel */}
              <main className="min-w-0">
                {/* -------- Overview -------- */}
                {tab === "overview" && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Organization Details */}
                    <Card title="Organization Details">
                      <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                        <FieldRow
                          label="Employer ID"
                          value={emp.eM_request_no}
                          mono
                        />
                        <FieldRow
                          label="Organization Name"
                          value={emp.eM_organization_name}
                        >
                          {isEditing ? (
                            <input
                              className={EDIT_INPUT}
                              value={draft.organizationName ?? ""}
                              onChange={(event) =>
                                updateDraft(
                                  "organizationName",
                                  event.target.value,
                                )
                              }
                            />
                          ) : undefined}
                        </FieldRow>
                        <FieldRow
                          label="Organization Type"
                          value={emp.instituteTypeName}
                        >
                          {isEditing ? (
                            <select
                              className={EDIT_INPUT}
                              value={draft.instituteTypeId ?? ""}
                              onChange={(event) =>
                                updateDraft(
                                  "instituteTypeId",
                                  event.target.value,
                                )
                              }
                            >
                              <option value="">Select organization type</option>
                              {instituteTypes.map((type) => (
                                <option
                                  key={type.iT_institute_type_id}
                                  value={String(type.iT_institute_type_id)}
                                >
                                  {type.iT_name}
                                </option>
                              ))}
                            </select>
                          ) : undefined}
                        </FieldRow>
                        <FieldRow label="Website">
                          {isEditing ? (
                            <input
                              className={EDIT_INPUT}
                              value={draft.website ?? ""}
                              onChange={(event) =>
                                updateDraft("website", event.target.value)
                              }
                            />
                          ) : (
                            <div className={FIELD_BOX(false)}>
                              {emp.eM_website ? (
                                <a
                                  href={
                                    /^https?:\/\//i.test(emp.eM_website)
                                      ? emp.eM_website
                                      : `https://${emp.eM_website}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  title={emp.eM_website}
                                  className="inline-flex min-w-0 flex-1 items-center gap-1 truncate text-[#1e5a7a] hover:underline"
                                >
                                  <span className="min-w-0 truncate">
                                    {emp.eM_website}
                                  </span>
                                  <ExternalLink
                                    size={11}
                                    className="shrink-0"
                                  />
                                </a>
                              ) : (
                                <span className="min-w-0 flex-1 truncate">
                                  —
                                </span>
                              )}
                            </div>
                          )}
                        </FieldRow>
                        <FieldRow
                          label="Email / Username"
                          value={emp.userName}
                        >
                          {isEditing ? (
                            <input
                              type="email"
                              className={EDIT_INPUT}
                              value={draft.email ?? ""}
                              onChange={(event) =>
                                updateDraft("email", event.target.value)
                              }
                            />
                          ) : undefined}
                        </FieldRow>
                        <FieldRow
                          label="Status"
                          value={active ? "Active" : "Inactive"}
                        />
                        <FieldRow
                          label="Consent Given"
                          value={toYesNo(emp.eM_consent_given)}
                        >
                          {isEditing ? (
                            <label className="flex items-center gap-2 text-[13px]">
                              <input
                                type="checkbox"
                                checked={Boolean(draft.consentGiven)}
                                onChange={(event) =>
                                  updateDraft(
                                    "consentGiven",
                                    event.target.checked,
                                  )
                                }
                              />
                              Consent given
                            </label>
                          ) : undefined}
                        </FieldRow>
                        <FieldRow
                          label="Consent At"
                          value={formatDateTime(emp.eM_consent_at)}
                        />
                      </div>
                    </Card>

                    {/* Contact Person */}
                    <Card title="Contact Person">
                      <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                        <FieldRow
                          label="Contact Person"
                          value={emp.eM_contact_person}
                        >
                          {isEditing ? (
                            <input
                              className={EDIT_INPUT}
                              value={draft.contactPerson ?? ""}
                              onChange={(event) =>
                                updateDraft(
                                  "contactPerson",
                                  event.target.value,
                                )
                              }
                            />
                          ) : undefined}
                        </FieldRow>
                        <FieldRow
                          label="Designation"
                          value={emp.eM_designation}
                        >
                          {isEditing ? (
                            <input
                              className={EDIT_INPUT}
                              value={draft.designation ?? ""}
                              onChange={(event) =>
                                updateDraft("designation", event.target.value)
                              }
                            />
                          ) : undefined}
                        </FieldRow>
                        <FieldRow label="Mobile" value={emp.mobile} mono>
                          {isEditing ? (
                            <input
                              className={EDIT_INPUT}
                              value={draft.mobile ?? ""}
                              onChange={(event) =>
                                updateDraft(
                                  "mobile",
                                  event.target.value.replace(/\D/g, "").slice(0, 10),
                                )
                              }
                              inputMode="numeric"
                            />
                          ) : undefined}
                        </FieldRow>
                      </div>
                    </Card>

                    {/* Location */}
                    <Card title="Location">
                      <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                        <FieldRow label="Country" value={emp.countryName}>
                          {isEditing ? (
                            <select
                              className={EDIT_INPUT}
                              value={draft.countryId ?? ""}
                              disabled={loadingStates}
                              onChange={(event) =>
                                handleCountryChange(event.target.value)
                              }
                            >
                              <option value="">Select country</option>
                              {countries.map((country) => (
                                <option
                                  key={country.cM_Id}
                                  value={String(country.cM_Id)}
                                >
                                  {country.cM_CountryName}
                                </option>
                              ))}
                            </select>
                          ) : undefined}
                        </FieldRow>

                        <FieldRow label="State" value={emp.stateName}>
                          {isEditing ? (
                            <select
                              className={EDIT_INPUT}
                              value={draft.stateId ?? ""}
                              disabled={!draft.countryId || loadingStates}
                              onChange={(event) =>
                                handleStateChange(event.target.value)
                              }
                            >
                              <option value="">
                                {!draft.countryId
                                  ? "Select country first"
                                  : loadingStates
                                    ? "Loading states..."
                                    : "Select state"}
                              </option>
                              {states.map((state) => (
                                <option
                                  key={state.sM_Id}
                                  value={String(state.sM_Id)}
                                >
                                  {state.sM_StateName}
                                </option>
                              ))}
                            </select>
                          ) : undefined}
                        </FieldRow>

                        <FieldRow label="City" value={emp.cityName}>
                          {isEditing ? (
                            <select
                              className={EDIT_INPUT}
                              value={draft.cityId ?? ""}
                              disabled={!draft.stateId || loadingCities}
                              onChange={(event) =>
                                updateDraft("cityId", event.target.value)
                              }
                            >
                              <option value="">
                                {!draft.stateId
                                  ? "Select state first"
                                  : loadingCities
                                    ? "Loading cities..."
                                    : "Select city"}
                              </option>
                              {cities.map((city) => (
                                <option
                                  key={city.ctM_Id}
                                  value={String(city.ctM_Id)}
                                >
                                  {city.ctM_CityName}
                                </option>
                              ))}
                            </select>
                          ) : undefined}
                        </FieldRow>
                      </div>
                    </Card>

                    {/* User Log */}
                    <Card title="User Log">
                      <div className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
                        <FieldRow
                          label="Created At"
                          value={formatDateTime(emp.eM_created_at)}
                        />
                        <FieldRow
                          label="Created By"
                          value={formatUser(emp.createdByName)}
                        />
                        <FieldRow
                          label="Updated At"
                          value={formatDateTime(emp.eM_updated_at)}
                        />
                        <FieldRow
                          label="Updated By"
                          value={formatUser(emp.updatedByName)}
                        />
                        <FieldRow
                          label="Activated At"
                          value={formatDateTime(emp.eM_activated_at)}
                        />
                      </div>
                    </Card>
                  </div>
                )}

                {/* -------- Job Requirements -------- */}
                {tab === "jobs" && (
                  <Card
                    title="Job Requirements"
                    action={
                      <p className="text-xs text-[#5b6b7c]">
                        {jobs.length} posting{jobs.length !== 1 ? "s" : ""}
                      </p>
                    }
                  >
                    {jobs.length === 0 ? (
                      <div className="px-4 py-12 text-center">
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f1f6] text-[#2c6b8a] shadow-[0_0_0_6px_rgba(232,241,246,0.6)]">
                          <Inbox size={22} />
                        </div>
                        <p className="mt-3 text-[15px] text-[#1e2b36]">
                          No jobs yet
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {jobs.map((job) => {
                          const pct = job.vacancies
                            ? Math.round((job.filled / job.vacancies) * 100)
                            : 0;
                          const statusStyle =
                            CARD_STATUS_STYLE[job.status] ||
                            CARD_STATUS_STYLE.Closed;
                          const statusDot =
                            CARD_STATUS_DOT[job.status] ||
                            CARD_STATUS_DOT.Closed;
                          return (
                            <div
                              key={job.id}
                              className={`${T.surface} ${T.radius} border ${T.border} flex flex-col p-3.5 transition hover:border-[#c7d6e0]`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p
                                    className={`truncate text-[13.5px] font-semibold ${T.text}`}
                                  >
                                    {job.title || "-"}
                                  </p>
                                  <p className="mt-0.5 text-[11.5px] text-[#8895a4]">
                                    Posted {job.postedOn} · Deadline{" "}
                                    {job.deadline}
                                  </p>
                                </div>
                                <span
                                  className={`${BADGE} ${statusStyle} gap-1.5`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${statusDot}`}
                                  />
                                  {job.status || "-"}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span
                                  className={`${BADGE} ${
                                    CATEGORY_STYLE[job.category] ||
                                    CATEGORY_STYLE.Other
                                  }`}
                                >
                                  {job.category || "-"}
                                </span>
                                <span className="text-[11.5px] text-[#5b6b7c]">
                                  <span className="font-semibold text-[#1a2b3c]">
                                    {job.applicants ?? 0}
                                  </span>{" "}
                                  applicants
                                </span>
                              </div>

                              <div className="mt-3 flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eef1f5]">
                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="shrink-0 text-[11.5px] tabular-nums text-[#5b6b7c]">
                                  {job.filled ?? 0}/{job.vacancies ?? 0} filled
                                </span>
                              </div>

                              <div className="mt-3 flex items-center justify-end gap-2 border-t border-[#eef1f5] pt-3">
                                <button
                                  type="button"
                                  title={`View ${job.title || "Job"}`}
                                  aria-label={`View ${job.title || "Job"}`}
                                  onClick={() =>
                                    navigate(
                                      `/admin/job-requirements/${job.id}`,
                                    )
                                  }
                                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-gradient-to-br from-[#168fa1] to-[#35b8c4] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] focus-visible:ring-offset-2"
                                >
                                  <ChevronsRight size={14} strokeWidth={2.2} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                )}
              </main>
            </div>
          </div>
        </div>
      </div>
      <StatusModal
        isOpen={Boolean(modal)}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        confirmText={modal?.confirmText}
        cancelText={modal?.cancelText}
        showCancel={modal?.showCancel}
        busy={saving}
        onConfirm={modal?.onConfirm}
        onCancel={modal?.onCancel}
      />
    </div>
  );
};

export default EmployerProfile;