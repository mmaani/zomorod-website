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

## Path Conventions
- `automation/input/` (template + live workbook)
- `automation/output/` (seed URL lists, exports)
- `automation/runtime/` (logs, temp)
- `automation/samples/` (small committed samples)
