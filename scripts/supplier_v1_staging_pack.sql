-- Supplier v1 staging SQL pack

-- 1) legal_name backfill
UPDATE suppliers
SET legal_name = COALESCE(NULLIF(business_name, ''), NULLIF(name, ''))
WHERE (legal_name IS NULL OR legal_name = '')
  AND (NULLIF(business_name, '') IS NOT NULL OR NULLIF(name, '') IS NOT NULL);

-- 2) default workflow_status
UPDATE suppliers
SET workflow_status = 'UNDER_REVIEW'
WHERE (workflow_status IS NULL OR workflow_status = '');

-- 3) default risk_level
UPDATE suppliers
SET risk_level = 'MED'
WHERE (risk_level IS NULL OR risk_level = '');

-- 4) manual review: missing legal_name
SELECT id, name, business_name, legal_name
FROM suppliers
WHERE legal_name IS NULL OR legal_name = '';

-- 5) manual review: missing primary category
SELECT id, legal_name, primary_category_id
FROM suppliers
WHERE primary_category_id IS NULL;

-- 6) manual review: missing country
SELECT id, legal_name, supplier_country
FROM suppliers
WHERE supplier_country IS NULL OR supplier_country = '';

-- 7) manual review: invalid workflow_status
SELECT id, legal_name, workflow_status
FROM suppliers
WHERE workflow_status NOT IN ('HARVESTED','UNDER_REVIEW','ENRICHED','APPROVED','BLOCKED','INACTIVE')
   OR workflow_status IS NULL OR workflow_status = '';

-- 8) manual review: invalid risk_level
SELECT id, legal_name, risk_level
FROM suppliers
WHERE risk_level NOT IN ('LOW','MED','HIGH')
   OR risk_level IS NULL OR risk_level = '';

-- 9) duplicates by email
SELECT email, COUNT(*) AS ct
FROM suppliers
WHERE email IS NOT NULL AND email <> ''
GROUP BY email
HAVING COUNT(*) > 1;

-- 10) duplicates by website domain (best-effort)
SELECT
  REGEXP_REPLACE(website, '^https?://', '') AS domain,
  COUNT(*) AS ct
FROM suppliers
WHERE website IS NOT NULL AND website <> ''
GROUP BY REGEXP_REPLACE(website, '^https?://', '')
HAVING COUNT(*) > 1;
