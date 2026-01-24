BEGIN;

-- 1) If both columns exist, copy values into qty_received
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='batches' AND column_name='quantity_received'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='batches' AND column_name='qty_received'
  )
  THEN
    UPDATE batches
    SET qty_received = COALESCE(qty_received, 0) + COALESCE(quantity_received, 0);
  END IF;
END $$;

-- 2) Ensure qty_received is correct + enforced
ALTER TABLE batches
  ALTER COLUMN qty_received SET DEFAULT 0;

-- If qty_received is nullable in your DB (some earlier versions), enforce NOT NULL safely:
UPDATE batches SET qty_received = 0 WHERE qty_received IS NULL;
ALTER TABLE batches
  ALTER COLUMN qty_received SET NOT NULL;

-- 3) Drop the old column that is breaking inserts and causing zeros in GET
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='batches' AND column_name='quantity_received'
  )
  THEN
    ALTER TABLE batches DROP COLUMN quantity_received;
  END IF;
END $$;

COMMIT;
