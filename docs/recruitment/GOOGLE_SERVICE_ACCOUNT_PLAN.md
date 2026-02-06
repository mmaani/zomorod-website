# Recruitment via Google Service Account: implementation guide

This project already includes service-account parsing (`GOOGLE_SA_B64`) and a reference recruitment flow in `server/recruitment.js`.

## 1) Environment variables (Vercel / production)

Set these variables in your deployment environment:

- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_SA_B64` → Base64 JSON of the service-account key
- `GOOGLE_DRIVE_FOLDER_ID` → Drive folder where CV/Cover files are uploaded
- `GOOGLE_SHEET_ID` → Optional sheet for appending submissions

Build `GOOGLE_SA_B64` from a local key file:

```bash
base64 -w 0 service-account.json
```

Then paste output as the env var value.

## 2) Google sharing requirements

After creating the service account in Google Cloud:

1. Open the target Drive folder.
2. Share it with the service account email (`...iam.gserviceaccount.com`) as **Editor**.
3. Open the Google Sheet and share it with the same service account as **Editor**.

Without sharing, uploads/appends fail with 403 errors.

## 3) SQL migration to run

Apply the migration:

```bash
node scripts/run-sql.mjs api/migrations/2026-02-06_add_recruitment.sql
```

This creates:

- `jobs` table for posting and publishing positions.
- `job_applications` table for incoming candidates + Drive links.

## 4) API endpoints now implemented (`server/recruitment.js` served at `/api/recruitment`)

The following resources are available via `server/recruitment.js` at `/api/recruitment`:

- `GET /api/recruitment?resource=jobs` (public published jobs)
- `GET /api/recruitment?resource=jobs_admin` (main-role only)
- `POST /api/recruitment?resource=jobs` (create job, main-role)
- `PATCH /api/recruitment?resource=jobs` (update job, main-role)
- `DELETE /api/recruitment?resource=jobs&id=...` (soft delete/unpublish, main-role)
- `POST /api/recruitment?resource=apply` (public multipart form submit)
- `GET /api/recruitment?resource=applications` (main-role list)

Implementation notes:

- multipart form parsing is handled directly in the endpoint.
- uploads to Google Drive and Sheets are done through Google REST APIs using service-account JWT exchange (no OAuth user flow required).
- application data is stored in Postgres and links are persisted for CRM/admin review.

## 5) Recommended rollout order

1. Run SQL migration.
2. Add env vars.
3. Share Drive folder and Sheet with service account.
4. Deploy endpoint.
5. Test with one job + one application.
6. Add CRM page for viewing `applications` if needed.

## 6) If Vercel API function count is a concern

If you are close to function-count limits on Vercel Hobby, place recruitment in one of these alternatives:

1. **Use the existing Express backend in `server/`** and expose `/api/recruitment` there.
   - Point frontend to that backend using `VITE_API_BASE`.
2. **Consolidate handlers** into fewer serverless files (resource routing in one file).
3. **Use a separate backend project** for recruitment only (recommended when file uploads are heavy).

The repository already contains server-side recruitment logic references in `server/recruitment.js` and upload flow in `server/server.js`, so moving recruitment there is straightforward.
