BEGIN;

-- 0) Ensure warehouse id=1 exists
INSERT INTO warehouses (id, name)
VALUES (1, 'Main')
ON CONFLICT (id) DO NOTHING;

INSERT INTO warehouses (name)
VALUES ('Main')
ON CONFLICT (name) DO NOTHING;

-- 1) Products fields used by API
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS default_sell_price_jod NUMERIC(12,3) NOT NULL DEFAULT 0;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2) Tiers table (used by products API)
CREATE TABLE IF NOT EXISTS product_price_tiers (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_qty INT NOT NULL CHECK (min_qty > 0),
  unit_price_jod NUMERIC(12,3) NOT NULL CHECK (unit_price_jod > 0),
  UNIQUE (product_id, min_qty)
);

-- 3) Batches: add qty_received while keeping quantity_received
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS qty_received INT;

-- backfill from existing column
UPDATE batches
SET qty_received = quantity_received
WHERE qty_received IS NULL;

-- keep warehouse default so API doesn’t need to pass it
ALTER TABLE batches
  ALTER COLUMN warehouse_id SET DEFAULT 1;

-- add voiding fields
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS is_void BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

-- make sure qty_received behaves like quantity_received
ALTER TABLE batches
  ALTER COLUMN qty_received SET NOT NULL;

-- inventory movements default warehouse
ALTER TABLE inventory_movements
  ALTER COLUMN warehouse_id SET DEFAULT 1;

COMMIT;
