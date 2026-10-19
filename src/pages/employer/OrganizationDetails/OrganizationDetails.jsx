import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronsLeft, ExternalLink, Building2 } from "lucide-react";
import { getCurrentUserId } from "../../../utils/authUtils";
import { getEmployerById } from "../../../api/employerApi";

/* ---------------- Design tokens (same as admin profile) ---------------- */
const T = {
  radius: "rounded-lg",
  border: "border-[#e3e8ee]",
  bg: "bg-[#f4f8fb]",
  text: "text-[#1a2b3c]",
  textMuted: "text-[#5b6b7c]",
  textFaint: "text-[#8895a4]",
};

const FIELD_LABEL = `text-[11.5px] font-semibold uppercase tracking-wide ${T.textFaint}`;
const FIELD_BOX = (mono) =>
  `flex h-9 items-center rounded-md border ${T.border} bg-[#fbfcfd] px-3 text-[13px] font-medium ${T.text} ${
    mono ? "font-mono text-[12.5px]" : ""
  }`;

const BTN_PRIMARY =
  "inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]";

/* ---------------- Helpers ---------------- */
const val = (v) => (v !== null && v !== undefined && String(v).trim() ? String(v).trim() : "—");

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

const getPayload = (response) => {
  const root = response?.data ?? response?.Data ?? response;
  return root?.data ?? root?.Data ?? root;
};

// Share an in-flight request between React StrictMode's development effect runs.
const employerRequests = new Map();

const getEmployerRequest = (userId) => {
  if (!employerRequests.has(userId)) {
    const request = getEmployerById(userId).then(
      (response) => {
        employerRequests.delete(userId);
        return response;
      },
      (error) => {
        employerRequests.delete(userId);
        throw error;
      },
    );
    employerRequests.set(userId, request);
  }
  return employerRequests.get(userId);
};

