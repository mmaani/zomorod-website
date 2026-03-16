# Security Policy — Zomorod

## Secret Handling
- Secrets must be supplied via environment variables only.
- Do not commit `.env` files or credential artifacts.
- Secrets must never appear in client-side bundles.
- Do not expose server-only secrets to the client bundle.

## Allowed Secret Locations
- Hosting provider environment variables (Vercel, CI/CD)
- Local `.env` files **not committed**

## Secret/Config Inventory (This Repo)
- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SHEET_RANGE`
- `GOOGLE_SA_B64` (optional)
- `RESEND_API_KEY`
- `CRM_FROM_EMAIL`
- `SETUP_URL` (non-secret)
- `SETUP_TOKEN`
- `VITE_API_BASE` (client-safe)
- `VITE_BUILD_ID` (client-safe)

## Rotate‑Now List
The following must be rotated (treat as compromised):
- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- `RESEND_API_KEY`
- `SETUP_TOKEN`
- `GOOGLE_SA_B64` (if ever used)

## Sensitive Endpoints
- `/api/recruitment?resource=apply` is intentionally public.
- Follow‑up required: abuse protection via rate limiting / CAPTCHA.

## Logging
- Never log secret values.
- Avoid logging full credential payloads or tokens.
