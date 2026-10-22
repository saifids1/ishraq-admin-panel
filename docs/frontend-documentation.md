# Frontend Documentation

## Framework and Entry Points

### Application Entry Point

- **`src/main.jsx`**: React DOM root render. Renders `<App />` inside `React.StrictMode` mounted to `document.getElementById("root")`.
- **`src/App.jsx`**: Root component. Contains `<Toaster>` (react-hot-toast) and `<AppRoutes />`.

### Build Tool

- **react-scripts** (Create React App) v5.0.1
- Scripts: `start`, `dev`, `build`, `test`, `eject`

## Routing and Navigation

### Route Structure

```
AppRoutes (BrowserRouter)
├── AuthRoutes (public)          → /login, /admin/login, /register, /forgot-password
├── AdminRoutes (protected: admin) → /admin/*
├── JobSeekerRoutes (protected: jobseeker) → /jobseeker/*
├── EmployerRoutes (protected: employer) → /employer/*
├── /unauthorized → Unauthorized
├── / → redirect to /login
└── * → NotFound
```

### Route Guards


## Pages by Role

### Admin Pages (`src/pages/admin/`)

| Page | File | Route | Purpose |
|------|------|-------|---------|
| Dashboard | Dashboard/AdminDashboard.jsx | /admin/dashboard | System overview (sample data) |
| Users | Users/Users.jsx | /admin/users | User management |
| User Details | Users/UserDetails.jsx | /admin/users/:id/view | View user details |
| Edit User | Users/EditUser.jsx | /admin/users/edit/:id | Edit user |
| Job Seekers | JobSeekers/JobSeekers.jsx | /admin/jobseekers | Job seeker list |
| Add Job Seeker | JobSeekers/AddJobSeeker.jsx | /admin/jobseekers/add | Create job seeker |
| Job Seeker Details | JobSeekers/JobSeekerDetails.jsx | /admin/jobseekers/:id | Job seeker profile + documents |
| Employer List | Employer/EmployerList.jsx | /admin/employer | Employer list |
| Employer Details | Employer/EmployerDetails.jsx | /admin/employer/:id | Employer details |
| Create Employer | Employer/CreateEmployer.jsx | /admin/employer/add | Create employer |
| Job Requirement List | JobRequirement/JobRequirementList.jsx | /admin/job-requirements | Job listing |
| Create Job Requirement | JobRequirement/Jobrequirementcreate.jsx | /admin/job-requirements/create | Create job |
| Job Applicants | JobRequirement/JobApplicantList.jsx | /admin/job-requirements/:id/applicants | View applicants |
| Master Data Form | MasterData/MasterDataForm.jsx | /admin/settings/master/* | Generic CRUD for master data |
| City List | MasterData/City/CityList.jsx | /admin/settings/master/cityMaster | City CRUD |
| Country List | MasterData/Country/CountryList.jsx | /admin/settings/master/countryMaster | Country CRUD |
| State List | MasterData/State/StateList.jsx | /admin/settings/master/stateMaster | State CRUD |
| Job Category | MasterData/JobCategory/JobCategoryList.jsx | /admin/settings/master/jobCategory | Category CRUD |
| Job Role | MasterData/JobRole/JobRoleList.jsx | /admin/settings/master/jobRole | Role CRUD |
| Job Status | MasterData/JobStatus/JobStatusList.jsx | /admin/settings/master/jobStatus | Status CRUD |
| Employment Type | MasterData/EmploymentType/EmploymentTypeList.jsx | /admin/settings/master/employmentType | Type CRUD |
| Institute Type | MasterData/InstituteType/InstituteTypeList.jsx | /admin/settings/master/instituteType | Type CRUD |
| User Type | MasterData/UserType/UserTypeList.jsx | /admin/settings/master/userType | Type CRUD |
| Complaint Category | MasterData/ComplaintCategory/ComplaintCategoryList.jsx | /admin/settings/master/complaintCategory | Category CRUD |
| Career Enquiry List | Enquiries/Career/CareerEnquiryList.jsx | /admin/career | Career enquiries |
| Career Enquiry Details | Enquiries/Career/CareerEnquiryDetails.jsx | /admin/career/:id | Career enquiry detail |
| Contact Enquiry List | Enquiries/Contact/ContactEnquiryList.jsx | /admin/contact | Contact enquiries |
| Contact Enquiry Details | Enquiries/Contact/ContactEnquiryDetails.jsx | /admin/contact/:id | Contact enquiry detail |
| Complaint List | Enquiries/Complaints/ComplaintList.jsx | /admin/complaints | Complaint list |
| Complaint Details | Enquiries/Complaints/ComplaintDetails.jsx | /admin/complaints/:id | Complaint detail |
| Feedback List | Enquiries/Feedback/FeedbackList.jsx | /admin/feedback | Feedback list |

### Employer Pages (`src/pages/employer/`)

| Page | File | Route | Purpose |
|------|------|-------|---------|
| Dashboard | Dashboard/EmployerDashboard.jsx | /employer/dashboard | Employer overview (sample data) |
| Profile | Dashboard/Profile/Profile.jsx | /employer/profile | Employer profile |
| Edit Profile | Dashboard/Profile/EditProfile.jsx | /employer/profile/edit | Edit profile |
| Profile Progress | Dashboard/EmployerProfileProgress.jsx | — | Profile completion % |
| My Jobs | Dashboard/Jobs/MyJobs.jsx | /employer/jobs | Employer's job list |
| Create Job | Dashboard/Jobs/CreateJob.jsx | /employer/job-requirements/create | Create job |
| Edit Job | Dashboard/Jobs/EditJob.jsx | /employer/job-requirements/:id/edit | Edit job |
| Job Details | Dashboard/Jobs/JobDetails.jsx | /employer/job-requirements/:id | View job |
| Candidates | Dashboard/Jobs/Candidates.jsx | — | Job candidates |
| Candidate Details | Dashboard/Jobs/CandidateDetails.jsx | — | Candidate detail |
| Shortlisted | Dashboard/Jobs/Shortlisted.jsx | — | Shortlisted candidates |
| Applications | Applications/Applications.jsx | — | Applications list |
| Application Details | Applications/ApplicationDetails.jsx | — | Application detail |
| Organization Details | OrganizationDetails/OrganizationDetails.jsx | /employer/organization-profile | Org profile |
| Edit Organization | OrganizationDetails/EditOrganization.jsx | /employer/organization-profile/edit/:id | Edit org |
| Feedback List | Feedback/FeedbackList.jsx | /employer/feedback-list | Feedback list |
| Feedback Details | Feedback/FeedbackDetails.jsx | /employer/feedback/:id | Feedback detail |
| Create Feedback | Feedback/CreateFeedback.jsx | /employer/feedback-add | Create feedback |
| Complaint List | Complaints/ComplaintList.jsx | /employer/complaint-list | Complaint list |
| Complaint Details | Complaints/ComplaintDetails.jsx | /employer/complaints/:id | Complaint detail |
| Create Complaint | Complaints/CreateComplaint.jsx | /employer/complaint-add | Create complaint |
| Job Requirement List | JobRequirement/JobRequirementList.jsx | /employer/job-requirement-list | Job list |
| Create Job Req | JobRequirement/Jobrequirementcreate.jsx | /employer/job-requirements/create | Create job |
| Edit Job Req | JobRequirement/Jobrequirementedit.jsx | /employer/job-requirements/:id/edit | Edit job |
| View Job Req | JobRequirement/Jobrequirementview.jsx | /employer/job-requirements/:id | View job |
| Settings | Settings/EmployerSetting.jsxs | — | Employer settings |

### Job Seeker Pages (`src/pages/jobseeker/`)

| Page | File | Route | Purpose |
|------|------|-------|---------|
| Dashboard | Dashboard/JobSeekerDashboard.jsx | /jobseeker/dashboard | Job seeker overview (sample data) |
| Profile | Profile/Profile.jsx | /jobseeker/profile/:id | Job seeker profile |
| Edit Profile | Profile/EditProfile.jsx | /jobseeker/profile/:id/edit | Edit profile |
| Applied Jobs | AppliedJobs/JobseekerAppliedJobs.jsx | /jobseeker/applied-jobs | Applied jobs list |
| View Application | AppliedJobs/ViewAppliedJob.jsx | /jobseeker/applications/:applicationId | Application detail |
| Jobs For You | JobsForYou/JobsForYou.jsx | /jobseeker/job-list | Recommended jobs |
| Job Details | JobsForYou/JobDetails.jsx | /jobseeker/jobs/:id | Job detail |
| Resume | Resume/Resume.jsx | — | Resume management |
| Feedback List | Feedback/FeedbackList.jsx | /jobseeker/feedback-list | Feedback list |
| Feedback Details | Feedback/FeedbackDetails.jsx | /jobseeker/feedback/:id | Feedback detail |
| Create Feedback | Feedback/CreateFeedback.jsx | /jobseeker/feedback-add | Create feedback |
| Complaint List | Complaints/ComplaintList.jsx | /jobseeker/complaint-list | Complaint list |
| Complaint Details | Complaints/ComplaintDetails.jsx | /jobseeker/complaints/:id | Complaint detail |
| Create Complaint | Complaints/Complaints/CreateComplaint.jsx | /jobseeker/complaint-add | Create complaint |
| Settings | Settings/Settings.jsx | — | Job seeker settings |

### Auth Pages (`src/pages/auth/`)

| Page | File | Route | Purpose |
|------|------|-------|---------|
| Login | Login.jsx | /login, /admin/login | Role-based login |
| Register | Register.jsx | /register | Placeholder |
| Forgot Password | ForgotPassword.jsx | /forgot-password | OTP password reset |
| Verify Email | VerifyEmail.jsx | — | Placeholder |
| Reset Password | ResetPassword.jsx | /admin/reset-password | Fetches job seekers + employers via API, allows admin to reset user passwords via PATCH /Auth/UpdatePasswordyEmail |

## Reusable Components

### `src/components/common/`

| Component | Purpose |
|-----------|---------|
| ProtectedRoute | Role-based route guard |
| Dashboardkit | Dashboard UI kit: stat cards, charts, panels, animations |
| DataListPage | Reusable data list: search, filter, pagination, status toggle, Excel export |
| FormUi | Form UI: Card, PageHeader, Field, IconField, Pill, Toast, ReadOnlyValue |
| SelectField | Accessible custom select dropdown with keyboard navigation |
| StatusModal | Modal dialog: success/error/warning/info/activate/deactivate/delete |

## State Management

### Authentication State

- **AuthContext** (`src/context/AuthContext.jsx`): React context for user session
- Provides: `user`, `login()`, `logout()`, `loading`, `isAuthenticated`
- Persisted in `localStorage` under key `"user"`

### Local Component State

- Pages use `useState`, `useEffect`, `useCallback`, `useMemo` for local state
- No global state management library (Redux, Zustand, etc.) is used

### Data Fetching

- No dedicated data fetching library (React Query, SWR, etc.)
- API calls made directly via `axiosInstance` in page components or custom hooks
- `useAdminList` hook (`src/hooks/useAdminList.js`): Reusable pattern for list data loading with loading/error states

## API Integration

### Axios Instance (`src/api/axiosInstance.js`)

```javascript
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "https://localhost:44367/api",
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});
```

### Response Interceptor

Normalizes error responses:
```javascript
{
  message: string,    // Error message
  status: number,     // HTTP status
  errors: any,        // Validation errors
  data: any           // Raw error data
}
```

### API Response Helpers (`src/api/utils/apiHelpers.js`)

| Function | Description |
|----------|-------------|
| `getApiData(response)` | Extracts `response.data.data` |
| `getPageData(response)` | Extracts paginated list with items, pageNo, pageSize, totalRecords, totalPages |
| `getApiMessage(response)` | Extracts response message |
| `getApiErrorMessage(error)` | Extracts error message |

### File Uploads

Multipart/form-data used for:
- Job seeker creation (CV file)
- Job requirement creation/update (attachments)
- Complaint submission (attachments)

Header override: `Content-Type: multipart/form-data` per request to allow browser to set boundary.

## Form Validation and User Feedback

### Form Validation

- HTML5 `required` attribute on inputs
- No form library (Formik, React Hook Form, etc.) is used
- Manual validation in component submit handlers

### User Feedback

- **react-hot-toast**: Toast notifications positioned top-right
- Custom toast components in `DataListPage.jsx` and `FormUi.jsx`
- Status modals via `StatusModal.jsx`
- Error messages displayed inline below form fields

## Styling Approach

### Tailwind CSS

- **Configuration**: `tailwind.config.js` with custom color palette (primary: `#2f6b8a`)
- **Processing**: PostCSS with Tailwind and Autoprefixer
- **Purge**: Content paths `./src/**/*.{js,jsx,ts,tsx}`

### Custom CSS

- `src/index.css`: Tailwind directives + custom animations (js-row-in, js-fade, js-pop, js-halo, js-ping, js-flash, js-toast)
- Font: Manrope (Google Fonts)

### Design Tokens

- Primary color: `#2f6b8a` (blue-slate)
- Accent variants: `#25566f`, `#2c6b8a`, `#3b86a6`
- Status colors: emerald (success), rose (danger), amber (warning), slate (neutral)
- Border radius: `rounded-lg`, `rounded-2xl`, `rounded-full`
- Spacing: Tailwind spacing scale

