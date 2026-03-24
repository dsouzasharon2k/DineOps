-- Realistic demo seed for local development
-- Login: owner@dineops.com / password
-- Public menu: http://localhost:5173/menu/a085284e-ca00-4f64-a2c7-42fc0572bb97

-- Super admin
INSERT INTO users (id, tenant_id, name, email, password_hash, phone, role, is_active, created_at, updated_at)
SELECT
  'c0000000-0000-4f64-a2c7-42fc0572bb97',
  NULL,
  'Admin User',
  'admin@dineops.com',
  '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
  NULL,
  'SUPER_ADMIN',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = 'c0000000-0000-4f64-a2c7-42fc0572bb97');

UPDATE users
SET
  name = 'Admin User',
  role = 'SUPER_ADMIN',
  is_active = TRUE,
  updated_at = NOW()
WHERE email = 'admin@dineops.com';

-- Tenant + owner
INSERT INTO restaurants (id, name, slug, address, phone, cuisine_type, status, operating_hours, default_prep_time_minutes, notify_customer_email, notify_customer_sms, created_at, updated_at)
VALUES (
  'a085284e-ca00-4f64-a2c7-42fc0572bb97',
  'Spice Route',
  'spice-route',
  '123 MG Road, Bangalore',
  '9876543210',
  'North Indian + Indo Chinese',
  'ACTIVE',
  '{"monday":{"open":"09:00","close":"23:00"},"tuesday":{"open":"09:00","close":"23:00"},"wednesday":{"open":"09:00","close":"23:00"},"thursday":{"open":"09:00","close":"23:00"},"friday":{"open":"09:00","close":"23:30"},"saturday":{"open":"09:00","close":"23:30"},"sunday":{"open":"10:00","close":"22:30"}}',
  22,
  TRUE,
  FALSE,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  cuisine_type = EXCLUDED.cuisine_type,
  status = EXCLUDED.status,
  operating_hours = EXCLUDED.operating_hours,
  default_prep_time_minutes = EXCLUDED.default_prep_time_minutes,
  updated_at = NOW();

INSERT INTO users (id, tenant_id, name, email, password_hash, phone, role, is_active, created_at, updated_at)
SELECT
  'a085284e-ca00-4f64-a2c7-42fc0572bb99',
  'a085284e-ca00-4f64-a2c7-42fc0572bb97',
  'Restaurant Owner',
  'owner@dineops.com',
  '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
  NULL,
  'TENANT_ADMIN',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = 'a085284e-ca00-4f64-a2c7-42fc0572bb99');

UPDATE users
SET
  tenant_id = 'a085284e-ca00-4f64-a2c7-42fc0572bb97',
  role = 'TENANT_ADMIN',
  name = 'Restaurant Owner',
  is_active = TRUE,
  updated_at = NOW()
WHERE email = 'owner@dineops.com';

-- Keep exactly one active subscription for tenant
DELETE FROM subscriptions WHERE tenant_id = 'a085284e-ca00-4f64-a2c7-42fc0572bb97' AND status = 'ACTIVE';
INSERT INTO subscriptions (id, tenant_id, plan, status, starts_at, expires_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'a085284e-ca00-4f64-a2c7-42fc0572bb97',
  'GROWTH',
  'ACTIVE',
  NOW() - INTERVAL '7 days',
  NOW() + INTERVAL '90 days',
  NOW(),
  NOW()
);

