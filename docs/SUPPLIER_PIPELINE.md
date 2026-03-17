# Supplier Pipeline — Canonical Architecture (Zomorod Only)

## Canonical Source of Truth
- **Input of record:** Google Sheet + Apps Script intake process.
- Local workbook automation is a sidecar pre-processing layer.

## Workbook Safety Policy
- `automation/input/Zomorod_Supplier_Intelligence_TEMPLATE.xlsx` is static and must never be used for operations.
- `automation/input/Zomorod_Supplier_Intelligence_LIVE.xlsx` is operational and writable.
- If LIVE does not exist, automation may create it from TEMPLATE.

## Enforcement Layer (v1)
The automation script applies a controlled pre-ingestion flow:

1. **Normalize**
   - Standardize country values (common aliases mapped to canonical country names).
   - Standardize website/source URLs to normalized HTTPS domain format.
   - Normalize email lists (lowercase + valid format only).
   - Normalize phone format (digits/leading plus only).
   - Trim whitespace and normalize boolean-like cert fields.
   - Normalize source metadata fields (`Source_Name`, `Source_URL`).

2. **Validate**
   - Required: company, country, primary category, and at least one contact point (`Website` or `Email(s)`).
   - Invalid email formatting is flagged.
   - Invalid rows are never silently promoted forward; they are marked with reasons.

3. **Dedupe**
   - Duplicate signals computed from combinations of:
     - supplier name + domain
     - supplier name + email list
     - domain + email list
     - phone
     - source URL
   - Rows are not auto-deleted; suspected duplicates are routed to review status.

4. **Insert/Export Ready**
   - `Insert_Ready`: valid rows without duplicate signals.
   - `Review_Duplicate`: valid rows with duplicate signals.
   - `Rejected_Invalid`: failed validation rows with explicit reasons.

## Runtime Usage Notes
- This enforcement layer is automation-side only and does not mutate CRM/API runtime behavior.
- It prepares safer rows for future API/database insertion workflows.

## Supplier Import Contract (Automation → API, v1)

### Importable statuses
- `Insert_Ready`

### Blocked statuses
- `Review_Duplicate`
- `Rejected_Invalid`
- Any unknown/empty status

### Field mapping (workbook → `/api/suppliers` payload)
- `Company` → `legalName`, `businessName`, `name`
- `Country` → `supplierCountry`
- `Supplier_Type` → `supplierType`
- `Website` → `website`
- `Email(s)` (first valid email) → `email`
- `Phone/WhatsApp` → `phone`, `phoneWhatsapp`
- `Primary_Category` (name) → `primaryCategoryId` (resolved via API categories)
- `Secondary_Categories` (names) → `secondaryCategoryIds` (resolved IDs)
- `Risk_Level` → `riskLevel` (`LOW|MED|HIGH`, fallback `MED`)
- `Cert_ISO13485_Claim` → `certificationsIso13485`
- `Cert_CE_Claim` → `certificationsCe`
- `Cert_Other` → `certificationsOther`
- `Evidence_URL` → `evidenceUrl`, `sourceUrl`
- `Expected_Price_Range_USD` → `expectedPriceRangeUsd`
- `Notes` (+ row index) → `notes`
- `Notes` `Seed=...` (when present) → `sourceName`

### Import-time validation
- Must satisfy API-required fields: legal/company name, country, risk level, workflow status, and mapped primary category.
- Primary category must resolve to a valid `product_categories.id`.
- Rows failing import-time checks are skipped with explicit reason counters.

### Duplicate safeguards before POST
- Block if same supplier name + country already exists.
- Block if email already exists.
- Block if supplier name + website domain already exists.

### Import utility
- Script: `scripts/import_suppliers_from_live_workbook.py`
- Default mode: **dry-run** (no writes).
- Apply mode: `--apply` to execute POST requests.
- Requires authenticated API token with supplier write permission.

## Path Conventions
- `automation/input/` (template + live workbook)
- `automation/output/` (seed URL lists, exports)
- `automation/runtime/` (logs, temp)
- `automation/samples/` (small committed samples)
