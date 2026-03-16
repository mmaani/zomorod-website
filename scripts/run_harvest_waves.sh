#!/usr/bin/env bash
set -euo pipefail

# Run waves into the local workbook (harvesting sidecar)
XLSX="automation/input/Zomorod_Supplier_Intelligence_LIVE.xlsx"

mkdir -p automation/output automation/runtime

# 1) Medzell company URLs (seed file)
python scripts/generate_seed_urls_medzell_v2.py automation/output/medzell_company_urls.txt

# Wave: Malaysia (public seeds enabled in Seed_URLs)
python scripts/zomorod_autofill_supplier_intelligence_v2.py "$XLSX" --country "Malaysia" --mode append --limit 300

# Wave: Turkey
python scripts/zomorod_autofill_supplier_intelligence_v2.py "$XLSX" --country "Turkey" --mode append --limit 300

# Wave: China
python scripts/zomorod_autofill_supplier_intelligence_v2.py "$XLSX" --country "China" --mode append --limit 300

# Optional: Use Medzell seed file and treat as "global" (no country filter)
python scripts/zomorod_autofill_supplier_intelligence_v2.py "$XLSX" --source "Medzell" --seed-file automation/output/medzell_company_urls.txt --mode append --limit 600

echo "✅ Done. Open the workbook and check Supplier_Intelligence + Dashboard + RFQ_Batch_Generator."
