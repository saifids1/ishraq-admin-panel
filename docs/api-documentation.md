# API Documentation

## Overview

This document describes the backend API endpoints consumed by the ishraq-admin-panel frontend. All API calls are made through `src/api/axiosInstance.js` with base URL `https://localhost:44367/api`.

**Note**: The backend source code is not in this repository. Endpoints, request/response formats, and field names are inferred from frontend API service files. Marked as "inferred" where not directly verifiable.

## Base Configuration

| Setting | Value |
|---------|-------|
| Base URL | `https://localhost:44367/api` |
| Config key | `REACT_APP_API_BASE_URL` in `.env` |
| Timeout | 60 seconds |
| Default Content-Type | `application/json` |
| Multipart uploads | `Content-Type: multipart/form-data` per request |

## Authentication API

### POST /Auth/login
**File**: `src/api/authApi.js` — `loginApi(credentials)`

Authenticates a user and returns user data with token.

**Request Body**:
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response** (inferred):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "name": "string",
    "email": "string",
    "role": "admin|employer|jobseeker",
    "token": "string",
    "profileId": "string|number"
  }
}
```

**Frontend usage**: `Login.jsx` calls this, stores result in `AuthContext`, redirects to role dashboard.

---

### POST /EmailOtp/send-otp
**File**: `src/api/authApi.js` — `sendForgotPasswordOtpApi(email)`

Sends OTP to email for password reset.

**Request Body**:
```json
{
  "email": "string (required)"
}
```


## Job Seeker API

### GET /Jobseeker
**File**: `src/api/Services/adjobseekerApi.js` — `getAll(params)`

Paginated list of job seekers.

**Query Parameters**: `pageNo` (default 1), `pageSize` (default 10), plus any extra params

---

### GET /Jobseeker/all
**File**: `src/api/Services/adjobseekerApi.js` — `getAllList(params)`

Full list of job seekers (for dropdowns).

---

### GET /Jobseeker/{id}
**File**: `src/api/Services/adjobseekerApi.js` — `getById(id)`

Get single job seeker by ID.

**Path Parameter**: `id` (job seeker ID)

---

### POST /Jobseeker
**File**: `src/api/Services/adjobseekerApi.js` — `create(formData)`

## Employer API

### GET /Employer
**File**: `src/api/employerApi.js` — `getEmployers(params)`

Paginated list of employers.

---

### GET /Employer/all
**File**: `src/api/employerApi.js` — `getAllEmployers()`

All employers (no pagination).

---

### GET /Employer/{id}
**File**: `src/api/employerApi.js` — `getEmployerById(id)`

Get employer by ID.

---

### POST /Employer
**File**: `src/api/employerApi.js` — `createEmployer(data)`

Create employer.

---

### PUT /Employer/{id}
**File**: `src/api/employerApi.js` — `updateEmployer(id, data)`

Update employer.

---

### PATCH /Employer/{id}/active-status
**File**: `src/api/employerApi.js` — `updateEmployerActiveStatus(id, isActive)`

Activate/deactivate employer.

**Query Parameters**: `isActive` (boolean)

---

## Job Requirement API

### GET /JobRequirement
**File**: `src/api/Services/jobRequirementApi.js` — `getAll(filters)`

List job requirements with filters. Also used by `getJobsForJobseeker()` with specific params.

**Query Parameters** (inferred): `pageNo`, `pageSize`, `employerid`, `JQ_institute_type_id`, `JQ_job_role_id`, `JQ_job_category_id`, `jobseekerId`, `IsActive`

---

### GET /JobRequirement/list

## Application API

### GET /Application
**File**: `src/api/applicationApi.js`

Multiple uses:
- `getAppliedJobs(jobseekerId, pageNo, pageSize)` — paginated applications for a jobseeker
- `getAll()` — all applications (no pagination)

**Query Parameters**: `jobseekerId`, `pageNo`, `pageSize`, `jobdesc_Id`

---

### GET /Application/all
**File**: `src/api/applicationApi.js` — `getAll()`

All applications.

---

### GET /Application/{id}
**File**: `src/api/applicationApi.js` — `getById(id)`

Get application by ID.

---

### POST /Application
**File**: `src/api/applicationApi.js` — `applyForJob(payload)`

Apply for a job.

---

### PUT /Application
**File**: `src/api/applicationApi.js` — `update(payload)`

Update application (remarks/status).

---

### PATCH /Application/{id}/toggle-active
**File**: `src/api/applicationApi.js` — `toggleActive(id, updatedBy)`

Toggle application active status.

**Query Parameters**: `updatedBy`

---

## Complaint API

### GET /ComplaintCategory/all
**File**: `src/api/complaintApi.js` — `getComplaintCategories()`

All complaint categories.

---


## Master Data API (Generic Factory)

**File**: `src/api/Services/createMasterApi.js`

Generic CRUD factory used for: CityMaster, CountryMaster, StateMaster, JobCategory, JobRole, JobStatus, EmploymentType, InstituteType, UserType, ComplaintCategory, Feedback

### Base URL: `/{controller}`

| Method | Endpoint | Function | Description |
|--------|----------|----------|-------------|
| GET | `/{controller}` | `getAll(params)` | Paginated list |
| GET | `/{controller}/all` | `getAllList(params)` | Full list (dropdowns) |
| GET | `/{controller}/{id}` | `getById(id)` | Single record |
| POST | `/{controller}` | `create(payload)` | Create |
| PUT | `/{controller}` | `update(payload)` | Update |
| PATCH | `/{controller}/{id}/toggle-active` | `toggleActive(id, updatedBy)` | Activate/deactivate |

**JobCategory extension**: `getByJobRole(jobRoleId)` → GET `/{controller}/all?jobRoleId={id}`

**JobRole extension**: `getByInstituteType(instituteTypeId)` → uses `getAllList({ instituteTypeId })`

---

## Admin Enquiry Service

**File**: `src/api/Services/adminEnquiryService.js`

Unified service for complaint, career, contact, and feedback enquiries.

### Endpoint Configuration

| Form Type | List Endpoint | Detail Endpoint | Active Status | ID Field |
|-----------|--------------|-----------------|---------------|----------|
| complaint | `/Complaint` | `/Complaint` | `/Complaint` | `cP_complaint_id` |
| career | `/CareerEnquiry` | `/CareerEnquiry` | `/CareerEnquiry` | `cE_career_enquiry_id` |
| contact | `/ContactEnquiry` | `/ContactEnquiry` | null | `cN_contact_enquiry_id` |

## API Response Format (Inferred)

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Payload - object or array
  }
}
```

