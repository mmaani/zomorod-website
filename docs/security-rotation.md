# Secret Rotation Checklist

## Immediate Actions
- Rotate `JWT_SECRET`.
- Rotate `DATABASE_URL` credentials or user/password.
- Rotate Google OAuth credentials:
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REFRESH_TOKEN`
- Rotate email provider credentials:
  - `RESEND_API_KEY`
  - `CRM_FROM_EMAIL` (if it includes SMTP credentials elsewhere)
- Reissue any Google service account keys if previously committed.

## Cleanup Actions
- Ensure `.env`, `.env.local`, and any credential JSON are removed from git history if required.
- Confirm secrets are only set in hosting provider environment settings.
- Verify no secret values are in build artifacts or logs.

## Verification Steps
- Run login flow in CRM and confirm token issuance works.
- Run recruitment application submission to confirm Drive/Sheets uploads work.
- Check API health endpoints (`/api/ping`, `/api/db-check`) for expected responses.

## Ongoing Hygiene
- Use `.env.example` as the only committed env reference.
- Add secrets via CI/CD or Vercel environment variables only.
