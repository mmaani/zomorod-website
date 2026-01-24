-- api/migrations/2026-01-22_align_products_batches.sql

BEGIN;

-- 1) Ensure a default warehouse exists
INSERT INTO warehouses (id, name)
VALUES (1, 'Main')
ON CONFLICT (id) DO NOTHING;

INSERT INTO warehouses (name)
VALUES ('Main')
ON CONFLICT (name) DO NOTHING;

-- 2) Products: sell price + archive flag
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS default_sell_price_jod NUMERIC(12,3) NOT NULL DEFAULT 0;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 3) Product tiers
CREATE TABLE IF NOT EXISTS product_price_tiers (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_qty INT NOT NULL CHECK (min_qty > 0),
  unit_price_jod NUMERIC(12,3) NOT NULL CHECK (unit_price_jod > 0),
  UNIQUE (product_id, min_qty)
);

-- 4) Batches: rename quantity_received -> qty_received (if needed)
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

-- 5) Batches: soft delete fields
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS is_void BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

-- 6) Defaults so API can insert without passing warehouse_id
ALTER TABLE batches
  ALTER COLUMN warehouse_id SET DEFAULT 1;

ALTER TABLE inventory_movements
  ALTER COLUMN warehouse_id SET DEFAULT 1;

COMMIT;
