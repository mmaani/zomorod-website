-- 1) Products: allow archive + default sell price if missing
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS default_sell_price_jod NUMERIC(12,3) NOT NULL DEFAULT 0;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2) Batches: add voiding fields
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS is_void BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

-- 3) Replace UNIQUE constraint with partial unique (active lots only)
-- Default constraint name from your schema likely matches this:
ALTER TABLE batches
  DROP CONSTRAINT IF EXISTS batches_product_id_warehouse_id_lot_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS batches_uniq_active_lot
  ON batches (product_id, warehouse_id, lot_number)
  WHERE is_void = FALSE;

-- 4) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_batches_product_date ON batches (product_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_movements_product_date ON inventory_movements (product_id, movement_date DESC);
