import { useStatusToast } from "../../../components/common/StatusModalProvider";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";

import {
  ChevronsRight,
  Download as DownloadIcon,
  FileText as FileIcon,
  X as CloseIcon,
  Check as CheckIcon,
  RotateCcw,
  ChevronsLeft,
} from "lucide-react";

const JOB_CATEGORIES = [
  "Nurse",
  "Doctor",
  "Pharmacist",
  "Lab Technician",
  "Caregiver",
  "Admin / Office Staff",
  "Other",
];

const SEED_USERS = [
  {
    id: 1,
    fullName: "Ayesha Khan",
    email: "ayesha.khan@example.com",
    mobile: "+91 9876543210",
    jobCategory: "Nurse",
    address: "Mumbai, Maharashtra",
    status: "Active",
    document: {
      name: "Ayesha_Khan_Resume.pdf",
    },
  },
  {
    id: 2,
    fullName: "Imran Shaikh",
    email: "imran.shaikh@example.com",
    mobile: "+91 9876501234",
    jobCategory: "Lab Technician",
    address: "Pune, Maharashtra",
    status: "Active",
    document: {
      name: "Imran_Shaikh_Resume.pdf",
    },
  },
  {
    id: 3,
    fullName: "Sana Pathan",
    email: "sana.pathan@example.com",
    mobile: "+91 9876123456",
    jobCategory: "Pharmacist",
    address: "Aurangabad, Maharashtra",
    status: "Inactive",
    document: {
      name: "Sana_Pathan_Resume.pdf",
    },
  },
];

const StatusIcon = ({ status }) => {
  const isActive = status === "Active";

  return (
    <div className="relative h-[22px] w-[22px]">
      <svg
        viewBox="0 0 48 48"
        className="h-[22px] w-[22px] text-white"
        fill="currentColor"
        aria-hidden="true"
      >
        <circle cx="24" cy="13.5" r="9" />
        <path d="M7 42c0-8.5 7.6-15 17-15s17 6.5 17 15H7Z" />
      </svg>

      <span
        className={`absolute -bottom-1 -right-1 grid h-[13px] w-[13px] place-items-center rounded-full border-[1.5px] border-[#2c3e73] text-white ${
          isActive ? "bg-[#4caf50]" : "bg-[#e53935]"
        }`}
      >
        {isActive ? (
          <CheckIcon size={8} strokeWidth={3.5} />
        ) : (
          <CloseIcon size={7} strokeWidth={3.5} />
        )}
      </span>
    </div>
  );
};

