# zomorod-website
Official website for Zomorod Medical Supplies LLC

## Development

### Frontend (Vite)
```bash
npm install
npm run dev
```

The CRM frontend uses `/api` by default; override with `VITE_API_BASE` if you are proxying to a different backend. 

### API / Serverless
The `/api` directory contains Vercel-style serverless handlers used by the CRM. These rely on:
- `DATABASE_URL` (Postgres connection string)
- `JWT_SECRET` (JWT signing/verification for CRM auth)
- `GOOGLE_SA_B64` (base64-encoded service account JSON for Google Drive/Sheets integrations)
- `RESEND_API_KEY` and `CRM_FROM_EMAIL` (optional, used by `/api/forgot-password` to email temporary CRM passwords)

If you need to run the legacy Express server in `server/` for recruitment/Google integrations, see the environment variables referenced in `server/server.js` (OAuth + Drive/Sheets IDs).

## Notes
- Legacy `lib/crmAuth.js` has been removed; use `src/crm/auth.js` for CRM client auth helpers.
- Removed the unused Next-style health route under `src/app/api`; use `/api/ping` or `/api/db-check` instead.
## Troubleshooting
- CRM login 500 diagnosis and fix plan: `docs/troubleshooting/CRM_LOGIN_500_DIAGNOSIS.md`.