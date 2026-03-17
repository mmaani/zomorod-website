# Project Scope — Zomorod Medical Supplies

## Project Identity
- **Project:** Zomorod Medical Supplies
- **Repo:** `zomorod-website`
- **Domain:** Public bilingual website, CRM, recruitment, supplier management, quotation workflows, and Google Drive/Sheets/Apps Script integrations.

## What Belongs Here
- Public bilingual website and marketing content
- CRM application and admin tools
- Recruitment system and related uploads
- Supplier management workflows
- Quotation workflows
- Google Drive / Sheets / Apps Script integrations
- API/serverless logic and deployment/runtime configuration
- Canonical auth flow: `/api/login` and `/api/login?action=forgot-password` (no standalone reset endpoint)

## What Does NOT Belong Here
- Nivran (perfume brand operations)
- QuickAIBuy (marketplace automation)
- eBay or marketplace automation
- listing automation
- profit engine tooling
- product matching AI unrelated to Zomorod
- inventory monitoring unrelated to Zomorod
- dropshipping logic
- Legacy architectures that reintroduce duplicate auth/reset, recruitment, or Google integration flows

## Project Mismatch Rule
If any task, file, or request references a non‑Zomorod project, **STOP** and report:

**PROJECT MISMATCH DETECTED**

Do not proceed until scope is clarified.