export default function Users() {
  const [searchParams, setSearchParams] = useSearchParams();

  const mode = searchParams.get("mode");
  const activeId = searchParams.get("id");

  const [users, setUsers] = useState(SEED_USERS);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [toast, setToast] = useStatusToast();

  // Navigation
  const goList = () => {
    setSearchParams({});
  };

  const goView = (id) => {
    setSearchParams({
      mode: "view",
      id: String(id),
    });
  };

  // Filter users
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.email?.toLowerCase().includes(query) ||
        user.fullName?.toLowerCase().includes(query) ||
        user.mobile?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || user.status === statusFilter;

      const matchesCategory =
        categoryFilter === "All" ||
        user.jobCategory === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [
    users,
    search,
    statusFilter,
    categoryFilter,
  ]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;

    return filtered.slice(
      start,
      start + pageSize
    );
  }, [
    filtered,
    currentPage,
    pageSize,
  ]);

  // Reset filters
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setCategoryFilter("All");
    setPage(1);
  };

  // Toggle status
  const toggleStatus = (id) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id
          ? {
              ...user,
              status:
                user.status === "Active"
                  ? "Inactive"
                  : "Active",
            }
          : user
      )
    );

    setToast("Status updated successfully");

    setTimeout(() => {
      setToast("");
    }, 2000);
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!filtered.length) return;

    const excelData = filtered.map(
      (user, index) => ({
        "Sr.No": index + 1,
        "Full Name": user.fullName || "",
        Email: user.email || "",
        Mobile: user.mobile || "",
        "Job Category":
          user.jobCategory || "",
        Address: user.address || "",
        Document:
          user.document?.name || "",
        Status: user.status || "",
      })
    );

    const worksheet =
      XLSX.utils.json_to_sheet(excelData);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Jobseekers"
    );

    XLSX.writeFile(
      workbook,
      "ishraq-jobseekers.xlsx"
    );
  };

  // View user
  if (mode === "view") {
    const user = users.find(
      (item) =>
        String(item.id) ===
        String(activeId)
    );

    if (!user) {
      return (
        <div className="p-6">
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">
              User not found.
            </p>

            <button
              type="button"
              onClick={goList}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2c3e73] px-4 py-2 text-sm font-medium text-white"
            >
              <ChevronsLeft size={17} />
              Back to Users
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#26345f]">
              User Details
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View jobseeker information
            </p>
          </div>

          <button
            type="button"
            onClick={goList}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#26345f] shadow-sm hover:bg-slate-50"
          >
            <ChevronsLeft size={17} />
            Back
          </button>
        </div>

        {/* User details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-4 border-b border-slate-100 pb-5">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#2c3e73] text-lg font-semibold text-white">
              {user.fullName
                ?.charAt(0)
                ?.toUpperCase()}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {user.fullName}
              </h2>

              <p className="text-sm text-slate-500">
                {user.email}
              </p>
            </div>

            <div className="ml-auto">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  user.status === "Active"
                    ? "bg-green-50 text-green-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    user.status === "Active"
                      ? "bg-[#4caf50]"
                      : "bg-[#e53935]"
                  }`}
                />

                {user.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Full Name
              </p>

              <p className="text-sm font-medium text-slate-700">
                {user.fullName || "-"}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Email
              </p>

              <p className="text-sm font-medium text-slate-700">
                {user.email || "-"}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Mobile
              </p>

              <p className="text-sm font-medium text-slate-700">
                {user.mobile || "-"}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Job Category
              </p>

              <p className="text-sm font-medium text-slate-700">
                {user.jobCategory || "-"}
              </p>
            </div>

            <div className="md:col-span-2">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Address
              </p>

              <p className="text-sm font-medium text-slate-700">
                {user.address || "-"}
              </p>
            </div>

            <div className="md:col-span-2">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Document
              </p>

              {user.document?.name ? (
                <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <FileIcon size={17} />

                  {user.document.name}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No document uploaded
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Title */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#26345f]">
            Jobseeker List
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage registered jobseekers
          </p>
        </div>

        {/* Export */}
        <button
          type="button"
          onClick={exportToExcel}
          disabled={!filtered.length}
          title="Export to Excel"
          aria-label="Export to Excel"
          className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-[10px] bg-[#1f9d63] text-white shadow-sm transition hover:bg-[#178150] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <DownloadIcon
            size={19}
            strokeWidth={2.2}
          />
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="min-w-[220px] flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email or mobile"
              className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2c3e73]"
            />
          </div>

          <div className="relative min-w-[180px] flex-1">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(
                  e.target.value
                );
                setPage(1);
              }}
              className="h-11 w-full cursor-pointer appearance-none rounded-[10px] border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-700 outline-none focus:border-[#2c3e73]"
            >
              <option value="All">
                All Status
              </option>

              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>

            <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 text-slate-300">
              |
            </span>

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              ▾
            </span>
          </div>

          <div className="relative min-w-[180px] flex-1">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(
                  e.target.value
                );
                setPage(1);
              }}
              className="h-11 w-full cursor-pointer appearance-none rounded-[10px] border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-700 outline-none focus:border-[#2c3e73]"
            >
              <option value="All">
                All Profession
              </option>

              {JOB_CATEGORIES.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}
            </select>

            <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 text-slate-300">
              |
            </span>

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              ▾
            </span>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse">
            <thead>
              <tr className="bg-[#2c3e73] text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3.5">
                  Sr.No
                </th>

                <th className="px-4 py-3.5">
                  Full Name
                </th>

                <th className="px-4 py-3.5">
                  Email
                </th>

                <th className="px-4 py-3.5">
                  Mobile
                </th>

                <th className="px-4 py-3.5">
                  Job Category
                </th>

                <th className="px-4 py-3.5">
                  Address
                </th>

                <th className="px-4 py-3.5">
                  Document
                </th>

                <th className="px-4 py-3.5 text-center">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map(
                  (user, index) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {(currentPage - 1) *
                          pageSize +
                          index +
                          1}
                      </td>

                      <td className="px-4 py-4 text-sm font-medium text-slate-700">
                        {user.fullName}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {user.email}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {user.mobile}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {user.jobCategory}
                      </td>

                      <td className="max-w-[220px] px-4 py-4 text-sm text-slate-600">
                        <span className="block truncate">
                          {user.address || "-"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {user.document?.name ? (
                          <div className="flex max-w-[190px] items-center gap-2 text-sm text-slate-600">
                            <FileIcon
                              size={16}
                              className="shrink-0"
                            />

                            <span className="truncate">
                              {user.document.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            -
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* View */}
                          <button
                            type="button"
                            onClick={() =>
                              goView(user.id)
                            }
                            title="View"
                            aria-label="View"
                            className="grid h-9 w-9 place-items-center rounded-md bg-[#2c3e73] text-white transition hover:bg-[#22315d]"
                          >
                            <ChevronsRight size={16} />
                          </button>

                          {/* Status */}
                          <button
                            type="button"
                            onClick={() =>
                              toggleStatus(
                                user.id
                              )
                            }
                            title={
                              user.status ===
                              "Active"
                                ? "Set Inactive"
                                : "Set Active"
                            }
                            aria-label={
                              user.status ===
                              "Active"
                                ? "Set Inactive"
                                : "Set Active"
                            }
                            className="grid h-9 w-9 place-items-center rounded-md bg-[#2c3e73] transition hover:bg-[#22315d]"
                          >
                            <StatusIcon
                              status={
                                user.status
                              }
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
          <div className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-700">
              {filtered.length === 0
                ? 0
                : (currentPage - 1) *
                    pageSize +
                  1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-slate-700">
              {Math.min(
                currentPage * pageSize,
                filtered.length
              )}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-700">
              {filtered.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(
                  Number(e.target.value)
                );
                setPage(1);
              }}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-600 outline-none"
            >
              <option value={10}>
                10 / page
              </option>

              <option value={20}>
                20 / page
              </option>

              <option value={50}>
                50 / page
              </option>
            </select>

            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() =>
                setPage((prev) =>
                  Math.max(1, prev - 1)
                )
              }
              className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-slate-600">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={
                currentPage === totalPages
              }
              onClick={() =>
                setPage((prev) =>
                  Math.min(
                    totalPages,
                    prev + 1
                  )
                )
              }
              className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-[#26345f] px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
