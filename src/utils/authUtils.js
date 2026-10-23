/**
 * Get the currently logged-in user from localStorage.
 * Returns null if the user is not logged in or the stored data is invalid.
 */
export const getCurrentUser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const userData = localStorage.getItem("user");

    if (!userData) {
      return null;
    }

    const user = JSON.parse(userData);

    return {
      id: user.id ?? user.userId ?? null,
      name: user.name ?? "",
      username: user.username ?? "",
      email: user.email ?? "",
      role: user.role ?? "",
      roles: Array.isArray(user.roles) ? user.roles : [],
      token: user.token ?? "",
      profileId: user.profileId
    };
  } catch (error) {
    console.error("Failed to read current user:", error);
    return null;
  }
};

/**
 * Get the current user's ID.
 */
export const getCurrentUserId = () => {
  const user = getCurrentUser();
  return  user?.profileId ?? null;
};
export const getCurrentUserId2 = () => {
  const user = getCurrentUser();
  return user?.id ?? null;
};

/**
 * Get the current user's authentication token.
 */
export const getAuthToken = () => {
  return getCurrentUser()?.token ?? null;
};

/**
 * Check whether a user is logged in.
 */
export const isAuthenticated = () => {
  return Boolean(getAuthToken());
};

/**
 * Get the current user's role.
 */
export const getCurrentUserRole = () => {
  return getCurrentUser()?.role ?? null;
};

/**
 * Get the current user's roles array.
 */
export const getCurrentUserRoles = () => {
  return getCurrentUser()?.roles ?? [];
};