### Responsive Design

- Mobile-first Tailwind classes
- Grid layouts: `grid-cols-1`, `lg:grid-cols-2`, `lg:grid-cols-4`
- Hidden elements at breakpoints: `sm:`, `md:`, `lg:`
- `overflow-x-auto` for tables on small screens

## Authentication Guards

- All role-based routes are wrapped in `ProtectedRoute` with `allowedRole` prop
- Auth layout wraps public routes
- Role-based redirects after login (defined in `Login.jsx` `DASHBOARD_ROUTES`)

## Known Issues and Gaps

| Area | Issue |
|------|-------|
| Dashboard data | Admin, employer, jobseeker dashboards use hardcoded sample data |
| Users page | Uses seed data (`SEED_USERS`) instead of API |
| Token attachment | Axios instance doesn't auto-attach Authorization header |
| Config reference | `MasterDataForm.jsx` imports `masterConfig` from `../../../config/masterConfig` which may not exist |
| No global state | No Redux/Zustand; prop drilling may occur in deep component trees |

| Unauthorized | Unauthorized.jsx | /unauthorized | Access denied |

### Error Pages (`src/pages/error/`)

| Page | File | Route | Purpose |
|------|------|-------|---------|
| Not Found | NotFound.jsx | * | 404 page |
| Server Error | ServerError.jsx | — | 500 page |

| Feedback Details | Enquiries/Feedback/FeedbackDetails.jsx | /admin/feedback/:id | Feedback detail |
| Reports | Reports/Reports.jsx | /admin/reports | Reports |
| Reset Password | ResetPassword/ResetPassword.jsx | /admin/reset-password | Reset password |

- `ProtectedRoute` (`src/components/common/ProtectedRoute.jsx`): Checks authentication + role match
- Redirects unauthenticated users to `/login`
- Redirects wrong-role users to `/unauthorized`

### Layouts

| Layout | Path | Used By |
|--------|------|---------|
| AdminLayout | `/admin/*` | Admin pages (sidebar + header + content) |
| EmployerLayout | `/employer/*` | Employer pages (sidebar + header + content) |
| JobSeekerLayout | `/jobseeker/*` | Job seeker pages (sidebar + header + content) |
| AuthLayout | `/login`, `/register`, etc. | Auth pages (centered container) |
