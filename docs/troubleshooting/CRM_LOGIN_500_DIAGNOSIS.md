# CRM Login 500 Diagnosis

## Key findings

1. **Missing runtime dependency (`bcryptjs`)**
   - `lib/auth.js` imports `bcryptjs`.
   - `package.json` does not list `bcryptjs` under dependencies.
   - This causes `/api/login` to fail to load at runtime because `api/login.js` imports `verifyPassword` from `lib/auth.js`.

2. **Serverless handler style is inconsistent across `/api`**
   - Most CRM handlers use Vercel Node-style default export `(req, res)`.
   - Some endpoints use `export default { fetch() {} }` (worker style), and `api/setup.js` uses `export async function POST(request)` (route-handler style).
   - This can break initialization/diagnostics routes depending on deployment runtime expectations.

3. **Login endpoint explicitly requires env vars**
   - `/api/login` returns 500 when `DATABASE_URL` or `JWT_SECRET` are missing.

4. **Login endpoint also needs initialized tables**
   - `/api/login` returns "Database not initialized" if `users` / `roles` / `user_roles` relations are missing.

## Recommended fix order

1. Add missing dependency:
   - `npm i bcryptjs`
   - commit updated `package.json` + `package-lock.json`

2. Standardize `/api` handlers to one runtime style (recommended: Vercel Node default export handler):
   - Convert `api/ping.js`, `api/db-check.js`, `api/me.js`, and `api/setup.js` to `(req, res)` style if deploying as Vercel serverless functions.

3. Verify production env vars in Vercel:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `SETUP_TOKEN` (if using `/api/setup`)

4. Initialize schema/data before login attempts:
   - Apply `api/schema.sql` and migrations, or ensure `/api/setup` runs successfully after endpoint format is corrected.

5. Smoke tests:
   - `GET /api/ping`
   - `GET /api/db-check`
   - `POST /api/login` with valid credentials

## Minimal reproduction command used

```bash
node -e "import('./api/login.js').then(()=>console.log('api/login loaded')).catch(e=>{console.error('load failed:', e.message);process.exit(1);})"
```

Expected current output:

```text
load failed: Cannot find package 'bcryptjs' imported from /workspace/zomorod-website/lib/auth.js
```
