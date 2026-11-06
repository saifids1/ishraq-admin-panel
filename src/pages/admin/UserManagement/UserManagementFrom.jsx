// src/pages/admin/users/UserManagementForm.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronsLeft,
  Loader2,
  Pencil,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useStatusToast } from "../../../components/common/StatusModalProvider";
import StatusModal from "../../../components/common/StatusModal";
import {
  createUser,
  updateUser,
  getUserById,
  getRoles,
  getApiErrorMessage,
} from "../../../api/Services/userManagementService";

/* ------------------------------ CONSTANTS ------------------------------ */

const LIST_ROUTE = "/admin/users";
const VIEW_ROUTE = (id) => `/admin/user/view/${id}`;
const EDIT_ROUTE = (id) => `/admin/user/edit/${id}`;

const EMPTY_FORM = {
  fullName: "",
  contactNumber: "",
  emailAddress: "",
  designation: "",
  password: "",
  confirmPassword: "",
  roles: [],
};

const TITLES = {
  create: "Create User",
  edit: "Edit User",
  view: "View User",
};

const PASSWORD_MIN_LENGTH = 8;

const PASSWORD_ERROR =
  "Password must be at least 8 characters long and include at least one uppercase letter (A–Z), one lowercase letter (a–z), one number (0–9), and one special character (e.g., @, #, $, %, &).";

const passwordChecks = (password) => ({
  length: password.length >= PASSWORD_MIN_LENGTH,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
  special: /[^A-Za-z0-9\s]/.test(password),
});

const isPasswordValid = (password) =>
  Object.values(passwordChecks(password)).every(Boolean);

