# Project Isolation Policy — Zomorod Repo

## ZOMOROD MEDICAL SUPPLIES
Medical supplies distribution platform with:
- public bilingual website
- CRM
- recruitment system
- supplier management
- quotation workflows
- Google Drive / Sheets / Apps Script integrations
- API services

## Excluded Projects
The following projects are **not** part of this repo and must remain isolated:
- **NIVRAN** (perfume brand operations)
- **QUICKAIBUY** (marketplace automation)

## Enforcement
Agents must never mix tasks, terminology, code, or architecture across projects.
Do not reintroduce duplicate auth/reset, recruitment, or Google integration flows.
Canonical password reset is `/api/login?action=forgot-password`.
If any task references another project, **STOP** and report:

**PROJECT MISMATCH DETECTED**
