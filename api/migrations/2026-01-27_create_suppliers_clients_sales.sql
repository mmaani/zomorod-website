-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients (id) ON DELETE RESTRICT,
  product_id INTEGER REFERENCES products (id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL,
  unit_price_jod NUMERIC NOT NULL,
  sale_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add supplier_id to batches table
ALTER TABLE batches ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers (id);

-- Indexes to improve queries
CREATE INDEX IF NOT EXISTS idx_batches_supplier ON batches (supplier_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (name);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON sales (client_id);
