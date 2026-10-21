# Project Overview

## Project Name

**ishraq-admin-panel** — Administrative frontend for the Ishraq HR recruitment portal.

## Purpose

The Ishraq Admin Panel is a React-based single-page application (SPA) that provides role-based administrative interfaces for managing job seekers, employers, job requirements, applications, enquiries, feedback, and master data. It serves as the frontend client for the Ishraq HR backend API.

## Business Problem

Ishraq HR operates a recruitment platform connecting job seekers with employers. The admin panel enables:

- **Administrators** to oversee users, employers, job seekers, master data, and system enquiries.
- **Employers** to post job requirements, review applications, manage their organization profile, and submit feedback/complaints.
- **Job Seekers** to browse jobs, apply, manage their profile/resume, and track applications.

The frontend consumes a RESTful backend API to perform all data operations. It does not contain backend code or a database — it is a pure frontend client.

## Target Users and Roles

| Role | Description | Dashboard Path |
|------|-------------|----------------|
| **Admin** | Full system oversight: manage users, employers, job seekers, master data, enquiries | `/admin/dashboard` |
| **Employer** | Post jobs, review applications, manage organization profile | `/employer/dashboard` |
| **Job Seeker** | Browse and apply to jobs, manage profile/resume | `/jobseeker/dashboard` |

## Major Modules and Features

### Admin Module
- **Dashboard**: Overview statistics and charts (sample/mock data)
- **Users**: User management with search, filter, pagination, status toggle
- **Job Seekers**: List, add, view details (including documents/resume), activate/deactivate
- **Employers**: List, create, view details, activate/deactivate
- **Job Requirements**: List, create, edit, view, toggle active status
- **Job Applicants**: View applicants per job requirement
- **Master Data**: CRUD for cities, countries, states, job categories, job roles, job statuses, employment types, institute types, user types, complaint categories
- **Enquiries**: Career, contact, complaint, and feedback enquiry management
- **Reports**: Reporting section

### Employer Module
- **Dashboard**: Job statistics, vacancy charts (sample/mock data)
- **Jobs**: Create, edit, view, list own job requirements
- **Applications**: View applications for posted jobs
- **Organization Profile**: View and edit organization details
- **Profile Progress**: Track profile completion percentage
- **Feedback**: Submit and view feedback
- **Complaints**: Submit and view complaints

### Job Seeker Module
- **Dashboard**: Job recommendations and application tracking (sample/mock data)
- **Profile**: View and edit personal profile
- **Applied Jobs**: View and track job applications
- **Jobs For You**: Browse recommended jobs
- **Resume**: Upload and manage resume/documents
- **Feedback**: Submit and view feedback
- **Complaints**: Submit and view complaints

### Authentication Module
- Login (role-based: admin, employer, jobseeker)
- Register (placeholder page)
- Forgot password (OTP-based email reset)
- Verify email
- Reset password
- Unauthorized access page

## Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | React | ^19.3.0 |
| Router | React Router DOM | ^7.18.4 |
| Build Tool | react-scripts (Create React App) | 5.0.1 |
| Styling | Tailwind CSS | ^3.4.19 |
| HTTP Client | Axios | ^1.20.0 |
| Icons | Lucide React | ^1.47.0 |
| Charts | Recharts | ^2.15.4 |
| Notifications | React Hot Toast | ^2.6.1 |
| Date Library | Day.js | ^1.11.23 |
| Excel Export | XLSX | ^0.18.5 |
| Testing | @testing-library/react, jest | ^16.3.3, jest-dom |

## Key Dependencies and Integrations

- **Backend API**: REST API at `https://localhost:44367/api` (configured via `REACT_APP_API_BASE_URL`)
- **File Uploads**: Multipart form-data for CV/resume and job requirement attachments
- **External Links**: Employer and jobseeker registration links point to `https://ishraqhr.com/`
- **Fonts**: Manrope (Google Fonts)
- **Toast Notifications**: React Hot Toast positioned top-right

## Current Implementation Status

| Area | Status | Notes |
|------|--------|-------|
| Frontend build | ✅ Compiles successfully | `npx react-scripts build` passes |
| Authentication | ✅ Implemented | Role-based login, localStorage session |
| API integration | ✅ Implemented | Axios instance with interceptors |
| Admin module | ✅ Implemented | Full CRUD for most entities |
| Employer module | ✅ Implemented | Dashboard, jobs, applications, profile |
| Job seeker module | ✅ Implemented | Dashboard, profile, applications, jobs |
| Master data | ✅ Implemented | Generic CRUD factory pattern |
| Enquiries/Feedback/Complaints | ✅ Implemented | List, detail, status toggle |
| Backend code | ❌ Not included | This is a frontend-only repository |
| Database | ❌ Not included | Backend concern |
| Unit tests | ⚠️ Partial | Test files exist but coverage is limited |
| E2E tests | ❌ Not implemented | No end-to-end test suite |

## Known Technical Notes

- **Document URL resolution**: The `JobSeekerDetails.jsx` page includes a `toAbsoluteUrl()` helper to resolve relative document URLs (e.g., `uploads/jobseeker-cvs/....pdf`) against the backend origin (`https://localhost:44367`).
- **Hardcoded API origin**: `API_ORIGIN` is currently hardcoded in `JobSeekerDetails.jsx`; consider moving to environment variables for multi-environment deployments.
- **Sample/mock data**: Admin, employer, and jobseeker dashboards currently use hardcoded sample data instead of live API calls (marked with comments: "Sample data (replace with your API)").
- **Users page**: Uses seed/mock data (`SEED_USERS`) rather than fetching from the API.
