import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FileText as FileIcon,
  ChevronsLeft,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Download,
  Eye,
  GraduationCap,
  Briefcase,
  Wallet,
  Clock3,
  Plane,
  UserRound,
  Navigation,
} from "lucide-react";

/* Must match the key used in the Jobseeker list page */
const STORAGE_KEY = "ishraq_jobseekers";

const EMPTY_FORM = {
  fullName: "",
  mobile: "",
  whatsapp: "",
  email: "",
  jobCategory: "",
  highestQualification: "",
  speciality: "",
  professionalRegistrationNumber: "",
  totalExperience: "",
  currentDesignation: "",
  address: "",
  currentCity: "",
  state: "",
  expectedSalary: "",
  currentEmployer: "",
  currentSalary: "",
  preferredJobLocation: "",
  willingToRelocate: "",
  employmentPreference: "",
  availabilityToJoin: "",
  resume: null,
  qualificationCertificate: null,
  professionalCertificate: null,
  experienceCertificate: null,
};

const getUsers = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const AVATAR_GRADIENTS = [
  "from-[#2c6b8a] to-[#5ba6bd]",
  "from-violet-500 to-indigo-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-rose-500 to-pink-400",
  "from-sky-500 to-cyan-400",
];

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const val = (v) => (v && String(v).trim() ? v : "-");

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "preferences", label: "Location & Preferences" },
  { id: "resume", label: "Documents" },
  { id: "jobs", label: "Applied Jobs" },
];

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

const Card = ({ title, icon: Icon, children, delay = 0, className = "" }) => (
  <section
    style={{ animationDelay: `${delay}ms` }}
    className={`jp-up min-w-0 h-[63vh]  rounded-2xl border border-[#e2e8ee] bg-white p-4 shadow-sm transition duration-300 hover:shadow-md ${className}`}
  >
    <h2 className="mb-2 flex items-center gap-2.5 text-[15px] font-bold text-[#1e2b36]">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#2c6b8a] to-[#5ba6bd] text-white shadow-sm">
        <Icon size={15} />
      </span>
      {title}
    </h2>
    <div className="divide-y divide-[#eef2f6] h-[50vh] overflow-x-auto common-scrollbar">{children}</div>
  </section>
);

const Row = ({ label, value }) => (
  <div className="grid grid-cols-1 gap-0.5 py-2.5 text-[13.5px] transition-colors hover:bg-[#f7fafc] sm:grid-cols-[190px_1fr] sm:gap-3 sm:px-1.5">
    <span className="font-medium text-[#6b7a88]">{label}</span>
    <span className="min-w-0 whitespace-pre-wrap break-words font-semibold text-[#1e2b36]">
      {val(value)}
    </span>
  </div>
);