### Paginated Response
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

### Error Response (normalized by axios interceptor)
```json
{
  "message": "Error description",
  "status": 400,
  "errors": { /* validation errors */ },
  "data": { /* raw backend error data */ }
}
```

---

## API Service Files Summary

| File | Endpoints Covered |
|------|------------------|
| `src/api/authApi.js` | `/Auth/login`, `/EmailOtp/*`, `/Auth/UpdatePasswordyEmail` |
| `src/api/applicationApi.js` | `/Application` |
| `src/api/employerApi.js` | `/Employer` |
| `src/api/jobRequirementApi.js` | `/JobRequirement` |
| `src/api/complaintApi.js` | `/Complaint`, `/ComplaintCategory/all` |
| `src/api/feedbackApi.js` | `/Feedback` |
| `src/api/Services/adjobseekerApi.js` | `/Jobseeker` |
| `src/api/Services/adminemployeelistApi.js` | `/Employer` |
| `src/api/Services/adminEnquiryService.js` | `/Complaint`, `/CareerEnquiry`, `/ContactEnquiry`, `/Feedback`, `/RequestStatus` |
| `src/api/Services/createMasterApi.js` | Generic `/{controller}` CRUD |
| `src/api/Services/cityMasterApi.js` | `/CityMaster` |
| `src/api/Services/countryMasterApi.js` | `/CountryMaster` |
| `src/api/Services/stateMasterApi.js` | `/StateMaster` |
| `src/api/Services/jobCategoryApi.js` | `/JobCategory` |
| `src/api/Services/jobRoleApi.js` | `/JobRole` |
| `src/api/Services/jobStatusApi.js` | `/JobStatus` |
| `src/api/Services/employmentTypeApi.js` | `/EmploymentType` |
| `src/api/Services/instituteTypeApi.js` | `/InstituteType` |
| `src/api/Services/userTypeApi.js` | `/UserType` |
| `src/api/Services/complaintCategoryApi.js` | `/ComplaintCategory` |

---

## Limitations

- Backend DTOs, validation rules, and exact response schemas are not available from the frontend repository.
- Field names in API responses use .NET-style naming conventions (e.g., `eM_employer_id`, `jB_jobseeker_id`, `Fb_requester_id`).
- The frontend normalizes inconsistent casing (e.g., `jB_jobseeker_id` vs `jS_jobseeker_id` vs `jobseeker_id`).
- No OpenAPI/Swagger documentation is available in this repository.
| feedback | `/Feedback/GetAllFeedbackPagination` | `/Feedback` | null | `fB_feedback_id` |

