ALTER TABLE restaurants
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE menu_categories
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE menu_items
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE dining_tables
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE inventory
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_restaurants_deleted_at ON restaurants(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_menu_categories_deleted_at ON menu_categories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_menu_items_deleted_at ON menu_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_order_items_deleted_at ON order_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_dining_tables_deleted_at ON dining_tables(deleted_at);
CREATE INDEX IF NOT EXISTS idx_inventory_deleted_at ON inventory(deleted_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_deleted_at ON subscriptions(deleted_at);
