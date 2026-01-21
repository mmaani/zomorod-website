-- ZOMOROD CRM schema (Postgres)

-- Users & Roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL -- main, doctor, general
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Warehouses / locations
CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Product catalog
CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  product_code TEXT UNIQUE NOT NULL,  -- Product ID
  category_id INT REFERENCES product_categories(id),
  official_name TEXT NOT NULL,
  market_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Batch / Lot traceability (each purchase lot)
CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id INT NOT NULL REFERENCES warehouses(id),
  lot_number TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  expiry_date DATE,
  purchase_price_jod NUMERIC(12,3) NOT NULL,
  quantity_received INT NOT NULL CHECK (quantity_received >= 0),
  supplier_name TEXT,
  supplier_invoice_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id, lot_number)
);

-- Inventory movements (audit trail)
-- movement_type: IN (receive), OUT (sale), ADJ (adjust), RETURN
CREATE TABLE IF NOT EXISTS inventory_movements (
  id SERIAL PRIMARY KEY,
  warehouse_id INT NOT NULL REFERENCES warehouses(id),
  product_id INT NOT NULL REFERENCES products(id),
  batch_id INT REFERENCES batches(id),
  movement_type TEXT NOT NULL,
  qty INT NOT NULL,
  movement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  created_by INT REFERENCES users(id)
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  client_type TEXT NOT NULL, -- Clinic, Pharmacy, Hospital...
  name TEXT NOT NULL,
  website TEXT,
  email TEXT,
  phone TEXT,
  contact_person TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_interests (
  client_id INT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, product_id)
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  quote_no TEXT UNIQUE NOT NULL,
  client_id INT NOT NULL REFERENCES clients(id),
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT/SENT/APPROVED/REJECTED
  currency TEXT NOT NULL DEFAULT 'JOD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quote_items (
  id SERIAL PRIMARY KEY,
  quote_id INT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_jod NUMERIC(12,3) NOT NULL,
  discount_jod NUMERIC(12,3) NOT NULL DEFAULT 0
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_no TEXT UNIQUE NOT NULL,
  client_id INT NOT NULL REFERENCES clients(id),
  quote_id INT REFERENCES quotes(id),
  is_taxed BOOLEAN NOT NULL DEFAULT FALSE,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'UNPAID', -- UNPAID/PARTIAL/PAID/VOID
  currency TEXT NOT NULL DEFAULT 'JOD',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  batch_id INT REFERENCES batches(id), -- optional allocation
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_jod NUMERIC(12,3) NOT NULL,
  discount_jod NUMERIC(12,3) NOT NULL DEFAULT 0
);

-- Payments (supports partial payments)
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount_jod NUMERIC(12,3) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  created_by INT REFERENCES users(id)
);

-- Payment schedule (installments)
CREATE TABLE IF NOT EXISTS payment_schedule (
  id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount_jod NUMERIC(12,3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' -- PENDING/PAID
);
