# Backend Documentation

## Overview

**This is a frontend-only repository.** The ishraq-admin-panel is a React client application that consumes a RESTful backend API. No backend source code, server code, or database is included in this workspace.

## Backend API Configuration

The frontend connects to the backend at:

- **Base URL**: `https://localhost:44367/api` (configured in `.env` as `REACT_APP_API_BASE_URL`)
- **Protocol**: HTTPS
- **API Version**: Not specified (path-based versioning not used)
- **Timeout**: 60 seconds (configured in `axiosInstance.js`)

## Backend Responsibilities (Inferred from Frontend Usage)

Based on the API endpoints called by the frontend, the backend is responsible for:

| Responsibility | Evidence |
|----------------|----------|
| User authentication (login, OTP, password reset) | `authApi.js` calls `/Auth/login`, `/EmailOtp/*`, `/Auth/UpdatePasswordyEmail` |
| User/session management | `AuthContext.jsx` stores user in `localStorage` |
| Job seeker CRUD | `adjobseekerApi.js` calls `/Jobseeker` endpoints |
| Employer CRUD | `employerApi.js` and `adminemployeelistApi.js` call `/Employer` endpoints |
| Job requirement CRUD | `jobRequirementApi.js` calls `/JobRequirement` endpoints |
| Job applications | `applicationApi.js` calls `/Application` endpoints |
| Master data CRUD | `createMasterApi.js` calls generic `/{controller}` endpoints |
| Complaints | `complaintApi.js` calls `/Complaint` endpoints |
| Feedback | `feedbackApi.js` calls `/Feedback` endpoints |
| Enquiries (career, contact, feedback) | `adminEnquiryService.js` calls `/CareerEnquiry`, `/ContactEnquiry`, `/Feedback` |
| File uploads (CV, job attachments) | Multipart/form-data requests to various endpoints |
| File downloads (enquiry attachments) | `adminEnquiryService.openFile()` calls `/{formType}/{id}/file` with `responseType: "blob"` |

## API Response Format (Inferred)

The frontend expects responses in the following format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Actual payload - may be an object or array
  }
}
```

Paginated responses are expected to include:
```json
{
  "success": true,
  "message": "...",
  "data": {
    "items": [...],
    "pageNo": 1,
    "pageSize": 10,
    "totalRecords": 100,
    "totalPages": 10
  }
}
```

## Error Handling

The axios response interceptor in `axiosInstance.js` normalizes errors:

```javascript
{
  message: string,       // Error message from backend or default
  status: number,        // HTTP status code
  errors: any,           // Backend validation errors (if any)
  data: any              // Raw error data from backend
}
```

## Known Backend Endpoints (from Frontend Calls)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/Auth/login` | User login |
| POST | `/EmailOtp/send-otp` | Send password reset OTP |
| POST | `/EmailOtp/verify-otp` | Verify OTP |
| PATCH | `/Auth/UpdatePasswordyEmail` | Reset password via email |
| GET | `/Jobseeker` | List job seekers (paginated) |
| GET | `/Jobseeker/all` | All job seekers (dropdown) |
| GET | `/Jobseeker/{id}` | Get job seeker by ID |
| POST | `/Jobseeker` | Create job seeker (multipart) |
| PUT | `/Jobseeker/{id}` | Update job seeker (multipart) |
| PATCH | `/Jobseeker/{id}/active` | Toggle job seeker active status |
| GET | `/Employer` | List employers (paginated) |
| GET | `/Employer/all` | All employers |
| GET | `/Employer/{id}` | Get employer by ID |
| POST | `/Employer` | Create employer |
| PUT | `/Employer/{id}` | Update employer |
| PATCH | `/Employer/{id}/active-status` | Toggle employer active status |
| GET | `/JobRequirement` | List job requirements (with filters) |
| GET | `/JobRequirement/list` | All job requirements |
| GET | `/JobRequirement/{id}` | Get job requirement by ID |
| GET | `/JobRequirement/employer/{id}` | Jobs by employer |
| POST | `/JobRequirement` | Create job requirement (multipart) |
| PUT | `/JobRequirement/{id}` | Update job requirement (multipart) |
| PATCH | `/JobRequirement/{id}/active` | Toggle job active |
| PUT | `/JobRequirement/{id}/status-deadline` | Update status and deadline |
| GET | `/Application` | List applications (paginated) |
| GET | `/Application/all` | All applications |
| GET | `/Application/{id}` | Get application by ID |
| POST | `/Application` | Apply for job |
| PUT | `/Application` | Update application |
| PATCH | `/Application/{id}/toggle-active` | Toggle application active |
| GET | `/Complaint` | List complaints |
| GET | `/Complaint/{id}` | Get complaint by ID |
| POST | `/Complaint` | Submit complaint (multipart) |
| GET | `/ComplaintCategory/all` | All complaint categories |
| GET | `/Feedback` | List feedback |
| GET | `/Feedback/{id}` | Get feedback by ID |
| POST | `/Feedback` | Submit feedback |
| GET | `/Feedback/GetAllFeedbackPagination` | Paginated feedback |
| GET | `/CareerEnquiry` | Career enquiries |
| GET | `/ContactEnquiry` | Contact enquiries |
| GET | `/RequestStatus` | Request statuses |

## Limitations

- The actual backend implementation (language, framework, database) cannot be determined from this frontend repository.
- Backend controller actions, DTOs, validation rules, and database schema are not documented here.
- SSL certificate configuration (self-signed `https://localhost:44367`) is a backend concern.
