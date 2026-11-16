# prjT3 Password Hackathon

COMP 4537 in-class mini-hackathon: JWT authentication in an HttpOnly cookie,
with the client and the API on two different HTTPS origins.

| Part | Folder | Hosting | URL shape |
| --- | --- | --- | --- |
| Client | `frontend/` | GitHub Pages | `https://<user>.github.io/prjT3/` |
| API | `backend/` | Render | `https://<service>.onrender.com/prjT3/...` |

The backend has **zero npm dependencies**. Login, cookies, and JWT signing and
verification are written by hand with Node's built-in `http` and `crypto`.

## How it works

1. The login page sends `POST /prjT3/api/login` with the username and password.
2. The server hashes the password with scrypt and compares it to the stored hash.
3. On success it signs a JWT (HS256, 3 hour expiry) and returns it in a cookie:
   `HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=10800`.
4. Every protected page calls `GET /prjT3/api/me`. The browser attaches the
   cookie automatically. A `401` sends the user back to the login page.
5. The admin page calls `GET /prjT3/api/secret` and shows the welcome line
   with the browser's own date and time.
6. Logout calls `POST /prjT3/api/logout`, which tells the browser to delete
   the cookie. The server keeps no session list, so the JWT is not revoked.

### API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/prjT3/health` | none | Health check |
| POST | `/prjT3/api/login` | none | Verify credentials, set JWT cookie |
| GET | `/prjT3/api/me` | JWT | Is this browser logged in? |
| GET | `/prjT3/api/secret` | JWT | Team and current secret |
| POST | `/prjT3/api/logout` | none | Clear the cookie |
| POST | `/prjT3/api/settings` | JWT + current password | Change password and/or secret |

### Backend files

| File | Responsibility |
| --- | --- |
| `server.js` | HTTP server, router, timeouts, error handling |
| `src/config.js` | Environment variables and constants |
| `src/http.js` | JSON helpers, CORS, origin check, body size limit |
| `src/jwt.js` | JWT sign and verify (HMAC-SHA256) |
| `src/auth.js` | Cookie set/clear, `requireAuth` |
| `src/password.js` | scrypt hashing with a concurrency cap |
| `src/store.js` | Password hash and secret, saved to a JSON file |
| `src/rateLimit.js` | Per-address and global limits on password attempts |
| `src/routes/*.js` | One file per group of endpoints |

## Design decisions worth being able to explain

- **Two keys, two jobs.** `JWT_SECRET` signs tokens and never leaves the
  server. The "secret" on the admin page is just data. They are unrelated.
- **Why `SameSite=None`.** `github.io` and `onrender.com` are different sites,
  so the browser only sends the cookie cross-site with `SameSite=None; Secure`.
- **CORS.** The API echoes only our exact frontend origin and sets
  `Access-Control-Allow-Credentials: true`. A wildcard is not allowed with cookies.
- **CSRF.** Because the cookie is `SameSite=None`, POST routes reject any
  request whose `Origin` header is not our frontend, and require a JSON body.
- **JWT verification order.** Signature first (constant-time compare), then the
  algorithm must be exactly `HS256`, then expiry.
- **Stateless tokens.** A JWT stays valid until it expires, even after logout
  or a password change, as the rules require. The consequence: anyone who
  logged in earlier still holds a working token. Changing the password stops
  *new* logins only.
- **Re-authentication on settings.** Changing the password or secret requires
  the current password, so an old token by itself cannot change them.
- **Short password.** Six characters cannot resist unlimited guessing, so
  guesses are limited per address and globally (HTTP `429` when exceeded).
- **Availability.** Requests are capped at 1 KB, slow connections time out,
  and at most four password hashes run at once. Extra attempts get an instant
  `429` instead of queueing, so the server keeps responding quickly.
- **No plain-text password.** Only a salted scrypt hash is stored.

## Run locally

```bash
cd backend
node server.js                       # API on http://localhost:3000

cd frontend
python3 -m http.server 5500          # client on http://localhost:5500
```

Open <http://localhost:5500> and log in with `admin` / `BCIT12`.
Use `localhost` (not `127.0.0.1`) so the origin matches the default
`FRONTEND_ORIGIN`.

## Deploy

### 1. Backend on Render

Create a **Web Service** from this repository.

| Setting | Value |
| --- | --- |
| Root Directory | `backend` |
| Build Command | *(leave empty)* |
| Start Command | `node server.js` |
| Health Check Path | `/prjT3/health` |

Environment variables:

| Name | Value |
| --- | --- |
| `JWT_SECRET` | A long random string, for example the output of `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `FRONTEND_ORIGIN` | `https://<user>.github.io` (origin only: no path, no trailing slash) |

Optional: `LOGIN_PER_IP_PER_MIN` (default 30), `LOGIN_GLOBAL_PER_MIN`
(default 120), `DATA_FILE` (path on a persistent disk).

### 2. Frontend on GitHub Pages

1. Name the GitHub repository `prjT3` so the site is served at
   `https://<user>.github.io/prjT3/`.
2. In `frontend/js/config.js`, set `API_BASE` to
   `https://<your-render-service>.onrender.com/prjT3`.
3. In the repository: **Settings → Pages → Source → GitHub Actions**.
4. Push to `main`. The workflow in `.github/workflows/pages.yml` publishes
   the `frontend/` folder.

### Hosting cautions

- **Render free instances sleep** after about 15 minutes without traffic and
  take a long time to wake. Use a paid instance for the event, or keep the
  service awake and open it just before verification.
- **Render's disk is temporary** unless you attach a persistent disk and point
  `DATA_FILE` at it. Without one, any restart or redeploy resets the password
  and secret to `BCIT12` / `defaultSecret`. After the Phase 2 change, do not
  restart or redeploy, and do not edit environment variables (that redeploys).
- **Shared campus network.** Many teams may share one public address, so the
  per-address login limit is generous (30 per minute). Raise it with
  `LOGIN_PER_IP_PER_MIN` if verification logins are being refused.
- **Browsers that block third-party cookies** (Safari, some private modes) may
  refuse a cookie from another site. Verify with Chrome, Edge, or Firefox.

## Phase 2 checklist (5 minutes)

1. Log in and open **Settings**.
2. Enter the current password (`BCIT12`), a new password (up to 6 characters)
   and a new secret (up to 19 characters, no spaces). Save.
3. Open **Admin Landing Page** and confirm the new secret is shown.
4. Log out and log back in with the new password.
5. Post the `READY` message on Discord.

## Submission

Zip the `frontend` and `backend` folders as `prjT3_passwordHackathon.zip`
and post both HTTPS links in Learning Hub.