const inputClass = (hasError) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-800 ${
    hasError
      ? "border-red-400 focus:border-red-500"
      : "border-slate-300 focus:border-[#2f6b8a]"
  }`;

/* ------------------------------ UI PIECES ------------------------------ */

const Field = ({ label, required, error, full, alignTop, children }) => (
  <div
    className={`flex flex-col gap-1.5 md:flex-row md:gap-3 ${
      alignTop ? "md:items-start" : "md:items-center"
    } ${full ? "md:col-span-2" : ""}`}
  >
    <label
      className={`text-sm font-medium text-slate-700 md:w-44 md:shrink-0 ${
        alignTop ? "md:pt-2.5" : ""
      }`}
    >
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
    <div className="min-w-0 flex-1">
      {children}
      {error && (
        <span className="mt-1 block text-xs text-red-500">{error}</span>
      )}
    </div>
  </div>
);

// Eye toggle that sits inside the right edge of a password input.
const PasswordInput = ({ show, onToggle, hasError, ...props }) => (
  <div className="relative">
    <input
      {...props}
      type={show ? "text" : "password"}
      className={`${inputClass(hasError)} pr-10`}
    />
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={show ? "Hide password" : "Show password"}
      title={show ? "Hide password" : "Show password"}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-[#2f6b8a] focus:outline-none disabled:cursor-default disabled:opacity-0"
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  </div>
);

// Live checklist shown under the password field in create mode.
const PasswordRules = ({ password }) => {
  const checks = passwordChecks(password);
  const items = [
    { ok: checks.length, text: `At least ${PASSWORD_MIN_LENGTH} characters` },
    { ok: checks.uppercase, text: "At least one uppercase letter (A–Z)" },
    { ok: checks.lowercase, text: "At least one lowercase letter (a–z)" },
    { ok: checks.number, text: "At least one number (0–9)" },
    {
      ok: checks.special,
      text: "At least one special character (e.g., @, #, $, %, &)",
    },
  ];

  return (
    <ul className="mt-2 space-y-1 flex grid grid-cols-1 gap-1 text-slate-500 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.text}
          className={`flex items-center gap-1.5 text-xs ${
            item.ok
              ? "text-emerald-600"
              : password
                ? "text-amber-600"
                : "text-slate-500"
          }`}
        >
          {item.ok ? (
            <Check size={13} strokeWidth={2.5} />
          ) : (
            <AlertTriangle size={13} strokeWidth={2.2} />
          )}
          {item.text}
        </li>
      ))}
    </ul>
  );
};

/* ------------------------------ COMPONENT ------------------------------ */

const UserManagementForm = ({ mode = "create" }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const isCreate = mode === "create";
  const isView = mode === "view";

  const [form, setForm] = useState(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [roleOptions, setRoleOptions] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingUser, setLoadingUser] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [adminId, setAdminId] = useState("");

  const [, setToast] = useStatusToast();

  /* --------------------------- LOAD ROLES --------------------------- */

  useEffect(() => {
    let active = true;

    getRoles()
      .then((roles) => {
        if (active) setRoleOptions(roles);
      })
      .catch((err) => {
        if (active) setServerError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoadingRoles(false);
      });

    return () => {
      active = false;
    };
  }, []);

  /* --------------------------- LOAD USER (edit / view) --------------------------- */

  useEffect(() => {
    if (isCreate) return undefined;

    let active = true;
    setLoadingUser(true);

    getUserById(id)
      .then((res) => {
        if (!active) return;
        const u = res.data;
        const mapped = {
          fullName: u.fullName ?? "",
          contactNumber: u.phoneNumber ?? "",
          emailAddress: u.email ?? "",
          designation: u.designation ?? "",
          password: "",
          confirmPassword: "",
          roles: Array.isArray(u.roles) ? u.roles : [],
        };
        setForm(mapped);
        setSavedForm(mapped);
        setAdminId(u.adminId ?? "");
      })
      .catch((err) => {
        if (active) setServerError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoadingUser(false);
      });

    return () => {
      active = false;
    };
  }, [id, isCreate]);

  /* --------------------------- HANDLERS --------------------------- */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const toggleRole = (role) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }));
    if (errors.roles) setErrors((er) => ({ ...er, roles: undefined }));
  };

  const validate = () => {
    const e = {};

    if (!form.fullName.trim()) {
      e.fullName = "Full name is required.";
    } else if (form.fullName.trim().length > 100) {
      e.fullName = "Maximum 100 characters.";
    }

    if (!form.contactNumber.trim()) {
      e.contactNumber = "Contact number is required.";
    } else if (!/^\+?[0-9\s-]{7,20}$/.test(form.contactNumber.trim())) {
      e.contactNumber = "Enter a valid contact number.";
    }

    if (!form.emailAddress.trim()) {
      e.emailAddress = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(form.emailAddress.trim())) {
      e.emailAddress = "Enter a valid email address.";
    }

    if (!form.designation.trim()) {
      e.designation = "Designation is required.";
    } else if (form.designation.trim().length > 100) {
      e.designation = "Maximum 100 characters.";
    }

    if (isCreate) {
      if (!form.password) {
        e.password = "Password is required.";
      } else if (!isPasswordValid(form.password)) {
        e.password = PASSWORD_ERROR;
      }

      if (!form.confirmPassword) {
        e.confirmPassword = "Please confirm your password.";
      } else if (form.confirmPassword !== form.password) {
        e.confirmPassword = "Passwords do not match.";
      }
    }

    if (form.roles.length === 0) {
      e.roles = "Select at least one role.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Validate first, then ask for confirmation. The API call happens in handleConfirm.
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isView || saving) return;

    setServerError("");
    if (!validate()) return;

    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    setServerError("");

    const payload = {
      fullName: form.fullName.trim(),
      contactNumber: form.contactNumber.trim(),
      emailAddress: form.emailAddress.trim(),
      designation: form.designation.trim(),
      roles: form.roles,
    };

    try {
      if (isCreate) {
        const res = await createUser({
          ...payload,
          password: form.password,
          confirmPassword: form.confirmPassword,
        });
        setConfirmOpen(false);
        setToast({
          id: Date.now(),
          tone: "ok",
          msg: res.message || "User created successfully.",
        });
        navigate(LIST_ROUTE, { replace: true });
      } else {
        const res = await updateUser(id, payload);
        setConfirmOpen(false);
        setToast({
          id: Date.now(),
          tone: "ok",
          msg: res.message || "User updated successfully.",
        });
        navigate(LIST_ROUTE, { replace: true });
      }
    } catch (err) {
      setConfirmOpen(false);
      setServerError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const closeConfirm = () => {
    if (!saving) setConfirmOpen(false);
  };

  const handleCancel = () => {
    setServerError("");
    if (isCreate) {
      navigate(LIST_ROUTE);
      return;
    }
    // Discard unsaved changes and return to view mode.
    setForm(savedForm);
    setErrors({});
    navigate(VIEW_ROUTE(id));
  };

  /* --------------------------- RENDER --------------------------- */

  const isLoading = loadingRoles || loadingUser;
  const isBusy = saving || isLoading;

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto max-w-[1300px]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* HEADER: back + title + admin ID */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(LIST_ROUTE)}
                title="Back"
                aria-label="Back"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#2f6b8a] text-white transition hover:bg-[#25566f]"
              >
                <ChevronsLeft size={18} strokeWidth={2} />
              </button>
              <h2 className="font-semibold text-slate-800">{TITLES[mode]}</h2>
            </div>

            {adminId && (
              <span className="inline-flex items-center rounded-md bg-[#e8f1f6] px-3 py-1 text-sm font-semibold tracking-wide text-[#2f6b8a] ring-1 ring-inset ring-[#cbe1f4]">
                {adminId}
              </span>
            )}
          </div>

          {serverError && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {serverError}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Loading user...
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="p-4">
              {/* disabled fieldset = every input is read-only in view mode */}
              <fieldset disabled={isView || saving} className="contents">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Full Name" required error={errors.fullName}>
                    <input
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="Enter full name"
                      maxLength={100}
                      className={inputClass(errors.fullName)}
                    />
                  </Field>

                  <Field
                    label="Contact Number"
                    required
                    error={errors.contactNumber}
                  >
                    <input
                      name="contactNumber"
                      value={form.contactNumber}
                      onChange={handleChange}
                      placeholder="Enter contact number"
                      className={inputClass(errors.contactNumber)}
                    />
                  </Field>

                  <Field
                    label="Email Address"
                    required
                    error={errors.emailAddress}
                  >
                    <input
                      type="email"
                      name="emailAddress"
                      value={form.emailAddress}
                      onChange={handleChange}
                      placeholder="name@company.com"
                      className={inputClass(errors.emailAddress)}
                    />
                  </Field>

                  <Field
                    label="Designation"
                    required
                    error={errors.designation}
                  >
                    <input
                      name="designation"
                      value={form.designation}
                      onChange={handleChange}
                      placeholder="Enter designation"
                      maxLength={100}
                      className={inputClass(errors.designation)}
                    />
                  </Field>

                  {isCreate && (
                    <>
                      <Field
                        label="Password"
                        required
                        error={errors.password}
                        alignTop
                      >
                        <PasswordInput
                          name="password"
                          value={form.password}
                          onChange={handleChange}
                          placeholder="Enter password"
                          autoComplete="new-password"
                          show={showPassword}
                          onToggle={() => setShowPassword((s) => !s)}
                          hasError={!!errors.password}
                        />
                        <PasswordRules password={form.password} />
                      </Field>

                      <Field
                        label="Confirm Password"
                        required
                        error={errors.confirmPassword}
                        alignTop
                      >
                        <PasswordInput
                          name="confirmPassword"
                          value={form.confirmPassword}
                          onChange={handleChange}
                          placeholder="Re-enter password"
                          autoComplete="new-password"
                          show={showConfirmPassword}
                          onToggle={() => setShowConfirmPassword((s) => !s)}
                          hasError={!!errors.confirmPassword}
                        />
                      </Field>
                    </>
                  )}

                  {/* ROLES */}
                  <Field
                    label="Roles"
                    required
                    full
                    alignTop
                    error={errors.roles}
                  >
                    <div className="mb-2 text-xs text-slate-500">
                      {form.roles.length} selected
                    </div>
                    <div
                      className={`grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-2 ${
                        errors.roles ? "border-red-400" : "border-slate-300"
                      } ${isView ? "border-slate-200 bg-slate-50" : "bg-white"}`}
                    >
                      {roleOptions.map((r) => {
                        const checked = form.roles.includes(r.role);
                        return (
                          <label
                            key={r.role}
                            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                              checked
                                ? "border-[#2f6b8a] bg-[#e8f1f6] text-[#2f6b8a]"
                                : "border-slate-200 bg-white text-slate-700"
                            } ${
                              isView || saving
                                ? "cursor-default"
                                : "cursor-pointer hover:border-[#2f6b8a] hover:bg-[#e8f1f6]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              value={r.role}
                              checked={checked}
                              onChange={() => toggleRole(r.role)}
                              className="h-4 w-4 accent-[#2f6b8a] disabled:cursor-default"
                            />
                            <span>{r.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </Field>
                </div>
              </fieldset>

              {/* FOOTER: Edit (view) OR Cancel + Create/Save (create/edit) */}
              <div
                className={`mt-6 flex gap-3 border-t border-slate-100 pt-4 ${
                  isView ? "justify-end" : "justify-between"
                }`}
              >
                {isView ? (
                  <button
                    type="button"
                    onClick={() => navigate(EDIT_ROUTE(id))}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      {saving
                        ? "Saving..."
                        : isCreate
                          ? "Create"
                          : "Save Changes"}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* CONFIRMATION POPUP — shared StatusModal */}
      {confirmOpen && (
        <StatusModal
          isOpen
          type="confirm"
          title={isCreate ? "Create user?" : "Save changes?"}
          message={
            isCreate
              ? "This will create a new admin user. Do you want to continue?"
              : "This will update the admin user. Do you want to save your changes?"
          }
          showCancel
          busy={saving}
          confirmText={isCreate ? "Yes, create" : "Yes, save"}
          onCancel={closeConfirm}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
};

export default UserManagementForm;