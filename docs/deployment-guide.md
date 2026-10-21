# Deployment Guide

## Overview

The Ishraq Admin Panel is a frontend-only React application. It is built as static assets and served by a web server. No backend code, database, or server-side rendering is included in this repository.

## Build Process

### Production Build

```bash
npm run build
```

This command:
1. Bundles React in production mode
2. Minifies output
3. Generates hashed filenames for cache busting
4. Outputs to the `build/` folder

### Build Output

```
build/
├── static/
│   ├── css/     # Minified CSS with hashes
│   ├── js/      # Minified JavaScript with hashes
│   └── media/   # Images, fonts, etc.
├── index.html   # HTML entry point
├── favicon.ico
├── logo.svg
├── manifest.json
└── robots.txt
```

## Environment Configuration for Production

### Environment Variables

Environment variables are embedded at build time. To change `REACT_APP_API_BASE_URL` for production:

1. Update `.env`:
   ```env
   REACT_APP_API_BASE_URL=https://your-production-api.com/api
   ```

2. Rebuild:
   ```bash
   npm run build
   ```

**Important**: Create React App embeds environment variables at build time. Changing `.env` after building requires a rebuild.

### Document URL Configuration

The `JobSeekerDetails.jsx` page uses `API_BASE_URL` for document URLs. For production:

```javascript
const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  "";
```

Ensure this points to the backend origin (without `/api` path):
- Development: `https://localhost:44367`
- Production: `https://your-production-api.com`

## Hosting Requirements

### Static File Hosting

The `build/` folder contains static HTML, CSS, and JavaScript. It can be hosted on:

- **Nginx**: Serve `build/` as static files, configure SPA fallback
- **Apache**: Serve `build/` as static files, configure `.htaccess` for SPA fallback
- **IIS**: Serve `build/` with URL rewrite for SPA routing
- **Azure Static Web Apps**: Connect GitHub repo, build with `npm run build`, serve `build/`
- **AWS S3 + CloudFront**: Upload `build/` to S3, serve via CloudFront
- **Netlify/Vercel**: Connect GitHub repo, auto-deploy on push

### SPA Routing Configuration

Since the app uses React Router with browser history, the server must be configured to serve `index.html` for all routes (SPA fallback). Without this, refreshing on a sub-route (e.g., `/admin/dashboard`) returns 404.

**Nginx example**:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Apache `.htaccess` example**:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

## HTTPS Requirements

The backend API uses HTTPS (`https://localhost:44367`). For production:

- Serve the frontend over HTTPS
- Ensure the backend API is accessible over HTTPS
- Mixed content (HTTP frontend calling HTTPS backend) may cause browser CORS/security errors

## Build and Deploy Checklist

| Step | Action | Verified |
|------|--------|----------|
| 1 | Update `.env` with production `REACT_APP_API_BASE_URL` | |
| 2 | Run `npm run build` | |
| 3 | Test build output locally (serve `build/` folder) | |
| 4 | Deploy `build/` contents to static hosting | |
| 5 | Configure SPA fallback (redirect all routes to `index.html`) | |
| 6 | Verify HTTPS is enabled | |
| 7 | Test login and key workflows | |
| 8 | Verify document View/Download links resolve to backend | |

## Rollback Considerations

- The `build/` folder is versioned with hashed filenames
- To rollback, redeploy the previous `build/` folder
- Environment variables are embedded in the build, so rollback also rolls back configuration

## Monitoring and Logging

- Frontend errors: Browser console, react-hot-toast notifications
- No server-side logging (frontend only)
- No APM or monitoring tools integrated
- Consider adding: Sentry for error tracking, Google Analytics for usage

## Deployment Verification

After deployment:

1. Open the application URL
2. Verify login page loads
3. Test login with each role (admin, employer, jobseeker)
4. Verify API calls succeed (check Network tab)
5. Verify document View/Download links work
6. Verify all major navigation routes work
7. Test on mobile and desktop browsers
