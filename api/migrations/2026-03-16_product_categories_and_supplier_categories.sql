-- Ensure product_categories and supplier_categories exist (lean v1)
CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_categories (
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
  PRIMARY KEY (supplier_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_categories_supplier_id ON supplier_categories(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_categories_category_id ON supplier_categories(category_id);
