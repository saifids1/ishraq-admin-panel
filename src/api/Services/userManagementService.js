// src/services/userManagementService.js
import api from "../axiosInstance"; // your existing axios instance

// ---------- Helpers ----------
/** Pulls a readable message from the normalized error your axios interceptor rejects with. */
export function getApiErrorMessage(error) {
  // Business-rule errors: { errors: ["..."] }
  if (Array.isArray(error?.errors) && error.errors.length) {
    return error.errors.join(" ");
  }

  // [ApiController] validation errors: { errors: { Field: ["..."] } }
  if (error?.errors && typeof error.errors === "object") {
    const messages = Object.values(error.errors).flat();
    if (messages.length) return messages.join(" ");
  }

  if (error?.message) return error.message;

  return "Something went wrong. Please try again.";
}

// ---------- API functions ----------

const BASE = "/UserManagement";

/** GET /api/UserManagement/roles */
export async function getRoles() {
  const { data } = await api.get(`${BASE}/roles`);
  return data.data;
}

/** POST /api/UserManagement/users */
export async function createUser(payload) {
  const { data } = await api.post(`${BASE}/users`, payload);
  return data;
}

/** GET /api/UserManagement/users?pageNo=&pageSize= */
export async function getUsers({ pageNo = 1, pageSize = 10 } = {}) {
  const { data } = await api.get(`${BASE}/users`, {
    params: { pageNo, pageSize },
  });
  return data;
}

/** PUT /api/UserManagement/users/{id} */
export async function updateUser(id, payload) {
  const { data } = await api.put(`${BASE}/users/${id}`, payload);
  return data;
}

/** PATCH /api/UserManagement/users/{id}/status */
export async function updateUserStatus(id, isActive) {
  const { data } = await api.patch(`${BASE}/users/${id}/status`, { isActive });
  return data;
}

// src/api/Services/userManagementService.js  (add this function)

/** GET /api/UserManagement/users/{id} */
export async function getUserById(id) {
  const { data } = await api.get(`${BASE}/users/${id}`);
  return data;
}