# Environment Configuration

## Environment Variables

The project uses Create React App's environment variable convention. Variables prefixed with `REACT_APP_` are embedded in the build.

### `.env` File

Located at the project root: `.env`

```env
DISABLE_ESLINT_PLUGIN=true
REACT_APP_API_BASE_URL=https://localhost:44367/api
# REACT_APP_API_BASE_URL=/api
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REACT_APP_API_BASE_URL` | No | `https://localhost:44367/api` | Backend API base URL |
| `DISABLE_ESLINT_PLUGIN` | No | `true` | Disables ESLint plugin during build |

### Accessing Environment Variables

In source code, environment variables are accessed via `process.env.REACT_APP_*`:

```javascript
// src/api/axiosInstance.js
baseURL: process.env.REACT_APP_API_BASE_URL || "https://localhost:44367/api",
```

```javascript
// src/pages/admin/JobSeekers/JobSeekerDetails.jsx
const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  "";
```

## Configuration by Environment

### Development

- `.env` is automatically loaded by `react-scripts`
- API base URL: `https://localhost:44367/api`
- Dev server: `http://localhost:3000`
- Hot reload enabled

### Production

- Build with `npm run build`
- Environment variables are baked into the build at compile time
- To change `REACT_APP_API_BASE_URL` for production, rebuild with the new value
- Serve the `build/` folder with a static file server (nginx, Apache, IIS, etc.)

### Environment-Specific `.env` Files

Create React App supports `.env.development`, `.env.production`, etc. These are not currently present in the project but can be added:

| File | Loaded When |
|------|-------------|
| `.env` | All environments |
| `.env.development` | `npm start` |
| `.env.production` | `npm run build` |
| `.env.test` | `npm test` |

## API Origin for Document URLs

### `JobSeekerDetails.jsx`

The `JobSeekerDetails.jsx` page includes an `API_BASE_URL` constant and `toAbsoluteUrl()` helper for resolving document URLs:

```javascript
const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  "";

const toAbsoluteUrl = (url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  let clean = String(url).replace(/^\/+/, "").replace(/^wwwroot\//i, "");
  if (!API_BASE_URL) return `/${clean}`;
  return `${API_BASE_URL.replace(/\/+$/, "")}/${clean}`;
};
```

**Note**: The `API_BASE_URL` here is used for document URLs specifically, while `axiosInstance.js` uses `REACT_APP_API_BASE_URL` for API calls. Both should point to the same backend origin.

### Recommendation

Consider unifying the configuration:
- Use a single `REACT_APP_API_ORIGIN` variable for the backend origin (without `/api` path)
- Derive both the axios `baseURL` and document URL prefix from this single value
- This avoids having two configuration points for the same backend

## Security Notes

- Never commit `.env` files containing production secrets to version control
- `.env` is listed in `.gitignore` (verify this is the case)
- Environment variables in Create React App are embedded in the client-side bundle and visible to users
- Do not store secrets (API keys, passwords, tokens) in `REACT_APP_*` variables
