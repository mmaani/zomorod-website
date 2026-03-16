# Supplier Pipeline — Canonical Architecture (Zomorod Only)

## Canonical Source of Truth
- **Input:** Google Sheet / Apps Script (canonical supplier intake + ops layer)

## Processing Layer
- `scripts/` for batch processing and harvesting (sidecar)
- `lib/` for shared server utilities

## Output Sink
- **Database** (serverless API + CRM interface)

## Local / Transient Artifacts
- Use `automation/runtime/`, `automation/tmp/`, or other ignored local folders for transient artifacts.
- Do **not** treat any local workbook or `automation/output/` as canonical.

## Operator Workflow (Sidecar Harvest + Sheet Canonical)
1. Update the Google Sheet (canonical).
2. Export the Sheet to `automation/input/Zomorod_Supplier_Intelligence_LIVE.xlsx`.
3. Run harvesting scripts (`scripts/run_harvest_waves.sh` or individual scripts).
4. Export `Supplier_Intelligence` from the workbook to CSV.
5. Import CSV into the Google Sheet via Apps Script (Import Suppliers → CSV).
6. Write results to the database and review in CRM/admin.

## Notes
- Keep Google Sheets / Apps Script as the business‑layer canonical view.
- Batch scripts may use local files for intermediate artifacts, but these remain ignored.
- Path conventions for harvesting:
  - `automation/input/` (templates + live workbook)
  - `automation/output/` (seed URL lists, exports)
  - `automation/runtime/` (logs, temp)
  - `automation/samples/` (small committed samples)
