# Supplier Pipeline — Canonical Architecture (Zomorod Only)

## Canonical Source of Truth
- **Input:** Google Sheet (canonical supplier intake)

## Processing Layer
- `scripts/` for batch processing and ingestion
- `lib/` for shared server utilities

## Output Sink
- **Database** (serverless API + CRM interface)

## Local / Transient Artifacts
- Use `tmp/`, `runtime/`, `logs/`, or ignored local folders for transient artifacts.
- Do **not** use committed `input/` or `output/` folders as canonical workflow locations.

## Operator Workflow
1. Update the Google Sheet.
2. Run ingestion scripts.
3. Write results to the database.
4. Review and manage in CRM/admin.

## Notes
- Keep Google Sheets / Apps Script as the business‑layer canonical view.
- Batch scripts may still use local files for intermediate artifacts, but these must remain ignored.
