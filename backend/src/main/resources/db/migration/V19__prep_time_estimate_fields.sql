ALTER TABLE restaurants
    ADD COLUMN IF NOT EXISTS default_prep_time_minutes INTEGER NOT NULL DEFAULT 20;

ALTER TABLE menu_items
    ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_restaurants_default_prep_time_positive'
    ) THEN
        ALTER TABLE restaurants
            ADD CONSTRAINT chk_restaurants_default_prep_time_positive CHECK (default_prep_time_minutes > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_menu_items_prep_time_positive'
    ) THEN
        ALTER TABLE menu_items
            ADD CONSTRAINT chk_menu_items_prep_time_positive CHECK (prep_time_minutes IS NULL OR prep_time_minutes > 0);
    END IF;
END $$;
