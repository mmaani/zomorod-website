-- 1) batches: add soft-delete (void) support
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS is_void boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz NULL;

-- Optional but recommended: prevent duplicate active lot numbers per product
-- (allows same lotNumber again only if the previous one was voided)
CREATE UNIQUE INDEX IF NOT EXISTS batches_unique_active_lot
  ON batches (product_id, lot_number)
  WHERE is_void = false;

-- 2) inventory_movements: link movements to a batch
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS batch_id bigint NULL;

-- Add FK (only if batches(id) is bigint; if it's integer, change bigint -> integer)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_movements_batch_id_fkey'
  ) THEN
    ALTER TABLE inventory_movements
      ADD CONSTRAINT inventory_movements_batch_id_fkey
      FOREIGN KEY (batch_id) REFERENCES batches(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Helpful index
CREATE INDEX IF NOT EXISTS inventory_movements_product_date_idx
  ON inventory_movements (product_id, movement_date DESC);