# zomorod-website
Official website for Zomorod Medical Supplies LLC

## Development

### Frontend (Vite)
```bash
npm install
npm run dev
```

The CRM frontend uses `/api` by default; override with `VITE_API_BASE` if you are proxying to a different backend. 
See `.env.example` for local environment placeholders.
See `docs/setup.md` for a quickstart and `docs/security-rotation.md` for secret rotation steps.
See `docs/PROJECT_SCOPE.md`, `docs/AGENT_RULES.md`, and `docs/SUPPLIER_PIPELINE.md` for repo governance and supplier pipeline guidance.

### API / Serverless
The `/api` directory contains Vercel-style serverless handlers used by the CRM and recruitment flows. These rely on:
- `DATABASE_URL` (Postgres connection string)
- `JWT_SECRET` (JWT signing/verification for CRM auth)
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN` (Google Drive/Sheets access for recruitment uploads)
- `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_RANGE` (recruitment storage targets)
- `RESEND_API_KEY` and `CRM_FROM_EMAIL` (optional, used by `/api/login?action=forgot-password` to email temporary CRM passwords)

Recruitment is implemented in `lib/recruitment.js` and is exposed via `/api/recruitment`.
Service-account-based flows are documented under `docs/recruitment/GOOGLE_SERVICE_ACCOUNT_PLAN.md` for future use.

## Notes
- Legacy `lib/crmAuth.js` has been removed; use `src/crm/auth.js` for CRM client auth helpers.
- Removed the unused Next-style health route under `src/app/api`; use `/api/ping` or `/api/db-check` instead.
- Removed `/api/debug-env` to keep the Vercel Hobby deployment within the 12 serverless function limit.
