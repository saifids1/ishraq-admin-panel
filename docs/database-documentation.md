# Database Documentation

## Overview

**This is a frontend-only repository.** No database, database configuration, ORM, migrations, or seed scripts are included in this workspace. The database is managed by the backend API, whose source code is not part of this project.

## Database Engine

Not determinable from the frontend source code. The backend (at `https://localhost:44367`) manages data persistence.

## Inferred Data Entities

Based on the API endpoints used by the frontend, the following database entities are inferred to exist on the backend:

| Entity | Inferred Table/Collection | API Endpoint |
|--------|--------------------------|--------------|
| User / Account | Users | `/Auth/login`, `/Jobseeker`, `/Employer` |
| Job Seeker | JobSeekers | `/Jobseeker` |
| Employer | Employers | `/Employer` |
| Job Requirement | JobRequirements | `/JobRequirement` |
| Application | Applications | `/Application` |
| Complaint | Complaints | `/Complaint` |
| Complaint Category | ComplaintCategories | `/ComplaintCategory` |
| Feedback | Feedback | `/Feedback` |
| Career Enquiry | CareerEnquiries | `/CareerEnquiry` |
| Contact Enquiry | ContactEnquiries | `/ContactEnquiry` |
| City | CityMasters | `/CityMaster` |
| Country | CountryMasters | `/CountryMaster` |
| State | StateMasters | `/StateMaster` |
| Job Category | JobCategories | `/JobCategory` |
| Job Role | JobRoles | `/JobRole` |
| Job Status | JobStatuses | `/JobStatus` |
| Employment Type | EmploymentTypes | `/EmploymentType` |
| Institute Type | InstituteTypes | `/InstituteType` |
| User Type | UserTypes | `/UserType` |
| Request Status | RequestStatuses | `/RequestStatus` |

## Inferred Relationships

Based on API parameter patterns and frontend code:

| Relationship | Evidence |
|--------------|----------|
| Job Seeker → User | Jobseeker API uses user ID fields |
| Employer → User | Employer API uses user ID fields (`eM_user_id`) |
| Job Requirement → Employer | `GET /JobRequirement/employer/{employerId}` |
| Application → Job Seeker | `GET /Application?jobseekerId={id}` |
| Application → Job Requirement | `GET /Application?jobdesc_Id={id}` |
| Job Role → Institute Type | `jobRoleApi.getByInstituteType()` uses `?instituteTypeId` |
| Job Category → Job Role | `jobCategoryApi.getByJobRole()` uses `?jobRoleId` |
| City → State → Country | Master data hierarchy inferred from separate master entities |

## Inferred Field Names

From frontend response normalization code:

### Job Seeker
- `jB_jobseeker_id`, `jS_jobseeker_id`, `jobseeker_id`, `jS_id`
- `fullName`, `jS_full_name`, `jS_name`
- `email`, `jS_email`
- `mobile`, `jS_mobile`
- `cityName`, `stateName`
- `jC_name`, `jobCategoryName`, `jobCategory`
- `jB_total_experience`, `jS_total_years_experience`, `totalYearsExpirence`
- `jB_is_active`, `jS_is_active`

### Employer
- `eM_employer_id`, `EM_employer_id`
- `eM_user_id`, `EM_user_id`
- `userName`, `UserName`
- `email`, `Email`
- `mobile`, `Mobile`
- `fullName`, `FullName`
- `eM_organization_name`, `EM_organization_name`
- `eM_institute_type_id`, `EM_institute_type_id`
- `eM_country_id`, `eM_state_id`, `eM_city_id`
- `eM_website`, `EM_website`
- `eM_created_at`, `eM_updated_at`, `eM_is_active`

### Job Requirement
- `position`, `jobStatusName`, `status`, `JQ_status`, `JS_name`
- `jQ_is_active`, `JQ_is_active`, `isActive`

## Limitations

- No database schema, migration files, or seed scripts exist in this repository.
- Column data types, constraints, indexes, and foreign keys cannot be verified.
- The backend database engine (SQL Server, PostgreSQL, MySQL, MongoDB, etc.) is unknown from this frontend code.

## Recommendation

Request database documentation from the backend team or access the backend repository for complete schema details.
