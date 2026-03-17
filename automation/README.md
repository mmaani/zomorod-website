# Supplier Automation Workflow

## Purpose
This folder formalizes the supplier automation workflow while keeping runtime data out of git.

## Workbook Safety (Mandatory)
- `automation/input/Zomorod_Supplier_Intelligence_TEMPLATE.xlsx` is a **static template only**.
- `automation/input/Zomorod_Supplier_Intelligence_LIVE.xlsx` is the **operational workbook**.
- Automation scripts must **never write to TEMPLATE**.
- If LIVE is missing, automation may auto-create LIVE by copying TEMPLATE once.

## Structure
- `automation/input/` — template + local live workbook
- `automation/output/` — generated artifacts (local/gitignored)
- `automation/runtime/` — transient state, logs, temp files (local/gitignored)
- `automation/samples/` — small sample artifacts (safe to commit)

## Canonical Source of Truth
- Google Sheet / Apps Script is the canonical supplier intake + operations layer.
- Local workbook flow is a harvesting sidecar for controlled batch processing.

## Core Scripts
- `scripts/generate_seed_urls_medzell_v2.py` → outputs URL seeds
- `scripts/generate_seed_urls_generic_directory.py` → outputs custom seed lists
- `scripts/zomorod_autofill_supplier_intelligence_v2.py` → harvest + enforce pipeline statuses
- `scripts/run_harvest_waves.sh` → orchestrates wave execution

## Python Dependencies
```bash
pip install -r scripts/requirements.txt
```

## Recommended Ops Flow
1. Update the Google Sheet (canonical input).
2. Export Sheet data to `automation/input/Zomorod_Supplier_Intelligence_LIVE.xlsx`.
3. Run `scripts/run_harvest_waves.sh` (or run scripts individually).
4. Review pipeline statuses in `Supplier_Intelligence` (`Insert_Ready`, `Review_Duplicate`, `Rejected_Invalid`).
5. Export review-approved rows to CSV and import through Apps Script / CRM flow.
