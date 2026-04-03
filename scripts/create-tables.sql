-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  services TEXT[] NOT NULL,
  weight DECIMAL(10,2) DEFAULT 0,
  amount INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create utility_bills table
CREATE TABLE IF NOT EXISTS utility_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('electric', 'water')),
  amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(month, year, type)
);

-- Create supplies table
CREATE TABLE IF NOT EXISTS supplies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  type VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('import', 'export')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
CREATE INDEX IF NOT EXISTS idx_utility_bills_month_year ON utility_bills(month, year);
CREATE INDEX IF NOT EXISTS idx_supplies_date ON supplies(date);
CREATE INDEX IF NOT EXISTS idx_supplies_type ON supplies(type);
