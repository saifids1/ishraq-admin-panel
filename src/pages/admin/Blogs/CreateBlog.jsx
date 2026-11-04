import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronsLeft, Download, Pencil, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { getCurrentUserId2 } from "../../../utils/authUtils";

import StatusModal from "../../../components/common/StatusModal";
import blogApi from "../../../api/Services/blogApi";
import blogTypeMasterApi from "../../../api/Services/blogTypeMasterApi";

/* ------------------------------ STYLES & CONSTANTS ------------------------------ */

const listPath = "/admin/blogs";

// Compact inputs with 14px text
const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2f6b8a] focus:ring-1 focus:ring-[#2f6b8a]/20 disabled:bg-slate-50 disabled:text-slate-500";

const selectClass =
  "w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2 pr-9 text-[14px] text-slate-700 outline-none transition focus:border-[#2f6b8a] focus:ring-1 focus:ring-[#2f6b8a]/20 disabled:bg-slate-50 disabled:text-slate-500";

const QUILL_MODULES = {
  toolbar: [
    [{ header: [false] }],
    ["bold", "italic", "underline", "blockquote"],
    [{ color: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    [{ align: [] }],
    ["link", "clean"],
  ],
};

const QUILL_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "blockquote",
  "color",
  "list",
  "indent",
  "align",
  "link",
];

const EMPTY_FORM = {
  BlogTypeMaster_Id: "",
  Blog_Title: "",
  Blog_Description: "",
  Blog_Brief_Description: "",
  Blog_Author: "",
  Blog_Image: null,
  Blog_Date: "",
  IsActive: true,
};

const EMPTY_AUDIT = {
  createdAt: "",
  createdBy: "",
  updatedAt: "",
  updatedBy: "",
};

const FieldRow = ({ label, required, children, fullWidth }) => (
  <div className={`flex flex-col gap-1 ${fullWidth ? "md:col-span-2" : ""}`}>
    <label className="text-[14px] font-medium text-slate-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="min-w-0">{children}</div>
  </div>
);

/* ------------------------------ HELPERS ------------------------------ */

const plainText = (html) =>
  String(html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

const DOCUMENT_BASE_URL = (
  process.env.REACT_APP_DOCUMENT_BASE_URL || ""
).trim();

const toAbsoluteUrl = (url) => {
  if (!url) return url;
  const raw = String(url).trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  let clean = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  clean = clean
    .replace(/^wwwroot\//i, "")
    .replace(/^api\//i, "")
    .replace(/^\/+/, "");

  if (!DOCUMENT_BASE_URL) return `/${clean}`;
  return `${DOCUMENT_BASE_URL.replace(/\/+$/, "")}/${clean}`;
};

const getFileName = (path) =>
  path ? String(path).split(/[\\/]/).pop() || "" : "";

const extractRecord = (response) => {
  let result = response?.data ?? response;
  if (result?.data !== undefined) result = result.data;
  else if (result?.Data !== undefined) result = result.Data;

  if (result?.data && !Array.isArray(result.data)) result = result.data;
  else if (result?.Data && !Array.isArray(result.Data)) result = result.Data;
  return result;
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  fallback;

const formatDate = (value) => {
  if (!value) return "";
  const s = String(value).trim();
  if (s.startsWith("0001-01-01")) return "";

  let d;
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (plain)
    d = new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));
  else d = value instanceof Date ? value : new Date(s);

  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = value instanceof Date ? value : new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const nowIsoLocal = () => {
  const d = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}0000`;
};

// Normalize an empty Quill value so the placeholder shows correctly.
const normalizeQuillValue = (html) => {
  const s = String(html ?? "").trim();
  if (!s || s === "<p><br></p>" || s === "<p></p>") return "";
  return s;
};

/* --------------------------- EDITOR STYLES (injected once) --------------------------- */

const EDITOR_STYLE_ID = "blog-editor-scroll-styles";

const injectEditorStyles = () => {
  if (document.getElementById(EDITOR_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = EDITOR_STYLE_ID;
  style.textContent = `
    .blog-editor {
      display: flex;
      flex-direction: column;
    }
    .blog-editor .ql-container {
      flex: 1 1 auto;
      min-height: 0;
      height: auto;
      overflow: hidden;
      font-size: 14px;
    }
    .blog-editor .ql-editor {
      height: 100%;
      min-height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
    }
    .blog-editor .ql-editor.ql-blank::before {
      color: #94a3b8;
      font-style: normal;
      left: 12px;
      right: 12px;
    }
  `;
  document.head.appendChild(style);
};

/* ------------------------------ COMPONENT ------------------------------ */

const CreateBlog = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const isCreate = mode !== "edit" && mode !== "view";
  const isView = mode === "view";

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [audit, setAudit] = useState(EMPTY_AUDIT);
  const [imagePreview, setImagePreview] = useState("");
  const [existingImage, setExistingImage] = useState(null);
  const [lightbox, setLightbox] = useState(false);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const [blogTypes, setBlogTypes] = useState([]);
  const [blogTypesLoading, setBlogTypesLoading] = useState(true);
  const [blogTypesError, setBlogTypesError] = useState("");

  const disabled = isView || loading || saving;

  /* --------------------------- EDITOR HEIGHT --------------------------- */

  // Taller on create, medium on edit, smaller on view.
  const editorHeightClass = isView
    ? "h-[220px]"
    : isCreate
      ? "h-[320px]"
      : "h-[280px]";

  /* --------------------------- MODAL HELPERS --------------------------- */

  const openStatus = (type, message, extra = {}) =>
    setModal({
      type,
      message,
      title: extra.title,
      confirmText: extra.confirmText || "OK",
      cancelText: extra.cancelText || "Cancel",
      showCancel: false,
      onConfirm: () => {
        setModal(null);
        extra.onConfirm?.();
      },
      onCancel: () => {
        setModal(null);
        extra.onCancel?.();
      },
    });

  const openConfirm = (props) =>
    setModal({
      type: "confirm",
      ...props,
      showCancel: true,
      onConfirm: () => {
        setModal(null);
        props.onConfirm?.();
      },
      onCancel: () => {
        setModal(null);
        props.onCancel?.();
      },
    });

  /* --------------------------- EFFECTS --------------------------- */

  useEffect(() => {
    injectEditorStyles();
  }, []);

  useEffect(() => {
    let cancelled = false;
    blogTypeMasterApi
      .getAllActive(true)
      .then((res) => {
        if (cancelled) return;
        const list = res?.data?.data ?? res?.data ?? res ?? [];
        setBlogTypes(
          Array.isArray(list)
            ? list.map((item) => ({ id: item.id, name: item.blogTypeName }))
            : [],
        );
      })
      .catch(
        (err) =>
          !cancelled &&
          setBlogTypesError(getErrorMessage(err, "Failed to load blog types.")),
      )
      .finally(() => !cancelled && setBlogTypesLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isCreate) {
      setLoading(false);
      return;
    }
    if (!id) {
      setError("Record ID is missing.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    blogApi
      .getById(Number(id))
      .then((response) => {
        if (cancelled) return;
        const blog = extractRecord(response);
        if (!blog) throw new Error("Record not found.");

        setFormData({
          BlogTypeMaster_Id: blog.blogTypeMaster_Id ?? "",
          Blog_Title: blog.blog_Title ?? "",
          Blog_Description: normalizeQuillValue(blog.blog_Description),
          Blog_Brief_Description: blog.blog_Brief_Description ?? "",
          Blog_Author: blog.blog_Author ?? "",
          Blog_Image: null,
          Blog_Date: toDateInputValue(blog.blog_Date),
          IsActive: Boolean(blog.isActive),
        });

        const rawImg = blog.blog_Image || "";
        const imgUrl = rawImg ? toAbsoluteUrl(rawImg) : "";
        setImagePreview(imgUrl);
        setExistingImage(
          rawImg ? { name: getFileName(rawImg), url: imgUrl } : null,
        );

        setAudit({
          createdAt: formatDate(blog.blog_CreatedAt),
          createdBy: blog.createdByName ?? blog.blog_CreatedBy ?? "",
          updatedAt: formatDate(blog.blog_UpdatedAt),
          updatedBy: blog.updatedByName ?? blog.blog_UpdatedBy ?? "",
        });
      })
      .catch(
        (err) =>
          !cancelled &&
          setError(getErrorMessage(err, "Failed to load record.")),
      )
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id, isCreate]);

  /* --------------------------- HANDLERS --------------------------- */

  const setField = (key, value) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setField("Blog_Image", file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setExistingImage(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving || isView) return;

    if (!formData.Blog_Title.trim())
      return openStatus("warning", "Blog title is required.");
    if (!formData.Blog_Author.trim())
      return openStatus("warning", "Blog author is required.");
    if (!formData.BlogTypeMaster_Id)
      return openStatus("warning", "Blog type is required.");
    if (!plainText(formData.Blog_Description))
      return openStatus("warning", "Blog description is required.");

    if (isCreate) runSave();
    else
      openConfirm({
        title: "Update Blog?",
        message: "Are you sure you want to save these changes?",
        confirmText: "Update",
        onConfirm: runSave,
      });
  };

  const runSave = async () => {
    setSaving(true);
    setError("");

    const currentUserId = Number(getCurrentUserId2());
    const now = nowIsoLocal();
    const payload = new FormData();

    payload.append(
      "BlogTypeMaster_Id",
      String(formData.BlogTypeMaster_Id || ""),
    );
    payload.append("Blog_Title", formData.Blog_Title.trim());
    payload.append("Blog_Description", formData.Blog_Description || "");
    payload.append(
      "Blog_Brief_Description",
      formData.Blog_Brief_Description || "",
    );
    payload.append("Blog_Author", formData.Blog_Author.trim());
    payload.append("Blog_Date", formData.Blog_Date || "");
    payload.append("IsActive", String(Boolean(formData.IsActive)));

    if (formData.Blog_Image instanceof File)
      payload.append("Blog_Image", formData.Blog_Image);
    if (currentUserId > 0)
      payload.append(
        isCreate ? "CreatedBy" : "UpdatedBy",
        String(currentUserId),
      );
    payload.append(isCreate ? "CreatedAt" : "UpdatedAt", now);

    try {
      const response = isCreate
        ? await blogApi.create(payload)
        : await blogApi.update(Number(id), payload);

      if (response?.success !== false) {
        openStatus(
          "success",
          response?.message ||
            (isCreate
              ? "Blog created successfully."
              : "Blog updated successfully."),
          {
            title: isCreate ? "Created" : "Updated",
            onConfirm: () => navigate(listPath),
          },
        );
      } else {
        openStatus("danger", response?.message || "Something went wrong.", {
          title: "Error",
        });
      }
    } catch (err) {
      openStatus("danger", getErrorMessage(err, "Failed to submit blog."), {
        title: "Error",
      });
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------- RENDER --------------------------- */

  const pageTitle = isCreate
    ? "Create Blog"
    : isView
      ? "View Blog"
      : "Update Blog";
  const savedBlogTypeMissing =
    !isCreate &&
    formData.BlogTypeMaster_Id !== "" &&
    !blogTypes.some(
      (bt) => String(bt.id) === String(formData.BlogTypeMaster_Id),
    );

  return (
    <div className="min-h-full bg-[#f4f8fb]">
      <div className="mx-auto">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {/* HEADER */}
          <div className="flex justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(listPath)}
                className="grid h-7 w-7 place-items-center rounded-lg bg-[#2f6b8a] text-white transition hover:bg-[#25566f]"
              >
                <ChevronsLeft size={16} strokeWidth={2} />
              </button>
              <h2 className="text-[14px] font-semibold text-slate-800">
                {pageTitle}
              </h2>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[14px] text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <FieldRow label="Title" required={!isView}>
                <input
                  type="text"
                  value={formData.Blog_Title}
                  onChange={(e) => setField("Blog_Title", e.target.value)}
                  disabled={disabled}
                  placeholder="Enter blog title"
                  className={inputClass}
                />
              </FieldRow>

              <FieldRow label="Blog Type" required={!isView}>
                <div className="relative">
                  <select
                    value={formData.BlogTypeMaster_Id ?? ""}
                    onChange={(e) =>
                      setField("BlogTypeMaster_Id", e.target.value)
                    }
                    disabled={disabled || blogTypesLoading}
                    className={selectClass}
                  >
                    <option value="">
                      {blogTypesLoading ? "Loading..." : "Select blog type"}
                    </option>
                    {blogTypes.map((bt) => (
                      <option key={bt.id} value={bt.id}>
                        {bt.name}
                      </option>
                    ))}
                    {savedBlogTypeMissing && (
                      <option
                        value={formData.BlogTypeMaster_Id}
                      >{`Blog Type #${formData.BlogTypeMaster_Id} (inactive)`}</option>
                    )}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
                {blogTypesError && (
                  <p className="mt-1 text-[13px] text-red-600">
                    {blogTypesError}
                  </p>
                )}
              </FieldRow>

              <FieldRow label="Author" required={!isView}>
                <input
                  type="text"
                  value={formData.Blog_Author}
                  onChange={(e) => setField("Blog_Author", e.target.value)}
                  disabled={disabled}
                  placeholder="Enter author name"
                  className={inputClass}
                />
              </FieldRow>

              {/* DATE — native calendar picker */}
              <FieldRow label="Date">
                <input
                  type="date"
                  value={formData.Blog_Date || ""}
                  onChange={(e) => setField("Blog_Date", e.target.value)}
                  disabled={disabled}
                  className={`${inputClass} cursor-pointer [color-scheme:light]`}
                />
              </FieldRow>

              {/* Preview | Image — side by side */}
              <FieldRow label="Preview">
                <textarea
                  value={formData.Blog_Brief_Description}
                  onChange={(e) =>
                    setField("Blog_Brief_Description", e.target.value)
                  }
                  disabled={disabled}
                  rows={3}
                  placeholder="Short summary"
                  className={inputClass}
                />
              </FieldRow>

              {/* Image cell: "Choose image" and "Uploaded image" side by side */}
              <FieldRow label="Image">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  {!isView && (
                    <div className="w-full sm:w-1/2">
                      <label className="mb-1 block text-[13px] font-medium text-slate-600">
                        Choose image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        disabled={disabled}
                        className="w-full text-[14px] text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[14px] file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-60"
                      />
                    </div>
                  )}

                  <div className={`w-full ${isView ? "" : "sm:w-1/2"}`}>
                    <label className="mb-1 block text-[13px] font-medium text-slate-600">
                      {formData.Blog_Image instanceof File
                        ? "Selected image"
                        : "Uploaded image"}
                    </label>

                    {imagePreview ? (
                      <div className="flex items-start gap-3 rounded-md border border-slate-200 p-2">
                        <button
                          type="button"
                          onClick={() => setLightbox(true)}
                          className="shrink-0 overflow-hidden rounded border border-slate-200"
                        >
                          <img
                            src={imagePreview}
                            alt="Blog"
                            className="h-14 w-14 object-cover transition hover:opacity-90"
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-slate-800">
                            {formData.Blog_Image instanceof File
                              ? formData.Blog_Image.name
                              : existingImage?.name || "Blog Image"}
                          </p>
                          <p className="text-[13px] text-slate-500">
                            {formData.Blog_Image instanceof File
                              ? "New image"
                              : "Uploaded image"}
                          </p>

                          {existingImage?.url && (
                            <div className="mt-1.5">
                              <a
                                href={existingImage.url}
                                download={existingImage.name}
                                className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
                              >
                                <Download size={12} /> Download
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[14px] text-slate-500">
                        No image uploaded
                      </div>
                    )}
                  </div>
                </div>
              </FieldRow>

              {/* Description — full width */}
              <FieldRow label="Description" fullWidth>
                {isView ? (
                  <div className="min-h-[38px] rounded-md border border-slate-200 bg-slate-50 p-3 text-[14px] text-slate-800 break-words">
                    {plainText(formData.Blog_Description) ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: formData.Blog_Description,
                        }}
                      />
                    ) : (
                      "—"
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-md overflow-hidden border border-slate-300 text-[14px]">
                    <ReactQuill
                      theme="snow"
                      value={formData.Blog_Description}
                      onChange={(html) => setField("Blog_Description", html)}
                      modules={QUILL_MODULES}
                      formats={QUILL_FORMATS}
                      readOnly={disabled}
                      placeholder="Full blog content"
                      className={`blog-editor ${editorHeightClass}`}
                    />
                  </div>
                )}
              </FieldRow>

              {!isCreate && (
                <>
                  <FieldRow label="Created At">
                    <input
                      type="text"
                      value={audit.createdAt || "—"}
                      readOnly
                      disabled
                      className={inputClass}
                    />
                  </FieldRow>
                  <FieldRow label="Created By">
                    <input
                      type="text"
                      value={audit.createdBy || "—"}
                      readOnly
                      disabled
                      className={inputClass}
                    />
                  </FieldRow>
                  <FieldRow label="Updated At">
                    <input
                      type="text"
                      value={audit.updatedAt || "—"}
                      readOnly
                      disabled
                      className={inputClass}
                    />
                  </FieldRow>
                  <FieldRow label="Updated By">
                    <input
                      type="text"
                      value={audit.updatedBy || "—"}
                      readOnly
                      disabled
                      className={inputClass}
                    />
                  </FieldRow>
                </>
              )}
            </div>

            {/* FOOTER */}
            <div className="mt-6 flex justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => navigate(listPath)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-slate-600 transition hover:bg-slate-50"
              >
                {isView ? "Back" : "Cancel"}
              </button>

              {isView ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/admin/blogs/${id}/edit`, { replace: true })
                  }
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#2f6b8a] px-4 py-2 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#25566f]"
                >
                  Edit
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={disabled}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#2f6b8a] px-4 py-2 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#25566f] disabled:opacity-60"
                >
                  {saving ? "Saving..." : isCreate ? "Create" : "Update"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightbox && imagePreview && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white text-slate-800 hover:bg-slate-200"
          >
            <X size={16} />
          </button>
          <img
            src={imagePreview}
            alt="Blog"
            className="max-h-[85vh] max-w-full rounded-md object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <StatusModal isOpen={!!modal} {...modal} busy={saving} />
    </div>
  );
};

export default CreateBlog;