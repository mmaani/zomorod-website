BEGIN;

-- Rename only if old exists and new does not
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='batches' AND column_name='quantity_received'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='batches' AND column_name='qty_received'
  )
  THEN
    ALTER TABLE batches RENAME COLUMN quantity_received TO qty_received;
  END IF;
END $$;

COMMIT;
