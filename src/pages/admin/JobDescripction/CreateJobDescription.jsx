// src/pages/admin/job/CreateJobDescription.jsx
import React from "react";
import { ChevronDown, ChevronsLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ---------- shared input/select styles ---------- */
const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10";

const textareaClass =
  "w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10";

const FIELD_LABEL = "text-[13px] font-semibold text-black leading-tight";

const FieldRow = ({ label, required, children, fullWidth }) => (
  <div
    className={`grid grid-cols-1 gap-1.5 sm:grid-cols-[180px_1fr] sm:items-start sm:gap-3 ${
      fullWidth ? "md:col-span-2" : ""
    }`}
  >
    <label className={`${FIELD_LABEL} sm:pt-2`}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="min-w-0">{children}</div>
  </div>
);

/* --------------------------- STATIC OPTIONS --------------------------- */

const ORGANIZATION_TYPES = [
  "Hospital",
  "Clinic",
  "Pharmacy",
  "Diagnostics",
  "Home Care",
  "Medical College",
  "Corporate",
  "Other",
];

const JOB_CATEGORIES = [
  "Nursing",
  "Medical",
  "Pharmacy",
  "Diagnostics",
  "Administration",
  "IT & Software",
  "Sales & Marketing",
  "Other",
];

const JOB_ROLES = [
  "Staff Nurse",
  "Senior Staff Nurse",
  "Doctor",
  "Pharmacist",
  "Lab Technician",
  "Receptionist",
  "HR Executive",
  "Other",
];

const EMPLOYMENT_TYPES = [
  "Full Time",
  "Part Time",
  "Contract",
  "Internship",
  "Remote",
  "Hybrid",
  "On Site",
];

const JOB_STATUSES = ["Active", "Draft", "Paused", "Closed"];

const COUNTRIES = ["India", "United Arab Emirates", "Saudi Arabia"];

const STATES = ["Maharashtra", "Karnataka", "Delhi"];

const CITIES = ["Mumbai", "Bengaluru", "New Delhi"];

/* ----------------------------- COMPONENT ----------------------------- */

const CreateJobDescription = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                title="Back"
                aria-label="Back"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6b8a] focus-visible:ring-offset-2"
              >
                <ChevronsLeft size={18} strokeWidth={2} />
              </button>
              <h2 className="truncate font-semibold text-slate-800">
                Create Job Description
              </h2>
            </div>
          </div>

          {/* FORM */}
          <form className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
              {/* Organization Name */}
              <FieldRow label="Organization Name" required>
                <input
                  type="text"
                  placeholder="e.g. XYZ Pharma Pvt. Ltd."
                  className={inputClass}
                />
              </FieldRow>

              {/* Organization Type */}
              <FieldRow label="Organization Type" required>
                <div className="relative">
                  <select className={selectClass}>
                    <option value="">Select Organization Type</option>
                    {ORGANIZATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </FieldRow>

              {/* Job Category */}
              <FieldRow label="Job Category" required>
                <div className="relative">
                  <select className={selectClass}>
                    <option value="">Select Job Category</option>
                    {JOB_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </FieldRow>

              {/* Job Role */}
              <FieldRow label="Job Role" required>
                <div className="relative">
                  <select className={selectClass}>
                    <option value="">Select Job Role</option>
                    {JOB_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </FieldRow>

              {/* Employment Type */}
              <FieldRow label="Employment Type" required>
                <div className="relative">
                  <select className={selectClass}>
                    <option value="">Select Employment Type</option>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </FieldRow>

              {/* Position Required */}
              <FieldRow label="Position Required" required>
                <input
                  type="text"
                  placeholder="e.g. Senior Staff Nurse"
                  className={inputClass}
                />
              </FieldRow>

              {/* Number of Vacancies */}
              <FieldRow label="Number of Vacancies" required>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 5"
                  className={inputClass}
                />
              </FieldRow>

              {/* Qualification Required */}
              <FieldRow label="Qualification Required" required>
                <input
                  type="text"
                  placeholder="e.g. B.Sc Nursing"
                  className={inputClass}
                />
              </FieldRow>

              {/* Experience Required */}
              <FieldRow label="Experience Required" required>
                <input
                  type="text"
                  placeholder="e.g. 3-5 years"
                  className={inputClass}
                />
              </FieldRow>

              {/* Country */}
              <FieldRow label="Country" required>
                <div className="relative">
                  <select className={selectClass}>
                    <option value="">Select Country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </FieldRow>

              {/* State */}
              <FieldRow label="State" required>
                <div className="relative">
                  <select className={selectClass}>
                    <option value="">Select State</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </FieldRow>

              {/* City */}
              <FieldRow label="City" required>
                <div className="relative">
                  <select className={selectClass}>
                    <option value="">Select City</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </FieldRow>

              {/* Status */}
              <FieldRow label="Status" required>
                <div className="relative">
                  <select className={selectClass}>
                    {JOB_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </FieldRow>

              {/* Description */}
              <FieldRow label="Job Description" required fullWidth>
                <textarea
                  rows={5}
                  placeholder="Describe the role, responsibilities, and expectations..."
                  className={textareaClass}
                />
              </FieldRow>
            </div>

            {/* FOOTER */}
            <div className="mt-6 flex flex-col-reverse gap-2.5 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] sm:w-auto"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateJobDescription;