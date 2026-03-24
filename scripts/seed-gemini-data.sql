-- Additional demo data (run after scripts/seed-demo-data.sql)
-- Usage: Get-Content scripts/seed-gemini-data.sql | docker exec -i dineops-postgres psql -U dineops -d dineops
--
-- Requires: Spice Route restaurant (a085284e-ca00-4f64-a2c7-42fc0572bb97) with menu items already seeded

---
--- 1. ADD NEW RESTAURANTS (skip if already exist)
---
INSERT INTO restaurants (id, name, slug, address, phone, cuisine_type, status, operating_hours, default_prep_time_minutes, notify_customer_email, notify_customer_sms)
VALUES
  (gen_random_uuid(), 'The Pasta House', 'the-pasta-house', '123 Italian Way, Mumbai', '9876543210', 'Italian', 'ACTIVE', '{"monday":{"open":"11:00","close":"23:00"},"tuesday":{"open":"11:00","close":"23:00"},"wednesday":{"open":"11:00","close":"23:00"},"thursday":{"open":"11:00","close":"23:00"},"friday":{"open":"11:00","close":"23:00"},"saturday":{"open":"10:00","close":"00:00"},"sunday":{"open":"10:00","close":"22:00"}}', 25, true, false),
  (gen_random_uuid(), 'Burger Barn', 'burger-barn', '45 Grill Road, Bangalore', '9876543211', 'American', 'ACTIVE', '{"monday":{"open":"12:00","close":"22:00"},"tuesday":{"open":"12:00","close":"22:00"},"wednesday":{"open":"12:00","close":"22:00"},"thursday":{"open":"12:00","close":"22:00"},"friday":{"open":"12:00","close":"23:00"},"saturday":{"open":"12:00","close":"23:00"},"sunday":{"open":"12:00","close":"22:00"}}', 15, true, false)
ON CONFLICT (slug) DO NOTHING;

---
--- 2. ADD TENANT ADMINS (skip if email exists)
---
INSERT INTO users (id, tenant_id, name, email, password_hash, phone, role, is_active)
SELECT
  gen_random_uuid(),
  r.id,
  'Manager of ' || r.name,
  'admin@' || r.slug || '.com',
  '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
  r.phone,
  'TENANT_ADMIN',
  true
FROM restaurants r
WHERE r.slug IN ('the-pasta-house', 'burger-barn')
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.email = 'admin@' || r.slug || '.com');

---
--- 3. ADD SUBSCRIPTIONS
---
INSERT INTO subscriptions (id, tenant_id, plan, status, starts_at, expires_at)
SELECT
  gen_random_uuid(),
  id,
  'STARTER',
  'ACTIVE',
  NOW() - INTERVAL '1 month',
  NOW() + INTERVAL '11 months'
FROM restaurants
WHERE slug IN ('the-pasta-house', 'burger-barn');

---
--- 4. ADD MENU CATEGORIES & ITEMS (The Pasta House) — skip if categories exist
---
DO $$
DECLARE
  pasta_id UUID := (SELECT id FROM restaurants WHERE slug = 'the-pasta-house' LIMIT 1);
  cat_mains UUID;
  cat_dessert UUID;
  cat_count INT;
BEGIN
  IF pasta_id IS NULL THEN RETURN; END IF;
  SELECT COUNT(*) INTO cat_count FROM menu_categories WHERE tenant_id = pasta_id;
  IF cat_count > 0 THEN RETURN; END IF;

  cat_mains := gen_random_uuid();
  cat_dessert := gen_random_uuid();
  INSERT INTO menu_categories (id, tenant_id, name, description, display_order, is_active)
  VALUES
    (cat_mains, pasta_id, 'Main Course', 'Fresh handmade pasta', 1, true),
    (cat_dessert, pasta_id, 'Desserts', 'Sweet treats', 2, true);

  INSERT INTO menu_items (id, tenant_id, category_id, name, description, price, is_vegetarian, is_available, display_order)
  VALUES
    (gen_random_uuid(), pasta_id, cat_mains, 'Penne Arrabbiata', 'Spicy tomato sauce', 45000, true, true, 1),
    (gen_random_uuid(), pasta_id, cat_mains, 'Spaghetti Carbonara', 'Creamy egg and bacon', 55000, false, true, 2),
    (gen_random_uuid(), pasta_id, cat_mains, 'Lasagna', 'Slow cooked beef ragu', 65000, false, true, 3),
    (gen_random_uuid(), pasta_id, cat_dessert, 'Tiramisu', 'Classic coffee dessert', 35000, true, true, 1),
    (gen_random_uuid(), pasta_id, cat_dessert, 'Panna Cotta', 'Vanilla bean cream', 30000, true, true, 2);
