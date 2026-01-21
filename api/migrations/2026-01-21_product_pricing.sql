CREATE TABLE IF NOT EXISTS product_pricing (
  product_id INT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  base_selling_price_jod NUMERIC(12,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_discount_tiers (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_qty INT NOT NULL CHECK (min_qty > 0),
  unit_price_jod NUMERIC(12,3) NOT NULL,
  UNIQUE(product_id, min_qty)
);
