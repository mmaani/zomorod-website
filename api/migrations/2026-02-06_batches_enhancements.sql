-- Batches enhancements for operational visibility & safer uniqueness.

-- 1) Track void reason + who voided for auditability.
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS voided_by INT REFERENCES users(id);

-- 2) Ensure active-lot uniqueness only (supports reusing lot after void).
ALTER TABLE batches
  DROP CONSTRAINT IF EXISTS batches_product_id_warehouse_id_lot_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS batches_uniq_active_lot
  ON batches (product_id, warehouse_id, lot_number)
  WHERE is_void = FALSE;

-- 3) Helpful list/query index for product batch timelines.
CREATE INDEX IF NOT EXISTS idx_batches_product_purchase
  ON batches (product_id, purchase_date DESC, id DESC);
