# Architecture Overview

## Canonical Production Paths
- Frontend: Vite SPA under `src/` with public site pages in `src/main/` and CRM under `src/crm/`.
- Backend: Vercel-style serverless handlers under `api/` with shared logic in `lib/`.
- Apps Script: Canonical source lives in `zomorod-appscript/`.

## Repository Shape
- `src/` — React SPA (public site + CRM)
- `api/` — Serverless API handlers (CRM + recruitment)
- `lib/` — Shared backend utilities (DB, auth, recruitment handler)
- `public/` — Static assets
- `docs/` — Architecture, setup, and operational docs
- `scripts/` — Admin/setup scripts
- `zomorod-appscript/` — Google Apps Script source

## Runtime Flow
- The SPA is served from Vercel/static hosting.
- API requests are routed to `/api/*` serverless functions.
- Recruitment uploads and CRM admin actions are handled via `/api/recruitment`.
- CRM password reset uses `/api/login?action=forgot-password` (do not reintroduce a standalone `/api/forgot-password` endpoint).

## Local Development
1. Frontend:
   - `npm install`
   - `npm run dev`
2. API (serverless):
   - Run `vercel dev` in a separate terminal, or
   - Set `VITE_API_BASE` to point at a deployed API environment.

## Environment Variables
See `.env.example` for a complete list of required variables and placeholders.

## Security Notes
- Secrets must be supplied via environment variables only.
- No credential files are committed to the repo.
- Treat all removed secrets as compromised and rotate in the deployment environment.
