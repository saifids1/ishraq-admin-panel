import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronsLeft, Eye, EyeOff } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import jobseekerApi from "../../../api/Services/adjobseekerApi";
import jobCategoryApi from "../../../api/Services/jobCategoryApi";
import instituteTypeApi from "../../../api/Services/instituteTypeApi";
import jobRoleApi from "../../../api/Services/jobRoleApi";
import countryMasterApi from "../../../api/Services/countryMasterApi";
import stateMasterApi from "../../../api/Services/stateMasterApi";
import cityMasterApi from "../../../api/Services/cityMasterApi";
import { getApiErrorMessage } from "../../../api/utils/apiHelpers";
import StatusModal from "../../../components/common/StatusModal";
import { getCurrentUserId2 } from "../../../utils/authUtils";

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-2 focus:ring-[#2f6b8a]/10 disabled:bg-slate-50 disabled:text-slate-500";

const FIELD_LABEL = "text-[13px] font-semibold text-black leading-tight";

/* ---------------- Lookup key mappings (tolerant of API casing) ---------------- */
const COUNTRY_ID_KEYS = ["cM_Id", "CM_Id", "id"];
const COUNTRY_NAME_KEYS = ["cM_CountryName", "CM_CountryName", "countryName", "name"];
const STATE_ID_KEYS = ["sM_Id", "SM_Id", "id"];
const STATE_NAME_KEYS = ["sM_StateName", "SM_StateName", "stateName", "name"];
const CITY_ID_KEYS = ["ctM_Id", "CTM_Id", "id"];
const CITY_NAME_KEYS = ["ctM_CityName", "CTM_CityName", "cityName", "name"];
const INSTITUTE_ID_KEYS = ["iT_institute_type_id", "IT_institute_type_id", "id"];
const INSTITUTE_NAME_KEYS = ["iT_name", "IT_name", "name"];

const FieldRow = ({ label, required, error, children, fullWidth }) => (
  <div
    className={`flex flex-col gap-1 sm:grid sm:grid-cols-[160px_1fr] sm:items-start sm:gap-3 ${
      fullWidth ? "md:col-span-2" : ""
    }`}
  >
    <label className={`${FIELD_LABEL} sm:pt-2 text-left`}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="min-w-0">
      {children}
      {error && (
        <span className="mt-1 block text-xs text-red-500">{error}</span>
      )}
    </div>
  </div>
);

const DOCUMENT_BASE_URL = (process.env.REACT_APP_DOCUMENT_BASE_URL || "").trim();

const toAbsoluteUrl = (url) => {
  if (!url) return url;
  const raw = String(url).trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  let clean = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  clean = clean.replace(/^wwwroot\//i, "");
  clean = clean.replace(/^api\//i, "");
  clean = clean.replace(/^\/+/, "");

  if (!DOCUMENT_BASE_URL) return `/${clean}`;
  return `${DOCUMENT_BASE_URL.replace(/\/+$/, "")}/${clean}`;
};

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

const extractRecord = (response) => {
  const root = response?.data ?? response;
  const record = root?.data ?? root?.Data ?? root;
  return record && typeof record === "object" && !Array.isArray(record)
    ? record
    : null;
};

/**
 * Normalize a lookup list into `{ id, name }` so selects never crash on
 * malformed items and every dropdown reads the same shape.
 */
const normalizeLookup = (list, idKeys, nameKeys) =>
  (Array.isArray(list) ? list : [])
    .map((item) => ({
      id: idKeys.map((k) => item?.[k]).find((v) => v != null),
      name: nameKeys.map((k) => item?.[k]).find((v) => v != null),
    }))
    .filter((item) => item.id != null && item.name != null);

const firstValue = (item, ...keys) =>
  keys
    .map((key) => item?.[key])
    .find((value) => value !== undefined && value !== null) ?? "";

const EMPTY_FORM = {
  fullName: "",
  email: "",
  mobile: "",
  whatsapp: "",
  password: "",
  instituteType: "",
  instituteTypeName: "",
  jobCategory: "",
  jobCategoryName: "",
  jobRole: "",
  jobRoleName: "",
  countryId: "",
  countryName: "",
  stateId: "",
  stateName: "",
  cityId: "",
  cityName: "",
  highestQualification: "",
  speciality: "",
  registrationNumber: "",
  totalExperience: "",
  currentDesignation: "",
  currentEmployer: "",
  currentSalary: "",
  expectedSalary: "",
  preferredLocation: "",
  preferredLocationName: "",
  willingToRelocate: false,
  availabilityToJoin: "",
  consentGiven: false,
  isActive: false,
  document: null,
};

const toForm = (item) => ({
  ...EMPTY_FORM,
  fullName: firstValue(item, "fullName", "JB_full_name"),
  email: firstValue(item, "email", "Email"),
  mobile: firstValue(item, "mobile", "JB_mobile"),
  whatsapp: firstValue(item, "jB_whatsapp", "JB_whatsapp"),
  instituteType: String(firstValue(item, "jB_institute_type_id")),
  instituteTypeName: firstValue(item, "instituteTypeName"),
  jobCategory: String(firstValue(item, "jB_job_category_id")),
  jobCategoryName: firstValue(item, "jobCategoryName"),
  jobRole: String(firstValue(item, "jB_job_role_id")),
  jobRoleName: firstValue(item, "jobRoleName"),
  countryId: String(firstValue(item, "jB_country_id")),
  countryName: firstValue(item, "countryName"),
  stateId: String(firstValue(item, "jB_state_id")),
  stateName: firstValue(item, "stateName"),
  cityId: String(firstValue(item, "jB_city_id")),
  cityName: firstValue(item, "cityName"),
  highestQualification: firstValue(item, "jB_highest_qualification"),
  speciality: firstValue(item, "jB_speciality"),
  registrationNumber: firstValue(item, "jB_registration_number"),
  totalExperience: firstValue(item, "jB_total_experience"),
  currentDesignation: firstValue(item, "jB_current_designation"),
  currentEmployer: firstValue(item, "jB_current_employer"),
  currentSalary: firstValue(item, "jB_current_salary"),
  expectedSalary: firstValue(item, "jB_expected_salary"),
  preferredLocation: String(firstValue(item, "jB_preferred_location")),
  preferredLocationName: firstValue(item, "jB_preferred_locationName"),
  willingToRelocate: item?.jB_willing_to_relocate === true,
  availabilityToJoin: firstValue(item, "jB_availability_to_join")
    ? String(firstValue(item, "jB_availability_to_join")).slice(0, 10)
    : "",
  consentGiven: item?.jB_consent_given === true,
  isActive: item?.jB_is_active === true,

  document: (() => {
    const path = firstValue(item, "jB_cv_file_path");
    if (!path) return null;
    const name = String(path).split(/[\\/]/).pop();
    return { name: name || "Resume / CV", url: toAbsoluteUrl(path) };
  })(),
});

const MAX_FILE_MB = 5;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const validate = (form, isCreate) => {
  const errors = {};

  if (!form.fullName.trim()) errors.fullName = "Full name is required";

  const digits = form.mobile.replace(/\D/g, "");
  if (!form.mobile.trim()) {
    errors.mobile = "Mobile number is required";
  } else if (digits.length < 10 || digits.length > 15) {
    errors.mobile = "Enter a valid mobile number, 10 to 15 digits";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (isCreate && !form.password.trim()) {
    errors.password = "Password is required";
  } else if (form.password && form.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (!form.instituteType) errors.instituteType = "Select an institute type";
  if (!form.jobCategory) errors.jobCategory = "Select a profession";
  if (!form.jobRole) errors.jobRole = "Select a job role";
  if (!form.countryId) errors.countryId = "Select a country";
  if (!form.stateId) errors.stateId = "Select a state";
  if (!form.cityId) errors.cityId = "Select a city";

  if (isCreate && !form.document) {
    errors.document = "Upload a document";
  }

  if (isCreate && !form.consentGiven) {
    errors.consentGiven = "You must give consent to continue";
  }

  return errors;
};

const AddJobSeeker = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isCreate = mode === "create" || !id;

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loadingRecord, setLoadingRecord] = useState(!isCreate);
  const [showPassword, setShowPassword] = useState(false);
  const [modal, setModal] = useState(null);

  const fileRef = useRef(null);

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

  const [instituteTypes, setInstituteTypes] = useState([]);
  const [loadingInstituteTypes, setLoadingInstituteTypes] = useState(true);
  const [jobCategories, setJobCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [jobRoles, setJobRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [roleError, setRoleError] = useState("");

  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [states, setStates] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [locationError, setLocationError] = useState("");

  /* Level 1: countries (once on mount) */
  useEffect(() => {
    let cancelled = false;
    const loadCountries = async () => {
      setLoadingCountries(true);
      setLocationError("");
      try {
        const response = await countryMasterApi.getAllList();
        if (!cancelled) {
          setCountries(
            normalizeLookup(
              extractList(response),
              COUNTRY_ID_KEYS,
              COUNTRY_NAME_KEYS,
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setLocationError(
            getApiErrorMessage(err) || "Unable to load countries.",
          );
        }
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    };
    loadCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Level 2: states for the selected country (GET /StateMaster/all?countryId=) */
  useEffect(() => {
    let cancelled = false;
    setStates([]);

    if (!form.countryId) {
      setLoadingStates(false);
      return undefined;
    }

    const loadStates = async () => {
      setLoadingStates(true);
      setLocationError("");
      try {
        const response = await stateMasterApi.getByCountry(
          Number(form.countryId),
        );
        if (!cancelled) {
          setStates(
            normalizeLookup(
              extractList(response),
              STATE_ID_KEYS,
              STATE_NAME_KEYS,
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setLocationError(getApiErrorMessage(err) || "Unable to load states.");
        }
      } finally {
        if (!cancelled) setLoadingStates(false);
      }
    };

    loadStates();
    return () => {
      cancelled = true;
    };
  }, [form.countryId]);

  /* Level 3: cities for the selected state (GET /CityMaster/all?stateId=) */
  useEffect(() => {
    let cancelled = false;
    setCities([]);

    if (!form.stateId) {
      setLoadingCities(false);
      return undefined;
    }

    const loadCities = async () => {
      setLoadingCities(true);
      setLocationError("");
      try {
        const response = await cityMasterApi.getByState(Number(form.stateId));
        if (!cancelled) {
          setCities(
            normalizeLookup(
              extractList(response),
              CITY_ID_KEYS,
              CITY_NAME_KEYS,
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setLocationError(getApiErrorMessage(err) || "Unable to load cities.");
        }
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    };

    loadCities();
    return () => {
      cancelled = true;
    };
  }, [form.stateId]);

  useEffect(() => {
    let cancelled = false;

    const loadInstituteTypes = async () => {
      setLoadingInstituteTypes(true);
      setCategoryError("");
      try {
        const response = await instituteTypeApi.getAllList();
        if (!cancelled) {
          setInstituteTypes(
            normalizeLookup(
              extractList(response),
              INSTITUTE_ID_KEYS,
              INSTITUTE_NAME_KEYS,
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setCategoryError(
            getApiErrorMessage(err) ||
              "Unable to load institute types. Check the API connection.",
          );
        }
      } finally {
        if (!cancelled) setLoadingInstituteTypes(false);
      }
    };

    loadInstituteTypes();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setJobCategories([]);
    setJobRoles([]);

    if (!form.instituteType) {
      setLoadingCategories(false);
      return undefined;
    }

    const loadJobCategories = async () => {
      setLoadingCategories(true);
      setCategoryError("");
      try {
        const response = await jobCategoryApi.getByInstituteType(
          Number(form.instituteType),
        );
        if (!cancelled) {
          setJobCategories(
            extractList(response)
              .map((item) => ({
                id: firstValue(item, "jC_job_category_id", "JC_job_category_id"),
                name: firstValue(item, "jC_name", "JC_name", "name"),
              }))
              .filter((category) => category.id && category.name),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setJobCategories([]);
          setCategoryError(
            getApiErrorMessage(err) || "Unable to load professions.",
          );
        }
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };

    loadJobCategories();
    return () => {
      cancelled = true;
    };
  }, [form.instituteType]);

  useEffect(() => {
    let cancelled = false;
    setJobRoles([]);

    if (!form.jobCategory) {
      setLoadingRoles(false);
      return undefined;
    }

    const loadJobRoles = async () => {
      setLoadingRoles(true);
      setRoleError("");
      try {
        const response = await jobRoleApi.getByJobCategory(
          Number(form.jobCategory),
        );
        if (!cancelled) {
          setJobRoles(
            extractList(response)
              .map((item) => ({
                id: firstValue(item, "jR_job_role_id", "JR_job_role_id"),
                name: firstValue(item, "jR_name", "JR_name", "name"),
              }))
              .filter((role) => role.id && role.name),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setJobRoles([]);
          setRoleError(getApiErrorMessage(err) || "Unable to load job roles.");
        }
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    };

    loadJobRoles();
    return () => {
      cancelled = true;
    };
  }, [form.jobCategory]);

  /* Edit mode: load the record. Setting countryId/stateId/cityId here
     triggers the chained state and city loads above. */
  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;
    const loadRecord = async () => {
      setLoadingRecord(true);
      setServerError("");
      try {
        const response = await jobseekerApi.getById(id);
        const item = extractRecord(response);
        if (!item) throw new Error("Jobseeker details were not found.");
        if (!cancelled) setForm(toForm(item));
      } catch (err) {
        if (!cancelled) {
          setServerError(
            getApiErrorMessage(err) || "Unable to load jobseeker details.",
          );
        }
      } finally {
        if (!cancelled) setLoadingRecord(false);
      }
    };

    loadRecord();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((c) => ({ ...c, [key]: value }));
    setErrors((c) => ({ ...c, [key]: undefined }));
  };

  const setMasterData = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "instituteType"
        ? { jobCategory: "", jobRole: "", jobCategoryName: "", jobRoleName: "" }
        : {}),
      ...(key === "jobCategory"
        ? { jobRole: "", jobCategoryName: "", jobRoleName: "" }
        : {}),
    }));
    setErrors((current) => ({
      ...current,
      [key]: undefined,
      ...(key === "instituteType"
        ? { jobCategory: undefined, jobRole: undefined }
        : {}),
      ...(key === "jobCategory" ? { jobRole: undefined } : {}),
    }));
  };

  /* Clears child selections when a parent changes so stale IDs are never saved */
  const setLocation = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "countryId" ? { stateId: "", cityId: "" } : {}),
      ...(key === "stateId" ? { cityId: "" } : {}),
    }));
    setErrors((current) => ({
      ...current,
      [key]: undefined,
      ...(key === "countryId" ? { stateId: undefined, cityId: undefined } : {}),
      ...(key === "stateId" ? { cityId: undefined } : {}),
    }));
  };

  const onMobile = (e) => {
    const clean = e.target.value.replace(/[^\d+\s]/g, "");
    setForm((c) => ({ ...c, mobile: clean }));
    setErrors((c) => ({ ...c, mobile: undefined }));
  };

  const onWhatsapp = (e) => {
    const clean = e.target.value.replace(/[^\d+\s]/g, "");
    setForm((c) => ({ ...c, whatsapp: clean }));
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((c) => ({
        ...c,
        document: "Only PDF, JPG, PNG, DOC or DOCX files are allowed",
      }));
      return;
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrors((c) => ({
        ...c,
        document: `File must be smaller than ${MAX_FILE_MB} MB`,
      }));
      return;
    }

    setForm((c) => ({
      ...c,
      document: { name: file.name, url: URL.createObjectURL(file), file },
    }));
    setErrors((c) => ({ ...c, document: undefined }));
  };

  const save = async () => {
    setServerError("");
    try {
      setSaving(true);

      const currentUserId = Number(getCurrentUserId2());
      if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
        throw new Error(
          "Unable to identify the current user. Please sign in again.",
        );
      }

      const payload = {
        JB_jobseeker_id: Number(id) || 0,
        JB_full_name: form.fullName.trim(),
        Email: form.email.trim(),
        ...(isCreate ? { Password: form.password.trim() } : {}),
        JB_mobile: form.mobile.replace(/\D/g, ""),
        JB_whatsapp: (form.whatsapp || form.mobile).replace(/\D/g, ""),
        JB_city_id: Number(form.cityId) || 0,
        JB_state_id: Number(form.stateId) || 0,
        JB_country_id: Number(form.countryId) || 0,
        JB_institute_type_id: Number(form.instituteType) || 0,
        JB_job_category_id: Number(form.jobCategory) || 0,
        JB_job_role_id: Number(form.jobRole) || 0,
        JB_highest_qualification: form.highestQualification.trim(),
        JB_speciality: form.speciality.trim(),
        JB_registration_number: form.registrationNumber.trim(),
        JB_total_experience: Number(form.totalExperience) || 0,
        JB_current_designation: form.currentDesignation.trim(),
        JB_current_employer: form.currentEmployer.trim(),
        JB_current_salary: Number(form.currentSalary) || 0,
        JB_expected_salary: Number(form.expectedSalary) || 0,
        JB_preferred_location: Number(form.preferredLocation) || 0,
        JB_willing_to_relocate: Boolean(form.willingToRelocate),
        JB_availability_to_join: form.availabilityToJoin
          ? `${form.availabilityToJoin}T00:00:00`
          : null,
        JB_consent_given: Boolean(form.consentGiven),

        JB_created_by: currentUserId,
        JB_updated_by: currentUserId,
        jB_created_by: currentUserId,
        jB_updated_by: currentUserId,
      };

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        formData.append(key, String(value));
      });

      if (form.document?.file) {
        formData.append("CVFile", form.document.file, form.document.file.name);
      }

      const response = isCreate
        ? await jobseekerApi.create(formData)
        : await jobseekerApi.update(id, formData);

      openStatus(
        isCreate ? "success" : "update",
        response?.data?.message ||
          response?.data?.Message ||
          `Job seeker ${isCreate ? "created" : "updated"} successfully.`,
        {
          confirmText: "Continue",
          onConfirm: () => navigate("/admin/jobseekers"),
        },
      );
    } catch (err) {
      const msg =
        getApiErrorMessage(err) ||
        `Failed to ${isCreate ? "create" : "update"} job seeker. Please try again.`;
      setServerError(msg);
      openStatus("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;

    setServerError("");
    const foundErrors = validate(form, isCreate);

    if (
      form.jobCategory &&
      !jobCategories.some(
        (category) => String(category.id) === String(form.jobCategory),
      )
    ) {
      foundErrors.jobCategory =
        "Select a profession for the selected institute type.";
    }
    if (
      form.jobRole &&
      !jobRoles.some((role) => String(role.id) === String(form.jobRole))
    ) {
      foundErrors.jobRole = "Select a job role for the selected profession.";
    }

    /* Location: each value must exist in the list loaded for its parent.
       Skipped while a list is still loading, since it would be empty. */
    if (
      form.countryId &&
      !loadingCountries &&
      !countries.some((c) => String(c.id) === String(form.countryId))
    ) {
      foundErrors.countryId = "Select a valid country.";
    }
    if (
      form.stateId &&
      !loadingStates &&
      !states.some((s) => String(s.id) === String(form.stateId))
    ) {
      foundErrors.stateId = "Select a state for the selected country.";
    }
    if (
      form.cityId &&
      !loadingCities &&
      !cities.some((c) => String(c.id) === String(form.cityId))
    ) {
      foundErrors.cityId = "Select a city for the selected state.";
    }

    if (Object.keys(foundErrors).length) {
      setErrors(foundErrors);
      openStatus(
        "warning",
        Object.values(foundErrors)[0] ||
          "Please correct the highlighted fields.",
      );
      return;
    }

    if (!isCreate) {
      openConfirm({
        title: "Confirm update",
        message: "Are you sure you want to update this job seeker?",
        confirmText: "Update",
        onConfirm: save,
      });
      return;
    }
    await save();
  };

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
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
                {isCreate ? "Add User" : "Edit User"}
              </h2>
            </div>
          </div>

          {serverError && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {serverError}
            </div>
          )}

          {loadingRecord ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading jobseeker details...
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="p-4 space-y-6">
              <section>
                <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                  Personal Details
                </h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow label="Full Name" required error={errors.fullName}>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={set("fullName")}
                      disabled={saving}
                      placeholder="Your full name"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Email" required error={errors.email}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      disabled={saving}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </FieldRow>

                  {isCreate && (
                    <FieldRow label="Password" required error={errors.password}>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={set("password")}
                          disabled={saving}
                          placeholder="Minimum 6 characters"
                          className={`${inputClass} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          disabled={saving}
                          title={
                            showPassword ? "Hide password" : "Show password"
                          }
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {showPassword ? (
                            <EyeOff size={17} strokeWidth={2} />
                          ) : (
                            <Eye size={17} strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    </FieldRow>
                  )}

                  <FieldRow label="Mobile Number" required error={errors.mobile}>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={form.mobile}
                      onChange={onMobile}
                      disabled={saving}
                      placeholder="+91 98765 43210"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="WhatsApp Number">
                    <input
                      type="tel"
                      inputMode="tel"
                      value={form.whatsapp}
                      onChange={onWhatsapp}
                      disabled={saving}
                      placeholder="Same as mobile if left blank"
                      className={inputClass}
                    />
                  </FieldRow>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                  Professional Details
                </h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow
                    label="Institute Type"
                    required
                    error={errors.instituteType}
                  >
                    <div className="relative">
                      <select
                        value={form.instituteType}
                        onChange={setMasterData("instituteType")}
                        disabled={saving || loadingInstituteTypes}
                        className={selectClass}
                      >
                        <option value="">
                          {loadingInstituteTypes
                            ? "Loading institute types..."
                            : "Select Institute Type"}
                        </option>
                        {instituteTypes.map((item) => (
                          <option key={item.id} value={String(item.id)}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                    </div>
                  </FieldRow>

                  <FieldRow
                    label="Job Category"
                    required
                    error={errors.jobCategory || categoryError}
                  >
                    <div className="relative">
                      <select
                        value={form.jobCategory}
                        onChange={setMasterData("jobCategory")}
                        disabled={
                          saving || loadingCategories || !form.instituteType
                        }
                        className={selectClass}
                      >
                        <option value="">
                          {!form.instituteType
                            ? "Select Institute Type first"
                            : loadingCategories
                              ? "Loading professions..."
                              : "Select Profession"}
                        </option>
                        {jobCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                    </div>
                  </FieldRow>

                  <FieldRow
                    label="Job Role"
                    required
                    error={errors.jobRole || roleError}
                  >
                    <div className="relative">
                      <select
                        value={form.jobRole}
                        onChange={setMasterData("jobRole")}
                        disabled={saving || loadingRoles || !form.jobCategory}
                        className={selectClass}
                      >
                        <option value="">
                          {!form.jobCategory
                            ? "Select Profession first"
                            : loadingRoles
                              ? "Loading job roles..."
                              : "Select Job Role"}
                        </option>
                        {jobRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                    </div>
                  </FieldRow>

                  <FieldRow label="Highest Qualification">
                    <input
                      type="text"
                      value={form.highestQualification}
                      onChange={set("highestQualification")}
                      disabled={saving}
                      placeholder="MBBS, B.Sc Nursing"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Speciality">
                    <input
                      type="text"
                      value={form.speciality}
                      onChange={set("speciality")}
                      disabled={saving}
                      placeholder="e.g. Cardiology"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Registration Number">
                    <input
                      type="text"
                      value={form.registrationNumber}
                      onChange={set("registrationNumber")}
                      disabled={saving}
                      placeholder="MMC Reg. No."
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Total Experience (Years)">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.totalExperience}
                      onChange={set("totalExperience")}
                      disabled={saving}
                      placeholder="e.g. 5"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Current Designation">
                    <input
                      type="text"
                      value={form.currentDesignation}
                      onChange={set("currentDesignation")}
                      disabled={saving}
                      placeholder="Senior Resident"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Current Employer">
                    <input
                      type="text"
                      value={form.currentEmployer}
                      onChange={set("currentEmployer")}
                      disabled={saving}
                      placeholder="Current employer name"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Current Salary">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.currentSalary}
                      onChange={set("currentSalary")}
                      disabled={saving}
                      placeholder="0"
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Expected Salary">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.expectedSalary}
                      onChange={set("expectedSalary")}
                      disabled={saving}
                      placeholder="Expected annual salary"
                      className={inputClass}
                    />
                  </FieldRow>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                  Location
                </h3>

                {locationError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {locationError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow label="Country" required error={errors.countryId}>
                    <div className="relative">
                      <select
                        value={form.countryId}
                        onChange={setLocation("countryId")}
                        disabled={saving || loadingCountries}
                        className={selectClass}
                      >
                        <option value="">
                          {loadingCountries
                            ? "Loading countries..."
                            : "Select Country"}
                        </option>
                        {countries.map((country) => (
                          <option key={country.id} value={String(country.id)}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                    </div>
                  </FieldRow>

                  <FieldRow label="State" required error={errors.stateId}>
                    <div className="relative">
                      <select
                        value={form.stateId}
                        onChange={setLocation("stateId")}
                        disabled={saving || !form.countryId || loadingStates}
                        className={selectClass}
                      >
                        <option value="">
                          {!form.countryId
                            ? "Select Country first"
                            : loadingStates
                              ? "Loading states..."
                              : "Select State"}
                        </option>
                        {states.map((state) => (
                          <option key={state.id} value={String(state.id)}>
                            {state.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                    </div>
                  </FieldRow>

                  <FieldRow label="City" required error={errors.cityId}>
                    <div className="relative">
                      <select
                        value={form.cityId}
                        onChange={setLocation("cityId")}
                        disabled={saving || !form.stateId || loadingCities}
                        className={selectClass}
                      >
                        <option value="">
                          {!form.stateId
                            ? "Select State first"
                            : loadingCities
                              ? "Loading cities..."
                              : "Select City"}
                        </option>
                        {cities.map((city) => (
                          <option key={city.id} value={String(city.id)}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                    </div>
                  </FieldRow>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#1e5a7a]">
                  Document Upload
                </h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                  <FieldRow
                    label="Resume / CV"
                    required={isCreate}
                    error={errors.document}
                    fullWidth
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={onFile}
                    />

                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={saving}
                        className="inline-flex w-full sm:w-auto cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#2f6b8a] bg-white px-4 py-2 text-sm font-medium text-[#2f6b8a] transition hover:bg-[#eaf2f7] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {form.document ? "Change file" : "Choose file"}
                      </button>
                      <span className="truncate text-sm text-slate-600 w-full sm:w-auto text-center sm:text-left mt-1 sm:mt-0">
                        {form.document ? form.document.name : "No file chosen"}
                      </span>
                    </div>
                    <span className="mt-1 block text-xs text-slate-500">
                      PDF, JPG, PNG, DOC or DOCX, up to {MAX_FILE_MB} MB
                    </span>
                  </FieldRow>
                </div>
              </section>

              <section>
                <div className="flex flex-col gap-1 sm:grid sm:grid-cols-[160px_1fr] sm:items-start sm:gap-3">
                  <label className={FIELD_LABEL}>Consent</label>
                  <div>
                    <label className="flex items-start gap-2 text-[13px] text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.consentGiven}
                        onChange={(e) =>
                          setForm((c) => ({
                            ...c,
                            consentGiven: e.target.checked,
                          }))
                        }
                        disabled={saving}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2f6b8a] focus:ring-[#2f6b8a]"
                      />
                      <span>
                        I authorize Ishraq HR to use and share my professional
                        profile and submitted documents with potential
                        employers for recruitment purposes.
                      </span>
                    </label>
                    {errors.consentGiven && (
                      <span className="mt-1 block text-xs text-red-500">
                        {errors.consentGiven}
                      </span>
                    )}
                  </div>
                </div>
              </section>

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/admin/jobseekers")}
                  disabled={saving}
                  className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-lg bg-[#2f6b8a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : isCreate ? "Add User" : "Update"}
                </button>
              </div>
            </form>
          )}
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

export default AddJobSeeker;