### Methods

| Method | Endpoint | Description |
|--------|----------|-------------|
| `list(formType, page, limit)` | `/{list}?pageNo&pageSize` | Paginated list |
| `getById(formType, id)` | `/{detail}/{id}` | Detail view |
| `setActive(formType, id, isActive)` | `/{activeStatus}/{id}/active-status?isActive` | Toggle active |
| `updateCareerStatus(enquiryId, payload)` | PUT `/CareerEnquiry/{id}/status` | Update career status |
| `updateCareerResponse(enquiryId, responseRetun, userId)` | PATCH `/CareerEnquiry/{id}/UpdateResponseAsync` | Patch career response |
| `updateEnquiryStatus(formType, enquiryId, payload)` | PUT `/{detail}/{id}/status` | Update enquiry status |
| `updateEnquiryResponse(formType, enquiryId, responseRetun, userId)` | PATCH `/{detail}/{id}/UpdateResponseAsync` | Patch enquiry response |
| `getRequestStatuses()` | GET `/RequestStatus` | Get available statuses |
| `openFile(formType, id)` | GET `/{file}/{id}/file` (responseType: blob) | Open attached file |
### POST /Complaint
**File**: `src/api/complaintApi.js` — `submitComplaint(formData)`

Submit complaint (multipart/form-data).

---

### GET /Complaint
**File**: `src/api/complaintApi.js` — `getComplaintsByUserId(userId, pageNo, pageSize)`

Paginated complaints by user.

**Query Parameters**: `complainer` (userId), `pageNo`, `pageSize`

---

### GET /Complaint/{complaintId}
**File**: `src/api/complaintApi.js` — `getComplaintById(complaintId)`

Get complaint by ID.

---

## Feedback API

### POST /Feedback
**File**: `src/api/feedbackApi.js` — `submitFeedback(payload)`

Submit feedback.

---

### GET /Feedback/GetAllFeedbackPagination
**File**: `src/api/feedbackApi.js` — `getFeedbackByUserId(userId, pageNo, pageSize)`

Paginated feedback by user.

**Query Parameters**: `Fb_requester_id` (userId), `pageNo`, `pageSize`

---

### GET /Feedback/{feedbackId}
**File**: `src/api/feedbackApi.js` — `getFeedbackById(feedbackId)`

Get feedback by ID.
**File**: `src/api/Services/jobRequirementApi.js` — `getAllList()`

All job requirements (for dropdowns).

---

### GET /JobRequirement/{id}
**File**: `src/api/Services/jobRequirementApi.js` — `getById(id)`

Get job requirement by ID.

---

### GET /JobRequirement/employer/{employerId}
**File**: `src/api/Services/jobRequirementApi.js` — `getByEmployerId(employerId)`

Get jobs by employer ID.

---

### POST /JobRequirement
**File**: `src/api/Services/jobRequirementApi.js` — `create(formData)`

Create job requirement (multipart/form-data).

---

### PUT /JobRequirement/{id}
**File**: `src/api/Services/jobRequirementApi.js` — `update(id, formData)`

Update job requirement (multipart/form-data).

---

### PATCH /JobRequirement/{id}/active
**File**: `src/api/Services/jobRequirementApi.js` — `toggleActive(id, isActive)`

Activate/deactivate job requirement.

---

### PUT /JobRequirement/{id}/status-deadline
**File**: `src/api/Services/jobRequirementApi.js` — `updateStatusAndDeadline(id, payload)`

Update job status and deadline.

Create new job seeker with CV file upload.

**Content-Type**: `multipart/form-data`

**Request**: FormData with job seeker fields + CV file

---

### PUT /Jobseeker/{id}
**File**: `src/api/Services/adjobseekerApi.js` — `update(id, formData)`

Update job seeker (multipart/form-data).

**Content-Type**: `multipart/form-data`

---

### PATCH /Jobseeker/{id}/active
**File**: `src/api/Services/adjobseekerApi.js` — `toggleActive(id, isActive)`

Activate/deactivate job seeker.

**Query Parameters**: `isActive` (boolean)
---

### POST /EmailOtp/verify-otp
**File**: `src/api/authApi.js` — `verifyForgotPasswordOtpApi(email, otp)`

Verifies OTP sent to email.

**Request Body**:
```json
{
  "email": "string (required)",
  "otp": "string (required)"
}
```

---

### PATCH /Auth/UpdatePasswordyEmail
**File**: `src/api/authApi.js` — `updatePasswordByEmailApi(email, pass)`

Resets password via email (form body, not query string).

**Query Parameters**: `email`, `pass`