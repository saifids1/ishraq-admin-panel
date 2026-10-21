# Ishraq Admin Panel

An administrative frontend for the Ishraq HR recruitment portal — a role-based React application for managing job seekers, employers, job requirements, applications, enquiries, feedback, and master data.

## Project Summary

**ishraq-admin-panel** is a React-based single-page application (SPA) that serves as the administrative interface for the Ishraq HR recruitment platform. It provides three role-based dashboards:

- **Admin**: Full system oversight — manage users, employers, job seekers, master data, and system enquiries
- **Employer**: Post jobs, review applications, manage organization profile, submit feedback/complaints
- **Job Seeker**: Browse and apply to jobs, manage profile/resume, track applications

The frontend consumes a RESTful backend API at `https://localhost:44367/api` (configurable via environment variables).

## Key Features

| Module | Features |
|--------|----------|
| **Authentication** | Role-based login (Admin/Employer/Job Seeker), OTP-based forgot password, session persistence |
| **Admin Dashboard** | System overview, user/job seeker/employer management, job requirements, master data CRUD, enquiry management, reports |
| **Employer Dashboard** | Job posting, application management, organization profile, profile progress tracking, feedback/complaints |
| **Job Seeker Dashboard** | Job search, applications, profile/resume management, feedback/complaints |
| **Master Data** | Generic CRUD for cities, countries, states, job categories, roles, statuses, employment types, institute types, user types, complaint categories |
| **Documents** | Resume/CV upload and management with View/Download links |

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | ^19.3.0 |
| Routing | React Router DOM | ^7.18.4 |
| Build Tool | react-scripts (Create React App) | 5.0.1 |
| Styling | Tailwind CSS | ^3.4.19 |
| HTTP Client | Axios | ^1.20.0 |
| Icons | Lucide React | ^1.47.0 |
| Charts | Recharts | ^2.15.4 |
| Notifications | React Hot Toast | ^2.6.1 |
| Excel Export | XLSX | ^0.18.5 |
| Testing | @testing-library/react, jest-dom | ^16.3.3 |

## High-Level Architecture

\`\`\`
┌─────────────────┐      HTTPS/API      ┌──────────────────┐
│   Browser       │ ◄──────────────────► │  Backend API    │
│  (React SPA)    │                      │  (localhost:44367)│
└─────────────────┘                      └──────────────────┘
         │
         ▼
┌─────────────────┐
│  AuthContext    │  Session (localStorage)
│  (Auth state)   │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Axios Instance │  HTTP client + error interceptor
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  API Services   │  auth, applications, employers, jobs,
│  (CRUD layer)   │  job seekers, master data, enquiries
└─────────────────┘
\`\`\`

## Prerequisites

- Node.js 16+ (recommended 18+)
- npm 8+
- Backend API running at `https://localhost:44367/api` (or configured URL)

## Quick Setup

\`\`\`bash
# 1. Clone the repository
git clone https://github.com/IDS-Farah/ishraq-admin-panel.git
cd ishraq-admin-panel

# 2. Install dependencies
npm install

# 3. Configure environment (review .env)
# REACT_APP_API_BASE_URL=https://localhost:44367/api

# 4. Start development server
npm start

# 5. Open http://localhost:3000
\`\`\`

## Available Scripts

| Script | Description |
|--------|-------------|
| \`npm start\` | Start development server (port 3000) |
| \`npm run dev\` | Same as start |
| \`npm run build\` | Production build to \`build/\` folder |
| \`npm test\` | Run test suite |
| \`npm run eject\` | Eject build configuration (one-way) |

## Documentation

Comprehensive documentation is available in the \`docs/\` folder:

| Document | Description |
|----------|-------------|
| [docs/README.md](./docs/README.md) | Documentation index |
| [docs/project-overview.md](./docs/project-overview.md) | Project purpose, business problem, tech stack |
| [docs/requirements-and-features.md](./docs/requirements-and-features.md) | Module-by-module features and business rules |
| [docs/system-architecture.md](./docs/system-architecture.md) | Architecture, data flow, Mermaid diagrams |
| [docs/folder-structure.md](./docs/folder-structure.md) | Directory layout and file responsibilities |
| [docs/frontend-documentation.md](./docs/frontend-documentation.md) | React setup, routing, pages, components |
| [docs/backend-documentation.md](./docs/backend-documentation.md) | Backend integration notes (frontend-only repo) |
| [docs/api-documentation.md](./docs/api-documentation.md) | API reference: endpoints, payloads, responses |
| [docs/database-documentation.md](./docs/database-documentation.md) | Database notes (backend concern) |
| [docs/authentication-and-authorization.md](./docs/authentication-and-authorization.md) | Auth flow, roles, protected routes |
| [docs/business-workflows.md](./docs/business-workflows.md) | End-to-end workflows with diagrams |
| [docs/setup-and-installation.md](./docs/setup-and-installation.md) | Prerequisites, installation, running the app |
| [docs/environment-configuration.md](./docs/environment-configuration.md) | Environment variables and configuration |
| [docs/testing-and-troubleshooting.md](./docs/testing-and-troubleshooting.md) | Test commands, known issues, troubleshooting |
| [docs/deployment-guide.md](./docs/deployment-guide.md) | Build and deployment process |

## License

This project is private and proprietary.
