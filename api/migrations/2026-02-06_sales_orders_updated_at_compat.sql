-- Compatibility migration for older Neon databases missing updated_at on sales_orders.

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
