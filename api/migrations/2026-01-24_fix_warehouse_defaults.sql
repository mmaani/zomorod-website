BEGIN;

-- 1) Ensure warehouse id=1 exists
INSERT INTO warehouses (id, name)
VALUES (1, 'Main')
ON CONFLICT (id) DO NOTHING;

-- 2) Make warehouse_id default to 1 so API can insert without specifying it
ALTER TABLE batches
  ALTER COLUMN warehouse_id SET DEFAULT 1;

ALTER TABLE inventory_movements
  ALTER COLUMN warehouse_id SET DEFAULT 1;

-- 3) Align qty column name to qty_received
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
END
$$;

-- If both columns exist, copy data into qty_received (safe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='batches' AND column_name='quantity_received'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='batches' AND column_name='qty_received'
  )
  THEN
    EXECUTE 'UPDATE batches SET qty_received = COALESCE(qty_received,0) + COALESCE(quantity_received,0)
             WHERE COALESCE(quantity_received,0) <> 0';
  END IF;
END
$$;

-- 4) Soft-delete (void)
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS is_void BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

COMMIT;