END $$;

---
--- 5. ADD MENU CATEGORIES & ITEMS (Burger Barn) — skip if categories exist
---
DO $$
DECLARE
  burger_id UUID := (SELECT id FROM restaurants WHERE slug = 'burger-barn' LIMIT 1);
  cat_burgers UUID;
  cat_sides UUID;
  cat_count INT;
BEGIN
  IF burger_id IS NULL THEN RETURN; END IF;
  SELECT COUNT(*) INTO cat_count FROM menu_categories WHERE tenant_id = burger_id;
  IF cat_count > 0 THEN RETURN; END IF;

  cat_burgers := gen_random_uuid();
  cat_sides := gen_random_uuid();
  INSERT INTO menu_categories (id, tenant_id, name, description, display_order, is_active)
  VALUES
    (cat_burgers, burger_id, 'Burgers', 'Gourmet patties', 1, true),
    (cat_sides, burger_id, 'Sides', 'Crunchy sides', 2, true);

  INSERT INTO menu_items (id, tenant_id, category_id, name, description, price, is_vegetarian, is_available, display_order)
  VALUES
    (gen_random_uuid(), burger_id, cat_burgers, 'Classic Cheese', 'Beef patty and cheddar', 35000, false, true, 1),
    (gen_random_uuid(), burger_id, cat_burgers, 'The Veggie Stack', 'Potato and corn patty', 30000, true, true, 2),
    (gen_random_uuid(), burger_id, cat_burgers, 'Bacon Deluxe', 'Double bacon and beef', 48000, false, true, 3),
    (gen_random_uuid(), burger_id, cat_sides, 'French Fries', 'Salted crispy fries', 15000, true, true, 1),
    (gen_random_uuid(), burger_id, cat_sides, 'Onion Rings', 'Beer battered', 18000, true, true, 2);
END $$;

---
--- 6. ADD ORDERS FOR SPICE ROUTE (Existing Restaurant)
--- (Order 3 total fixed: 30000 + 60000 = 90000)
---
DO $$
DECLARE
  spice_id UUID := 'a085284e-ca00-4f64-a2c7-42fc0572bb97';
  item_spring_rolls UUID := (SELECT id FROM menu_items WHERE tenant_id = spice_id AND name = 'Veg Spring Rolls' ORDER BY created_at LIMIT 1);
  item_paneer UUID := (SELECT id FROM menu_items WHERE tenant_id = spice_id AND name = 'Paneer Tikka' ORDER BY created_at LIMIT 1);
  item_chicken UUID := (SELECT id FROM menu_items WHERE tenant_id = spice_id AND name = 'Chicken 65' ORDER BY created_at LIMIT 1);
  order1 UUID := gen_random_uuid();
  order2 UUID := gen_random_uuid();
  order3 UUID := gen_random_uuid();
BEGIN
  -- Order 1: PENDING
  INSERT INTO orders (id, tenant_id, status, total_amount, notes, customer_name, customer_phone)
  VALUES (order1, spice_id, 'PENDING', 30000, 'No spicy', 'Rahul Sharma', '9999999999');
  INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity)
  VALUES (gen_random_uuid(), order1, item_spring_rolls, 'Veg Spring Rolls', 15000, 2);

  -- Order 2: CONFIRMED
  INSERT INTO orders (id, tenant_id, status, total_amount, notes, customer_name, customer_phone)
  VALUES (order2, spice_id, 'CONFIRMED', 45000, 'Fast delivery please', 'Ananya Iyer', '8888888888');
  INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity)
  VALUES (gen_random_uuid(), order2, item_paneer, 'Paneer Tikka', 22500, 2);

  -- Order 3: PREPARING (total = 30000*1 + 30000*2 = 90000)
  INSERT INTO orders (id, tenant_id, status, total_amount, customer_name, customer_phone)
  VALUES (order3, spice_id, 'PREPARING', 90000, 'Vikram Singh', '7777777777');
  INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity)
  VALUES
    (gen_random_uuid(), order3, item_chicken, 'Chicken 65', 30000, 1),
    (gen_random_uuid(), order3, item_spring_rolls, 'Veg Spring Rolls', 30000, 2);
END $$;
