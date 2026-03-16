# Supplier Automation Workflow

## Purpose
This folder formalizes the supplier automation pipeline while keeping live operational data out of git.

## Structure
- `automation/input/` — tracked templates/examples (safe to commit)
- `automation/output/` — generated artifacts (keep local / gitignored)

## Canonical Source of Truth
- Google Sheet is the canonical supplier intake source.

## Local Operational Data (Local Only)
- `input/` — local workbook copy if needed (local, gitignored)
- `output/` — generated URL lists and logs (local, gitignored)

## Core Scripts
- `scripts/generate_seed_urls_medzell_v2.py` → outputs `output/medzell_company_urls.txt`
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

## Recommended Ops Flow
1. Update the Google Sheet (canonical input).
2. Run `scripts/run_harvest_waves.sh` (or individual scripts).
3. Save results to the database and review in CRM/admin.
