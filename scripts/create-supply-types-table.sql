-- Create supply_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS supply_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(label, category)
);

-- Insert default supply types
INSERT INTO supply_types (label, category) VALUES
  ('Nước xả Comfort Em bé 3L6', 'Nước xả'),
  ('Nước xả Comfort Nắng mới 3L7', 'Nước xả'),
  ('Nước xả Comfort Kiêu Sa 3L7', 'Nước xả'),
  ('Nước xả Comfort Ban mai 3L7', 'Nước xả'),
  ('Nước xả Comfort sau sấy', 'Nước xả'),
  ('Nước xả Comfort Vườn Xuân 3L7', 'Nước xả'),
  ('Nước xả Hygiene 3L5', 'Nước xả'),
  ('Nước xả Downy 3L', 'Nước xả'),
  ('Nước xả Downy 3.5L', 'Nước xả'),
  ('Nước xả Downy 4L', 'Nước xả'),
  ('Nước xả Bella 3L', 'Nước xả'),
  ('Nước xả Ecolife 3.5L', 'Nước xả'),
  ('Nước xả DLY', 'Nước xả'),
  ('Nước giặt Lix', 'Nước giặt'),
  ('Nước giặt Ecolife', 'Nước giặt'),
  ('Bột giặt Lix', 'Bột giặt'),
  ('Bột giặt Pao', 'Bột giặt'),
  ('Baking Soda', 'Chất tẩy'),
  ('Giấm', 'Chất tẩy'),
  ('Nước rửa chén', 'Chất tẩy'),
  ('Thuốc tẩy', 'Chất tẩy')
ON CONFLICT (label, category) DO NOTHING;
