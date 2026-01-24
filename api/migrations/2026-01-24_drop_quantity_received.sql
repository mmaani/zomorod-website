BEGIN;

-- 1) Move data from old column to new column (only where needed)
UPDATE batches
SET qty_received = quantity_received
WHERE (qty_received IS NULL OR qty_received = 0)
  AND quantity_received IS NOT NULL;

-- 2) Remove the old column that breaks your API inserts
ALTER TABLE batches
  DROP COLUMN quantity_received;

COMMIT;
