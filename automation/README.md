# Supplier Automation Workflow

## Purpose
This folder formalizes the supplier automation pipeline while keeping live operational data out of git.

## Structure
- `automation/input/` — tracked templates/examples (safe to commit)
- `automation/output/` — generated artifacts (keep local / gitignored)
- `automation/runtime/` — transient run state, logs, temp files (local / gitignored)
- `automation/samples/` — small sample artifacts (safe to commit)

## Canonical Source of Truth
- Google Sheet / Apps Script is the canonical supplier intake + ops layer.
- Local workbook flow is a harvesting sidecar used for batch crawling.

## Local Operational Data (Local Only)
- `automation/input/` — local workbook copies (local, gitignored except templates)
- `automation/output/` — generated URL lists and logs (local, gitignored)
- `automation/runtime/` — transient artifacts (local, gitignored)

## Core Scripts
- `scripts/generate_seed_urls_medzell_v2.py` → outputs `automation/output/medzell_company_urls.txt`
- `scripts/generate_seed_urls_generic_directory.py` → outputs custom seed lists
- `scripts/zomorod_autofill_supplier_intelligence_v2.py` → reads the workbook + writes results
- `scripts/run_harvest_waves.sh` → orchestrates the above

## Python Dependencies
Install requirements for supplier scripts:
```bash
pip install -r scripts/requirements.txt
```

## Workbook Template
- `automation/input/Zomorod_Supplier_Intelligence_TEMPLATE.xlsx`
- `automation/samples/medzell_company_urls.sample.txt`

## Recommended Ops Flow
1. Update the Google Sheet (canonical input).
2. Export the Sheet to `automation/input/Zomorod_Supplier_Intelligence_LIVE.xlsx`.
3. Run `scripts/run_harvest_waves.sh` (or individual scripts).
4. Export the `Supplier_Intelligence` tab to CSV and import into the Sheet via Apps Script (CSV import).
5. Save results to the database and review in CRM/admin.