-- Categories
INSERT INTO menu_categories (id, tenant_id, name, description, display_order, is_active, created_at, updated_at)
VALUES
  ('a085284e-ca00-4f64-a2c7-42fc0572bb9a', 'a085284e-ca00-4f64-a2c7-42fc0572bb97', 'Starters', 'Quick bites', 1, TRUE, NOW(), NOW()),
  ('a085284e-ca00-4f64-a2c7-42fc0572bb9b', 'a085284e-ca00-4f64-a2c7-42fc0572bb97', 'Mains', 'Popular main course', 2, TRUE, NOW(), NOW()),
  ('a085284e-ca00-4f64-a2c7-42fc0572bb9c', 'a085284e-ca00-4f64-a2c7-42fc0572bb97', 'Breads & Rice', 'Sides', 3, TRUE, NOW(), NOW()),
  ('a085284e-ca00-4f64-a2c7-42fc0572bb9d', 'a085284e-ca00-4f64-a2c7-42fc0572bb97', 'Beverages', 'Drinks', 4, TRUE, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = TRUE,
  updated_at = NOW();

-- Menu items (fixed IDs for stable seeding)
INSERT INTO menu_items (id, tenant_id, category_id, name, description, price, is_vegetarian, is_available, display_order, prep_time_minutes, created_at, updated_at)
VALUES
  ('a085284e-ca00-4f64-a2c7-42fc0572bc01', 'a085284e-ca00-4f64-a2c7-42fc0572bb97', 'a085284e-ca00-4f64-a2c7-42fc0572bb9a', 'Veg Spring Rolls', 'Crispy rolls with vegetable filling', 18000, TRUE, TRUE, 1, 12, NOW(), NOW()),
  ('a085284e-ca00-4f64-a2c7-42fc0572bc02', 'a085284e-ca00-4f64-a2c7-42fc0572bb97', 'a085284e-ca00-4f64-a2c7-42fc0572bb9a', 'Paneer Tikka', 'Tandoor grilled paneer cubes', 26000, TRUE, TRUE, 2, 15, NOW(), NOW()),
  ('a085284e-ca00-4f64-a2c7-42fc0572bc03', 'a085284e-ca00-4f64-a2c7-42fc0572bb97', 'a085284e-ca00-4f64-a2c7-42fc0572bb9a', 'Chicken 65', 'Classic spicy fried chicken', 29000, FALSE, TRUE, 3, 14, NOW(), NOW()),
  ('a085284e-ca00-4f64-a2c7-42fc0572bc04', 'a085284e-ca00-4f64-a2c7-42fc0572bb97', 'a085284e-ca00-4f64-a2c7-42fc0572bb9b', 'Butter Chicken', 'Creamy tomato chicken curry', 38000, FALSE, TRUE, 1, 20, NOW(), NOW()),
  ('a085284e-ca00-4f64-a2c7-42fc0572bc05', 'a085284e-ca00-4f64-a2c7-42fc0572bb97', 'a085284e-ca00-4f64-a2c7-42fc0572bb9b', 'Paneer Butter Masala', 'Rich paneer gravy', 34000, TRUE, TRUE, 2, 18, NOW(), NOW()),
  ('a085284e-ca00-4f64-a2c7-42fc0572bc06', 'a085284e-ca00-4f64-a2c7-42fc0572bb97', 'a085284e-ca00-4f64-a2c7-42fc0572bb9c', 'Garlic Naan', 'Tandoor bread with garlic', 7000, TRUE, TRUE, 1, 6, NOW(), NOW()),
  ('a085284e-ca00-4f64-a2c7-42fc0572bc07', 'a085284e-ca00-4f64-a2c7-42fc0572bb97', 'a085284e-ca00-4f64-a2c7-42fc0572bb9c', 'Jeera Rice', 'Basmati rice with cumin', 12000, TRUE, TRUE, 2, 8, NOW(), NOW()),
  ('a085284e-ca00-4f64-a2c7-42fc0572bc08', 'a085284e-ca00-4f64-a2c7-42fc0572bb97', 'a085284e-ca00-4f64-a2c7-42fc0572bb9d', 'Masala Chaas', 'Spiced buttermilk', 6000, TRUE, TRUE, 1, 3, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  is_vegetarian = EXCLUDED.is_vegetarian,
  is_available = TRUE,
  prep_time_minutes = EXCLUDED.prep_time_minutes,
  updated_at = NOW();

DO $$
DECLARE
  tenant UUID := 'a085284e-ca00-4f64-a2c7-42fc0572bb97';
  item_ids UUID[] := ARRAY[
    'a085284e-ca00-4f64-a2c7-42fc0572bc01'::uuid,
    'a085284e-ca00-4f64-a2c7-42fc0572bc02'::uuid,
    'a085284e-ca00-4f64-a2c7-42fc0572bc03'::uuid,
    'a085284e-ca00-4f64-a2c7-42fc0572bc04'::uuid,
    'a085284e-ca00-4f64-a2c7-42fc0572bc05'::uuid,
    'a085284e-ca00-4f64-a2c7-42fc0572bc06'::uuid,
    'a085284e-ca00-4f64-a2c7-42fc0572bc07'::uuid,
    'a085284e-ca00-4f64-a2c7-42fc0572bc08'::uuid
  ];
  item_names TEXT[] := ARRAY['Veg Spring Rolls','Paneer Tikka','Chicken 65','Butter Chicken','Paneer Butter Masala','Garlic Naan','Jeera Rice','Masala Chaas'];
  item_prices INT[] := ARRAY[18000,26000,29000,38000,34000,7000,12000,6000];
  item_idx INT;
  v_order_id UUID;
  created_ts TIMESTAMP;
  qty INT;
  status_text TEXT;
  total INT;
BEGIN
  -- Reset tenant order data to keep seed deterministic
  DELETE FROM order_status_history osh WHERE osh.order_id IN (SELECT o.id FROM orders o WHERE o.tenant_id = tenant);
  DELETE FROM order_items oi WHERE oi.order_id IN (SELECT o.id FROM orders o WHERE o.tenant_id = tenant);
  DELETE FROM orders WHERE tenant_id = tenant;

  -- Historical realistic orders (36 over last 7 days)
  FOR i IN 1..36 LOOP
    item_idx := 1 + (i % 8);
    qty := 1 + (i % 3);
    total := item_prices[item_idx] * qty;
    created_ts := NOW() - (((i - 1) % 7) || ' days')::interval - ((2 + (i % 10)) || ' hours')::interval;

    IF (i % 11 = 0) THEN
      status_text := 'CANCELLED';
    ELSE
      status_text := 'DELIVERED';
    END IF;

    v_order_id := gen_random_uuid();
    INSERT INTO orders (id, tenant_id, status, total_amount, notes, customer_name, customer_phone, created_at, updated_at)
    VALUES (
      v_order_id,
      tenant,
      status_text,
      total,
      CASE WHEN i % 4 = 0 THEN 'Less spicy' WHEN i % 5 = 0 THEN 'No onion' ELSE NULL END,
      'Guest #' || i,
      '98' || LPAD((10000000 + i)::text, 8, '0'),
      created_ts,
      created_ts + INTERVAL '35 minutes'
    );

    INSERT INTO order_items (id, order_id, tenant_id, menu_item_id, name, price, quantity, created_at)
    VALUES (
      gen_random_uuid(),
      v_order_id,
      tenant,
      item_ids[item_idx],
      item_names[item_idx],
      item_prices[item_idx],
      qty,
      created_ts
    );

    IF status_text = 'CANCELLED' THEN
      INSERT INTO order_status_history (id, order_id, old_status, new_status, changed_by, changed_at)
      VALUES
        (gen_random_uuid(), v_order_id, 'PENDING', 'CANCELLED', 'system-seed', created_ts + INTERVAL '4 minutes');
    ELSE
      INSERT INTO order_status_history (id, order_id, old_status, new_status, changed_by, changed_at)
      VALUES
        (gen_random_uuid(), v_order_id, 'PENDING', 'CONFIRMED', 'system-seed', created_ts + INTERVAL '4 minutes'),
        (gen_random_uuid(), v_order_id, 'CONFIRMED', 'PREPARING', 'system-seed', created_ts + INTERVAL '11 minutes'),
        (gen_random_uuid(), v_order_id, 'PREPARING', 'READY', 'system-seed', created_ts + ((20 + (i % 16)) || ' minutes')::interval);

      IF status_text = 'DELIVERED' THEN
        INSERT INTO order_status_history (id, order_id, old_status, new_status, changed_by, changed_at)
        VALUES (gen_random_uuid(), v_order_id, 'READY', 'DELIVERED', 'system-seed', created_ts + ((30 + (i % 20)) || ' minutes')::interval);
      END IF;
    END IF;
  END LOOP;

  -- Live kitchen queue: exactly 2 pending, 2 confirmed, 2 preparing
  FOR i IN 1..6 LOOP
    item_idx := 1 + ((i + 2) % 8);
    qty := 1 + (i % 2);
    total := item_prices[item_idx] * qty;
    created_ts := NOW() - ((i * 7) || ' minutes')::interval;

    status_text := CASE
      WHEN i <= 2 THEN 'PENDING'
      WHEN i <= 4 THEN 'CONFIRMED'
      ELSE 'PREPARING'
    END;

    v_order_id := gen_random_uuid();
    INSERT INTO orders (id, tenant_id, status, total_amount, notes, customer_name, customer_phone, created_at, updated_at)
    VALUES (
      v_order_id,
      tenant,
      status_text,
      total,
      CASE WHEN i = 1 THEN 'No spicy' WHEN i = 3 THEN 'Fast delivery please' ELSE NULL END,
      'Walk-in ' || i,
      '97' || LPAD((20000000 + i)::text, 8, '0'),
      created_ts,
      NOW()
    );

    INSERT INTO order_items (id, order_id, tenant_id, menu_item_id, name, price, quantity, created_at)
    VALUES (
      gen_random_uuid(),
      v_order_id,
      tenant,
      item_ids[item_idx],
      item_names[item_idx],
      item_prices[item_idx],
      qty,
      created_ts
    );

    IF status_text IN ('CONFIRMED', 'PREPARING') THEN
      INSERT INTO order_status_history (id, order_id, old_status, new_status, changed_by, changed_at)
      VALUES (gen_random_uuid(), v_order_id, 'PENDING', 'CONFIRMED', 'kitchen-seed', created_ts + INTERVAL '2 minutes');
    END IF;

    IF status_text = 'PREPARING' THEN
      INSERT INTO order_status_history (id, order_id, old_status, new_status, changed_by, changed_at)
      VALUES (gen_random_uuid(), v_order_id, 'CONFIRMED', 'PREPARING', 'kitchen-seed', created_ts + INTERVAL '8 minutes');
    END IF;
  END LOOP;

  -- Inventory baseline (currently menu-item level, not raw-material BOM)
  DELETE FROM inventory WHERE tenant_id = tenant;
  INSERT INTO inventory (id, tenant_id, menu_item_id, quantity, low_stock_threshold, created_at, updated_at)
  VALUES
    (gen_random_uuid(), tenant, 'a085284e-ca00-4f64-a2c7-42fc0572bc01', 65, 20, NOW(), NOW()),
    (gen_random_uuid(), tenant, 'a085284e-ca00-4f64-a2c7-42fc0572bc02', 48, 15, NOW(), NOW()),
    (gen_random_uuid(), tenant, 'a085284e-ca00-4f64-a2c7-42fc0572bc03', 28, 12, NOW(), NOW()),
    (gen_random_uuid(), tenant, 'a085284e-ca00-4f64-a2c7-42fc0572bc04', 34, 10, NOW(), NOW()),
    (gen_random_uuid(), tenant, 'a085284e-ca00-4f64-a2c7-42fc0572bc05', 22, 10, NOW(), NOW());
END $$;
