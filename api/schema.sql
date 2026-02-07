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
  default_sell_price_jod NUMERIC(12,3) NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_price_tiers (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_qty INT NOT NULL CHECK (min_qty > 0),
  unit_price_jod NUMERIC(12,3) NOT NULL CHECK (unit_price_jod >= 0),
  UNIQUE (product_id, min_qty)
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  business_name TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  supplier_country TEXT,
  supplier_city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_categories (
  supplier_id INT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (supplier_id, category_id)
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
  qty_received INT NOT NULL CHECK (qty_received >= 0),
  supplier_name TEXT,
  supplier_invoice_no TEXT,
  supplier_id INT REFERENCES suppliers(id) ON DELETE SET NULL,
  is_void BOOLEAN NOT NULL DEFAULT FALSE,
  voided_at TIMESTAMPTZ,
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
-- Salespersons
CREATE TABLE IF NOT EXISTS salespersons (
  id SERIAL PRIMARY KEY,
  display_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sales orders
CREATE TABLE IF NOT EXISTS sales_orders (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  salesperson_id INT REFERENCES salespersons(id) ON DELETE SET NULL,
  sale_date DATE NOT NULL,
  notes TEXT,
  total_jod NUMERIC(12,3) NOT NULL DEFAULT 0,
  items_count INT NOT NULL DEFAULT 0,
  is_void BOOLEAN NOT NULL DEFAULT FALSE,
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty INT NOT NULL CHECK (qty > 0),
  unit_price_jod NUMERIC(12,3) NOT NULL CHECK (unit_price_jod > 0),
  line_total_jod NUMERIC(12,3) NOT NULL
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

-- Recruitment
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT,
  location_country TEXT,
  location_city TEXT,
  employment_type TEXT,
  job_description_html TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jobs_published_idx
  ON jobs (is_published, published_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS job_applications (
  id SERIAL PRIMARY KEY,
  job_id INT NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  education_level TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  cv_drive_file_id TEXT NOT NULL,
  cv_drive_link TEXT NOT NULL,
  cover_drive_file_id TEXT,
  cover_drive_link TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_applications_job_created_idx
  ON job_applications (job_id, created_at DESC);