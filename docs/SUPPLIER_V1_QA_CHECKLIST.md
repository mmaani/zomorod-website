# Supplier v1 QA Checklist (Staging)

## API checks
1. GET `/api/suppliers`
- Expected: `ok=true`, includes `legalName`, `workflowStatus`, `riskLevel`, `primaryCategoryId` fields per supplier.
- Result: Pass/Fail

2. POST `/api/suppliers` with required fields
- Required: `legalName`, `supplierCountry`, `workflowStatus`, `riskLevel`, `primaryCategoryId`.
- Expected: 201 + `ok=true` + `id`.
- Result: Pass/Fail

3. POST `/api/suppliers` missing required field
- Omit one required field at a time.
- Expected: 400 with descriptive error.
- Result: Pass/Fail

4. PATCH `/api/suppliers`
- Update `workflowStatus`, `riskLevel`, `primaryCategoryId`.
- Expected: 200 + `ok=true`.
- Result: Pass/Fail

5. Search
- GET `/api/suppliers?q=<legal name>`
- Expected: result includes the supplier.
- Result: Pass/Fail

6. Category filter
- GET `/api/suppliers?categoryId=<primaryCategoryId>`
- Expected: result includes supplier with primary category.
- Result: Pass/Fail

## CRM UI checks
1. Create supplier
- Fill all required fields and save.
- Expected: success toast, supplier appears in list.
- Result: Pass/Fail

2. Required field enforcement
- Leave one required field empty and attempt save.
- Expected: validation alert.
- Result: Pass/Fail

3. Edit supplier
- Change `workflowStatus` and `riskLevel`.
- Expected: changes persist after refresh.
- Result: Pass/Fail

4. List rendering
- Expected columns display: Legal Name, Type, Status, Risk, Primary Category, Certs, Evidence, Source, Notes.
- Result: Pass/Fail

5. Status / Risk selectors
- Expected: only allowed values are selectable.
- Result: Pass/Fail

6. Primary category
- Expected: primary category required and displayed in list.
- Result: Pass/Fail

7. Secondary categories
- Expected: secondary picker works and excludes primary on save.
- Result: Pass/Fail

8. Products page supplier dropdown
- Expected: supplier displays as `legal_name` (fallback to business/name).
- Result: Pass/Fail