const ContactLine = ({ icon: Icon, children, href }) => {
  const inner = (
    <>
      <Icon size={14} className="mt-0.5 shrink-0 text-[#2c6b8a]" />
      <span className="min-w-0 break-words">{children}</span>
    </>
  );
  const cls = "flex items-start gap-2.5 text-[13px] font-medium text-[#34445a]";
  return href ? (
    <a
      href={href}
      className={`${cls} transition hover:text-[#2c6b8a] hover:underline`}
    >
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
};

const Tag = ({ children, i }) => (
  <span
    style={{ animationDelay: `${300 + i * 70}ms` }}
    className="jp-pop rounded-full bg-gradient-to-r from-[#e8f1f6] to-[#e3f5ec] px-3 py-1 text-[12px] font-semibold text-[#2c6b8a] ring-1 ring-[#cbe1f4]"
  >
    {children}
  </span>
);

const ResumeBox = ({ doc, big = false }) => {
  if (!doc) {
    return (
      <div className="rounded-xl border border-dashed border-[#cfd9e2] bg-[#f7f9fb] px-4 py-5 text-center text-[13px] font-medium text-[#6b7a88]">
        Not uploaded
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-[#e2e8ee] bg-[#f9fbfc] ${big ? "p-5" : "p-3"}`}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#2c6b8a] to-[#35b8c4] text-white shadow-md">
          <FileIcon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-[#1e2b36]">
            jaeheoiauwv hr8otuhqnqewrioutbv eg
          </p>
          <p className="text-[12px] text-[#6b7a88]">Resume / CV</p>
        </div>
      </div>
      {doc.url ? (
        <div className="mt-3 flex gap-2">
          <a
            href={doc.url}
            download={doc.name}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Download size={14} /> Download
          </a>
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#dce3eb] bg-white px-3 text-[13px] font-semibold text-[#34445a] transition hover:bg-[#f7f9fb]"
          >
            <Eye size={14} /> View
          </a>
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-[12px] text-[#6b7a88] ring-1 ring-[#e2e8ee]">
          File name saved. No download link is available yet.
        </p>
      )}
    </div>
  );
};

const DUMMY_JOBS = [
  {
    id: 1,
    title: "Senior React Developer",
    company: "Tech Solutions Pvt. Ltd.",
    location: "Pune, Maharashtra",
    jobType: "Full Time",
    salary: "₹8 - 12 LPA",
    status: "Interested",
    postedAt: "02 Oct 2026",
  },
  {
    id: 2,
    title: "Frontend Developer",
    company: "Innovate Technologies",
    location: "Mumbai, Maharashtra",
    jobType: "Full Time",
    salary: "₹6 - 9 LPA",
    status: "Applied",
    appliedAt: "01 Oct 2026",
  },
  {
    id: 3,
    title: "UI/UX Designer",
    company: "Creative Minds",
    location: "Remote",
    jobType: "Remote",
    salary: "₹5 - 8 LPA",
    status: "Interested",
    postedAt: "28 Sep 2026",
  },
  {
    id: 4,
    title: "Full Stack Developer",
    company: "Digital Works",
    location: "Hyderabad, Telangana",
    jobType: "Full Time",
    salary: "₹7 - 10 LPA",
    status: "Applied",
    appliedAt: "25 Sep 2026",
  },
  {
    id: 5,
    title: "Software Engineer",
    company: "Global Systems",
    location: "Bengaluru, Karnataka",
    jobType: "Hybrid",
    salary: "₹9 - 14 LPA",
    status: "Interested",
    postedAt: "20 Sep 2026",
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const JobSeekerDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    const found = getUsers().find((item) => String(item.id) === String(id));
    if (found) {
      setUser(found);
      setForm({ ...EMPTY_FORM, ...found });
    }
  }, [id]);

  const Styles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
      .jp-page { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; }
      @keyframes jp-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
      @keyframes jp-pop { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: none; } }
      @keyframes jp-fade { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }
      @keyframes jp-halo { 0%,100% { transform: scale(1); opacity: .55; } 50% { transform: scale(1.15); opacity: .15; } }
      @keyframes jp-ping { 75%,100% { transform: scale(2.4); opacity: 0; } }
      @keyframes jp-float { 50% { transform: translateY(10px) scale(1.1); } }
      @keyframes jp-bob { 50% { transform: translateY(-3px) rotate(-8deg); } }
      @keyframes jp-shift { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
      .jp-up { animation: jp-up .55s cubic-bezier(.2,.8,.2,1) both; }
      .jp-pop { animation: jp-pop .35s cubic-bezier(.3,1.4,.5,1) both; }
      .jp-tab { animation: jp-fade .35s ease both; }
      .jp-halo { animation: jp-halo 2.4s ease-in-out infinite; }
      .jp-ping { animation: jp-ping 1.6s cubic-bezier(0,0,.2,1) infinite; }
      .jp-bob { animation: jp-bob 2.6s ease-in-out infinite; }
      .jp-orb { position: absolute; border-radius: 9999px; pointer-events: none; background: rgba(255,255,255,.16); }
      .jp-orb-a { width: 86px; height: 86px; right: -24px; top: -28px; animation: jp-float 4s ease-in-out infinite; }
      .jp-orb-b { width: 56px; height: 56px; right: 34px; bottom: -32px; background: rgba(255,255,255,.10); animation: jp-float 5s ease-in-out infinite reverse; }
      .jp-hero { background-size: 200% 200%; animation: jp-shift 10s linear infinite alternate; }
      @media (prefers-reduced-motion: reduce) {
        .jp-up,.jp-pop,.jp-tab,.jp-halo,.jp-ping,.jp-bob,.jp-orb,.jp-hero { animation: none !important; }
      }
    `}</style>
  );

  const BackBtn = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      title="Back"
      aria-label="Back"
      className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <ChevronsLeft size={18} strokeWidth={2} />
    </button>
  );

  if (!user) {
    return (
      <div className="jp-page min-h-full bg-[#f7f9fb]">
        {Styles}
        <div className="rounded-2xl bg-gradient-to-r from-[#17405a] to-[#4a9bb3] p-4">
          {BackBtn}
        </div>
        <p className="px-4 py-12 text-center text-[#6b7a88]">
          This jobseeker was not found.
        </p>
      </div>
    );
  }

  const active = user.status === "Active";
  const exp = /^\d+(\.\d+)?$/.test(String(form.totalExperience).trim())
    ? `${form.totalExperience} yrs`
    : val(form.totalExperience);
  const location = [form.currentCity, form.state].filter(Boolean).join(", ");
  const tags = [
    form.jobCategory,
    form.speciality,
    form.employmentPreference,
    form.availabilityToJoin,
  ].filter(Boolean);
  const wa = (form.whatsapp || "").replace(/\D/g, "");

  const documents = [
    { label: "Resume", doc: form.resume },
    { label: "Qualification Certificate", doc: form.qualificationCertificate },
    { label: "Professional Certificate", doc: form.professionalCertificate },
    { label: "Experience Certificate", doc: form.experienceCertificate },
  ];

  return (
    <div className="jp-page min-h-full bg-[#f7f9fb] text-[#1e2b36]">
      {Styles}

      {/* HERO HEADER */}
      <header
        className="jp-hero relative mb-4 overflow-hidden rounded-2xl p-4 text-white shadow-sm sm:px-4 sm:py-2"
        style={{
          backgroundImage:
            "linear-gradient(110deg,#17405a 0%,#2f6b8a 40%,#4a9bb3 70%,#2f6b8a 100%)",
        }}
      >
        <span className="jp-orb jp-orb-a !h-40 !w-40" />
        <span className="jp-orb jp-orb-b !h-24 !w-24" />
        <div className="relative flex flex-wrap items-center gap-3.5">
          {BackBtn}
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-[22px] font-extrabold tracking-tight sm:text-[26px]">
              Jobseeker Details
            </h1>
          </div>
          <span
            className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[12.5px] font-bold text-white shadow-md ring-1 ring-inset ${
              active
                ? "bg-emerald-600 ring-emerald-700"
                : "bg-rose-600 ring-rose-700"
            }`}
          >
            <span className="relative flex h-2 w-2">
              {active && (
                <span className="jp-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            {user.status}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        {/* SIDEBAR */}
        <aside className="jp-up h-[73vh] overflow-hidden rounded-2xl border border-[#e2e8ee] bg-white shadow-sm lg:sticky lg:top-3">
          <div className="h-20 bg-gradient-to-r from-[#2c6b8a] via-[#4a9bb3] to-[#73c8a4]" />
          <div className="px-4 pb-4">
            <div className="relative -mt-11 flex flex-col items-center text-center">
              <div className="relative grid h-[150px] w-[150px] place-items-center">
                <span
                  className={`jp-halo absolute inset-0 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[user.id % AVATAR_GRADIENTS.length]}`}
                />
                <span
                  className={`relative grid h-[140px] w-[140px] place-items-center rounded-full bg-gradient-to-br ${
                    AVATAR_GRADIENTS[user.id % AVATAR_GRADIENTS.length]
                  } text-[26px] font-extrabold text-white shadow-lg ring-4 ring-white`}
                >
                  {initials(form.fullName) || <UserRound size={30} />}
                </span>
              </div>
              <h2 className="mt-2.5 text-[17px] font-extrabold text-[#1e2b36]">
                {val(form.fullName)}
              </h2>
              <p className="text-[13px] font-medium text-[#6b7a88]">
                {val(form.currentDesignation)}
              </p>
            </div>

            <div className="mt-4 space-y-2.5 border-t border-[#eef2f6] pt-4">
              <ContactLine
                icon={Mail}
                href={form.email ? `mailto:${form.email}` : undefined}
              >
                {val(form.email)}
              </ContactLine>
              <ContactLine
                icon={Phone}
                href={
                  form.mobile
                    ? `tel:${form.mobile.replace(/\s/g, "")}`
                    : undefined
                }
              >
                {val(form.mobile)}
              </ContactLine>
              <ContactLine icon={MapPin}>{val(location)}</ContactLine>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="min-w-0">
          {/* TABS */}
          <div
            role="tablist"
            aria-label="Profile sections"
            className="mb-4  flex gap-1 overflow-x-auto rounded-xl border border-[#e2e8ee] bg-white p-1 shadow-sm"
          >
            {TABS.map((t) => {
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(t.id)}
                  className={`relative shrink-0 cursor-pointer rounded-lg px-4 py-2 text-[13px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6b8a] ${
                    on
                      ? "bg-gradient-to-r from-[#2c6b8a] to-[#3b86a6] text-white shadow-sm"
                      : "text-[#53677f] hover:bg-[#f2f6f9]"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* PANELS (key re-triggers the animation on every tab change) */}
          <div key={tab} className="jp-tab ">
            {tab === "overview" && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card title="Personal Details" icon={UserRound} delay={0}>
                  <Row label="Full Name" value={form.fullName} />
                  <Row label="Mobile Number" value={form.mobile} />
                  <Row label="WhatsApp Number" value={form.whatsapp} />
                  <Row label="Email Address" value={form.email} />
                </Card>

                <Card
                  title="Professional Details"
                  icon={GraduationCap}
                  delay={90}
                >
                  <Row
                    label="Profession / Job Category"
                    value={form.jobCategory}
                  />
                  <Row
                    label="Highest Qualification"
                    value={form.highestQualification}
                  />
                  <Row
                    label="Speciality / Department"
                    value={form.speciality}
                  />
                  <Row
                    label="Professional Registration Number"
                    value={form.professionalRegistrationNumber}
                  />
                  <Row
                    label="Total Experience (Years)"
                    value={form.totalExperience}
                  />
                  <Row
                    label="Current Designation"
                    value={form.currentDesignation}
                  />
                  <Row label="Current Employer" value={form.currentEmployer} />
                  <Row label="Current Salary" value={form.currentSalary} />
                </Card>
              </div>
            )}

            {tab === "preferences" && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card title="Location" icon={MapPin} delay={0}>
                  <Row label="Address" value={form.address} />
                  <Row label="Current City" value={form.currentCity} />
                  <Row label="State" value={form.state} />
                  <Row
                    label="Preferred Job Location"
                    value={form.preferredJobLocation}
                  />
                </Card>

                <Card title="Preferences" icon={Navigation} delay={90}>
                  <Row label="Expected Salary" value={form.expectedSalary} />
                  <Row
                    label="Willing to Relocate?"
                    value={form.willingToRelocate}
                  />
                  <Row
                    label="Employment Preference"
                    value={form.employmentPreference}
                  />
                  <Row
                    label="Availability to Join"
                    value={form.availabilityToJoin}
                  />
                </Card>
              </div>
            )}

            {tab === "resume" && (
              <Card title="Uploaded Documents" icon={FileIcon}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {documents.map(({ label, doc }) => (
                    <div key={label} className="space-y-2">
                      <h3 className="text-sm font-semibold text-[#17405a]">
                        {label}
                      </h3>
                      <ResumeBox doc={doc} big />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {tab === "jobs" && (
              <div className="space-y-4">
                {/* Job list */}
                <section className="rounded-2xl border border-[#e2e8ee] bg-white p-4 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-[16px] font-bold text-[#1e2b36]">
                      Applied Jobs
                    </h2>
                    <span className="rounded-full bg-[#e8f1f6] px-3 py-1 text-xs font-semibold text-[#2c6b8a]">
                      {DUMMY_JOBS.length} Jobs
                    </span>
                  </div>

                  <div className="space-y-3 h-[51vh] overflow-y-auto common-scrollbar">
                    {DUMMY_JOBS.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-xl border border-[#e2e8ee] p-4 transition hover:border-[#9fc5d8] hover:shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#2c6b8a] to-[#5ba6bd] text-white">
                              <Briefcase size={19} />
                            </div>

                            <div className="min-w-0">
                              <h3 className="break-words text-[14px] font-bold text-[#1e2b36]">
                                {job.title}
                              </h3>
                              <p className="mt-1 text-[13px] font-medium text-[#53677f]">
                                {job.company}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold text-white ${
                              job.status === "Applied"
                                ? "bg-emerald-600"
                                : "bg-amber-500"
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-medium text-[#6b7a88]">
                          <span className="flex items-center gap-1.5">
                            <MapPin size={14} />
                            {job.location}
                          </span>

                          <span className="flex items-center gap-1.5">
                            <Briefcase size={14} />
                            {job.jobType}
                          </span>

                          <span className="flex items-center gap-1.5">
                            <Wallet size={14} />
                            {job.salary}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#eef2f6] pt-3">
                          <p className="text-[12px] text-[#6b7a88]">
                            {job.status === "Applied"
                              ? `Applied on: ${job.appliedAt}`
                              : `Posted on: ${job.postedAt}`}
                          </p>

                          <span className="text-[12px] font-semibold text-[#2c6b8a]">
                            {job.status === "Applied"
                              ? "Application submitted"
                              : "Job saved as interested"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default JobSeekerDetails;
