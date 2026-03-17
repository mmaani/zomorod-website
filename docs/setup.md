# Setup Quickstart

## Prerequisites
- Node.js 20+
- npm

## Install
```bash
npm install
```

## Frontend Dev
```bash
npm run dev
```

## API Dev
- Use `vercel dev` to run serverless functions locally, or
- Set `VITE_API_BASE` to a deployed API URL.
- CRM password reset uses `/api/login?action=forgot-password` (no standalone reset endpoint).

## Build
```bash
npm run build
```

## Environment Variables
Copy `.env.example` to your local environment manager or CI and fill in values.
Do not commit `.env` files.

## Governance
See `docs/PROJECT_SCOPE.md`, `docs/AGENT_RULES.md`, and `docs/SECURITY_POLICY.md` for repo governance and security rules.
