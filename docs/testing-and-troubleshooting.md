# Testing and Troubleshooting

## Test Framework

| Tool | Purpose |
|------|---------|
| Jest | Test runner (via react-scripts) |
| @testing-library/react | React component testing |
| @testing-library/jest-dom | DOM-specific assertions |
| @testing-library/user-event | User interaction simulation |

### Test Configuration

Defined in `package.json`:
```json
{
  "jest": {
    "moduleNameMapper": {
      "^react-router/dom$": "<rootDir>/node_modules/react-router/dist/development/dom-export.js"
    }
  }
}
```

### Test Files

| File | Purpose |
|------|---------|
| `src/App.test.js` | Application smoke test |
| `src/setupTests.js` | Test setup configuration |

### Running Tests

```bash
# Interactive watch mode
npm test

# Single run (CI mode)
CI=true npm test
```

## Linting

ESLint is configured with `react-app` and `react-app/jest` presets.

The `no-unused-vars` rule is disabled in `package.json`:
```json
{
  "eslintConfig": {
    "extends": ["react-app", "react-app/jest"],
    "rules": {
      "no-unused-vars": "off"
    }
  }
}
```

ESLint plugin is disabled via `.env`:
```
DISABLE_ESLINT_PLUGIN=true
```

## Build Commands

| Command | Purpose |
|---------|---------|
| `npm start` / `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm test` | Run tests |
| `npm run eject` | Eject build configuration (one-way) |

## Known Issues

### Verified Issues

| Issue | Location | Description | Workaround |
|-------|----------|-------------|------------|
| Document URLs may be relative | `JobSeekerDetails.jsx` | `doc.url` from backend can be a relative path (e.g., `uploads/jobseeker-cvs/....pdf`) that resolves against frontend origin instead of backend | `toAbsoluteUrl()` helper resolves against `https://localhost:44367` |
| Hardcoded API origin | `JobSeekerDetails.jsx` | `API_ORIGIN` may need to be environment-configurable for other deployments | Move to `.env` variable |
| Sample/mock data in dashboards | AdminDashboard, EmployerDashboard, JobSeekerDashboard | Dashboards use hardcoded sample data instead of live API calls | Replace with real API integration |
| Users page uses seed data | `Users.jsx` | `SEED_USERS` array instead of API call | Connect to user API |
| No automatic token attachment | `axiosInstance.js` | Axios instance doesn't attach Authorization header to requests | Add token interceptor if backend requires bearer tokens |
| `masterConfig` import may be missing | `MasterDataForm.jsx` | Imports from `../../../config/masterConfig` which may not exist | Verify file exists or remove import |

### Potential Risks

| Risk | Description | Recommendation |
|------|-------------|----------------|
| localStorage security | User data (including token) stored in localStorage, vulnerable to XSS | Consider httpOnly cookies for token storage |
| No session timeout | Sessions persist indefinitely until logout | Implement session expiration |
| No refresh token | No token refresh mechanism | Add refresh token rotation |
| Two API base URL configs | `axiosInstance.js` and `JobSeekerDetails.jsx` both reference API URL separately | Unify into single environment variable |
| No E2E tests | No end-to-end test suite | Consider Cypress or Playwright |

## Common Configuration Errors

### Error: "Cannot find module" or build failures

**Cause**: Dependencies not installed or `node_modules` is corrupted.

**Solution**:
```bash
# Windows PowerShell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Error: API requests failing with CORS or network errors

**Cause**: Backend not running, wrong URL, or HTTPS certificate issue.

**Solution**:
1. Verify backend is running at `https://localhost:44367`
2. Check `.env` has correct `REACT_APP_API_BASE_URL`
3. For self-signed certificates, you may need to bypass certificate validation in development

### Error: Port 3000 already in use

**Cause**: Another application is using port 3000.

**Solution**:
```powershell
# Windows PowerShell
$env:PORT=3001; npm start
```

### Error: Blank white screen

**Cause**: JavaScript runtime error during render.

**Solution**:
1. Open browser DevTools (F12)
2. Check Console tab for error details
3. Verify all API service imports resolve correctly
4. Check that the backend is accessible

### Error: Document links not working (View/Download)

**Cause**: Relative document URLs resolving against frontend origin instead of backend.

**Solution**:
1. Verify `toAbsoluteUrl()` is being called on document URLs in `JobSeekerDetails.jsx`
2. Confirm `API_BASE_URL` is set to `https://localhost:44367` (without `/api` path for document URLs)
3. Check browser console for 404 errors on document requests

## Performance Considerations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Bundle size | No code splitting implemented | Consider React.lazy() for route-based splitting |
| Image/font loading | Google Fonts (Manrope) loaded externally | Consider self-hosting fonts for production |
| Re-renders | No memoization on list components | Consider `React.memo()` for large lists |

## Browser Support

- Modern browsers with ES6+ support
- No IE11 support (Create React App 5 dropped IE11)
- Tested on: Chrome, Firefox, Edge (assumed based on browserslist config)
