# Authentication and Authorization

## Overview

The Ishraq Admin Panel implements role-based authentication using a simple client-side session model. Authentication state is managed via React Context and persisted in `localStorage`.

## Authentication Flow

```
1. User navigates to /login
2. User selects role (Admin / Employer / Job Seeker)
3. User enters email and password
4. Login.jsx calls loginApi() → POST /Auth/login
5. Backend validates credentials, returns user data + token
6. AuthContext.login(userData) stores user in:
   - localStorage (key: "user")
   - React state
7. User is redirected to role-based dashboard
```

## Session Management

### AuthContext (`src/context/AuthContext.jsx`)

| State | Type | Description |
|-------|------|-------------|
| `user` | object \| null | Currently authenticated user |
| `loading` | boolean | Whether auth state is being initialized |
| `isAuthenticated` | boolean | Derived from `!!user` |

### Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `login(userData)` | object | Stores user in localStorage and state |
| `logout()` | — | Removes user from localStorage and state |

### Initialization

On mount, `AuthContext` checks `localStorage.getItem("user")`. If valid JSON, it restores the user session. Invalid data is cleared.

### Storage Format


## Role System

### Roles

| Role | Normalized Value | Dashboard Route |
|------|-----------------|-----------------|
| Admin | `admin` | `/admin/dashboard` |
| Employer (API may return "Recruiter") | `employer` | `/employer/dashboard` |
| Job Seeker | `jobseeker` | `/jobseeker/dashboard` |

### Role Normalization (`src/pages/auth/Login.jsx`)

The `normalizeRole()` function handles role name variations:

- `"admin"` → `"admin"`
- `"recruiter"` or `"employer"` → `"employer"`
- `"jobseeker"` → `"jobseeker"`
- Anything else → `null` (access denied)

## Route Protection

### ProtectedRoute Component (`src/components/common/ProtectedRoute.jsx`)

```jsx
<ProtectedRoute allowedRole="admin">
  <AdminLayout>
    {/* Admin pages */}
  </AdminLayout>
</ProtectedRoute>
```

### Protection Logic

1. If `loading` → render `null` (waiting for auth state)
2. If `!user` → redirect to `/login`
3. If `user.role?.toLowerCase() !== allowedRole.toLowerCase()` → redirect to `/unauthorized`
4. Otherwise → render `<Outlet />` (child routes)

### Route Configuration by Role

#### Admin Routes (`src/routes/AdminRoutes.jsx`)
- All routes wrapped in `<ProtectedRoute allowedRole="admin" />`
- Path prefix: `/admin`
- Pages: dashboard, users, job seekers, employers, job requirements, master data, enquiries, reports

#### Employer Routes (`src/routes/EmployerRoutes.jsx`)
- All routes wrapped in `<ProtectedRoute allowedRole="employer" />`
- Path prefix: `/employer`
- Pages: dashboard, profile, jobs, job requirements, feedback, complaints

#### Job Seeker Routes (`src/routes/JobSeekerRoutes.jsx`)
- All routes wrapped in `<ProtectedRoute allowedRole="jobseeker" />`
- Path prefix: `/jobseeker`
- Pages: dashboard, profile, applied jobs, jobs for you, feedback, complaints

#### Auth Routes (`src/routes/AuthRoutes.jsx`)
- No protection (public)
- Path prefix: none (auth paths)
- Pages: login, register, forgot-password

### Public Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | Login | Role-based login |
| `/admin/login` | Login | Admin login (same component) |
| `/register` | Register | Placeholder registration page |
| `/forgot-password` | ForgotPassword | OTP-based password reset |
| `/unauthorized` | Unauthorized | Access denied page |
| `/` | Redirect to `/login` | Default route |
| `*` | NotFound | 404 catch-all |

## Token Handling

### Auth Token

- Token is stored in the user object in `localStorage`
- `authUtils.getAuthToken()` retrieves the token
- **Note**: The axios instance does NOT automatically attach the token to requests (no authorization header interceptor is visible in `axiosInstance.js`)
- Token usage in API calls is not explicitly implemented in the frontend source

### Token Expiration

- No token expiration handling is implemented
- No refresh token mechanism exists
- Session persists until `logout()` is called or localStorage is cleared

## Utility Functions (`src/utils/authUtils.js`)

| Function | Returns | Description |
|----------|---------|-------------|
| `getCurrentUser()` | object \| null | Parsed user from localStorage |
| `getCurrentUserId()` | string \| null | User's profileId |
| `getAuthToken()` | string \| null | User's authentication token |
| `isAuthenticated()` | boolean | Whether a token exists |
| `getCurrentUserRole()` | string \| null | User's role |
| `getCurrentUserRoles()` | string[] | User's roles array |

## Security Considerations

| Concern | Status | Notes |
|---------|--------|-------|
| Password in localStorage | ⚠️ | User object (potentially including token) stored in localStorage |
| HTTPS enforcement | ✅ | Backend URL uses `https://localhost:44367` |
| Token in request headers | ❌ | Not automatically attached by axios instance |
| CSRF protection | ❓ | Not implemented or verified |
| XSS protection | ⚠️ | Standard React escaping; localStorage is vulnerable to XSS |
| Session timeout | ❌ | No automatic session expiration |
| Role-based access | ✅ | ProtectedRoute enforces role at route level |
| Password reset | ✅ | OTP-based email reset flow implemented |

## Limitations

- **No automatic token attachment**: The axios instance does not include an Authorization header interceptor. API calls may fail if the backend expects bearer tokens.
- **No refresh token**: Sessions do not refresh automatically.
- **localStorage security**: User data (including potentially sensitive info) is stored in localStorage, accessible to any JavaScript running on the page.
- **Role normalization**: Login normalizes API role names, but other parts of the app may receive non-normalized roles directly from the API.
The user object stored in `localStorage` under key `"user"` contains (inferred from `authUtils.js`):

```json
{
  "id": "number",
  "name": "string",
  "username": "string",
  "email": "string",
  "role": "string",
  "roles": ["string"],
  "token": "string",
  "profileId": "string|number"
}
```