const normalizeEmployer = (record) => {
  if (!record) return null;
  return {
    ...record,
    EM_employer_id: record.eM_employer_id ?? record.EM_employer_id,
    EM_request_no: record.eM_request_no ?? record.EM_request_no,
    UserName: record.userName ?? record.UserName,
    Email: record.email ?? record.Email,
    Mobile: record.mobile ?? record.Mobile,
    FullName: record.fullName ?? record.FullName,
    EM_organization_name: record.eM_organization_name ?? record.EM_organization_name,
    EM_institute_type_id: record.eM_institute_type_id ?? record.EM_institute_type_id,
    EM_contact_person: record.eM_contact_person ?? record.EM_contact_person,
    EM_designation: record.eM_designation ?? record.EM_designation,
    EM_country_id: record.eM_country_id ?? record.EM_country_id,
    EM_state_id: record.eM_state_id ?? record.EM_state_id,
    EM_city_id: record.eM_city_id ?? record.EM_city_id,
    EM_website: record.eM_website ?? record.EM_website,
    EM_consent_given: record.eM_consent_given ?? record.EM_consent_given,
    EM_consent_at: record.eM_consent_at ?? record.EM_consent_at,
    EM_created_at: record.eM_created_at ?? record.EM_created_at,
    EM_updated_at: record.eM_updated_at ?? record.EM_updated_at,
    CityName: record.cityName ?? record.CityName,
    StateName: record.stateName ?? record.StateName,
    CountryName: record.countryName ?? record.CountryName,
    InstituteTypeName: record.instituteTypeName ?? record.InstituteTypeName,
    EM_created_by: record.eM_created_by ?? record.EM_created_by,
    EM_updated_by: record.eM_updated_by ?? record.EM_updated_by,
    EM_is_active: record.eM_is_active ?? record.EM_is_active,
    EM_activated_by: record.eM_activated_by ?? record.EM_activated_by,
    EM_activated_at: record.eM_activated_at ?? record.EM_activated_at,
  };
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ??
  error?.response?.data?.Message ??
  error?.message ??
  "Unable to load organization details. Please try again.";

/* ---------------- Page ---------------- */
const OrganizationDetails = () => {
  const navigate = useNavigate();

  const [employer, setEmployer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadEmployer = async () => {
      setLoading(true);
      setError("");

      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error("Your login session could not be identified. Please sign in again.");
        }

        const response = await getEmployerRequest(userId);
        const payload = getPayload(response);
        const rawRecord =
          payload?.eM_employer_id !== undefined || payload?.EM_employer_id !== undefined
            ? payload
            : payload?.employer ?? payload?.Employer ?? payload?.data ?? payload?.Data;
        const record = normalizeEmployer(rawRecord);

        if (!record || record.EM_employer_id === undefined) {
          throw new Error("The organization details were not returned by the API.");
        }

        if (!cancelled) setEmployer(record);
      } catch (err) {
        if (!cancelled) {
          setEmployer(null);
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEmployer();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className={`min-h-full ${T.bg} p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-12 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#2f6b8a] border-t-transparent" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>Loading organization…</p>
        </div>
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error || !employer) {
    return (
      <div className={`min-h-full ${T.bg} p-6`}>
        <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[#cfd9e2] bg-white p-12 text-center">
          <Building2 size={28} className="mx-auto text-[#8895a4]" />
          <p className={`mt-3 text-[14px] font-semibold ${T.text}`}>
            {error || "Organization not found"}
          </p>
          <p className={`mt-1 text-[13px] ${T.textMuted}`}>
            The details could not be loaded right now.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={`mt-4 ${BTN_PRIMARY}`}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const websiteHref = employer.EM_website
    ? `${/^https?:\/\//i.test(employer.EM_website) ? "" : "https://"}${employer.EM_website}`
    : null;

  const fields = [
    { label: "Request No.", value: employer.EM_request_no, mono: true },
    { label: "Organization Name", value: employer.EM_organization_name },
    { label: "Organization Type", value: employer.InstituteTypeName },
    { label: "Username", value: employer.UserName },
    { label: "Website", value: employer.EM_website, link: websiteHref },
    { label: "Contact Person", value: employer.EM_contact_person },
    { label: "Designation", value: employer.EM_designation },
    { label: "Email", value: employer.Email },
    { label: "Mobile", value: employer.Mobile, mono: true },
    { label: "City", value: employer.CityName },
    { label: "State", value: employer.StateName },
    { label: "Country", value: employer.CountryName },
    { label: "Consent Given", value: employer.EM_consent_given ? "Yes" : "No" },
    { label: "Consent At", value: formatDateTime(employer.EM_consent_at) },
    { label: "Created At", value: formatDateTime(employer.EM_created_at) },
    { label: "Updated At", value: formatDateTime(employer.EM_updated_at) },
    { label: "Activated At", value: formatDateTime(employer.EM_activated_at) },
    { label: "Status", value: employer.EM_is_active ? "Active" : "Inactive" },
  ];

  return (
    <div className={`min-h-full ${T.bg}`}>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
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

            <h2 className="font-semibold text-slate-800">
              {val(employer.EM_organization_name)}
            </h2>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(`/employer/organization-profile/edit/${employer.EM_employer_id}`)
            }
            className={BTN_PRIMARY}
          >
            Edit Profile
          </button>
        </div>

        {/* Body */}
        <section className="p-4">
          <div className={`${T.radius} border ${T.border} bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {fields.map((field) => (
                <div key={field.label} className="flex flex-col gap-1.5">
                  <label className={FIELD_LABEL}>{field.label}</label>
                  <div className={FIELD_BOX(field.mono)}>
                    {field.link ? (
                      <a
                        href={field.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-0 items-center gap-1 truncate text-[#1e5a7a] hover:underline"
                      >
                        {val(field.value)} <ExternalLink size={11} className="shrink-0" />
                      </a>
                    ) : (
                      <span className="min-w-0 flex-1 truncate">{val(field.value)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default OrganizationDetails;