-- V25: Food card metadata (diet_type, flavour, allergens, nutrition)
-- Adds fields for FSSAI-standard food cards and expanded item sheets.

-- 1. Extend menu_items (VARCHAR for JPA enum mapping)
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS diet_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS serving_size VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ingredients TEXT,
  ADD COLUMN IF NOT EXISTS spice_level SMALLINT;

-- Set default for new column, backfill from is_vegetarian
UPDATE menu_items
SET diet_type = CASE
  WHEN is_vegetarian = TRUE THEN 'VEG'
  ELSE 'NON_VEG'
END
WHERE diet_type IS NULL;

ALTER TABLE menu_items
  ALTER COLUMN diet_type SET DEFAULT 'VEG';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_menu_items_spice_level') THEN
    ALTER TABLE menu_items ADD CONSTRAINT chk_menu_items_spice_level
      CHECK (spice_level IS NULL OR spice_level BETWEEN 0 AND 4);
  END IF;
END $$;

-- 2. Flavour tags
CREATE TABLE IF NOT EXISTS menu_item_flavour_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  tag VARCHAR(60) NOT NULL,
  display_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  CONSTRAINT uk_flavour_tag_per_item UNIQUE (menu_item_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_flavour_tags_menu_item_id ON menu_item_flavour_tags(menu_item_id);

-- 3. Allergens (FSSAI Schedule IX)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'allergen_type') THEN
    CREATE TYPE allergen_type AS ENUM (
      'MILK', 'EGGS', 'FISH', 'SHELLFISH', 'TREE_NUTS', 'PEANUTS',
      'WHEAT_GLUTEN', 'SOYBEANS', 'MUSTARD', 'SESAME', 'SULPHITES',
      'CELERY', 'LUPIN', 'MOLLUSCS', 'OTHER'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS menu_item_allergens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  allergen allergen_type NOT NULL,
  notes VARCHAR(200),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  CONSTRAINT uk_allergen_per_item UNIQUE (menu_item_id, allergen)
);

CREATE INDEX IF NOT EXISTS idx_allergens_menu_item_id ON menu_item_allergens(menu_item_id);

-- 4. Nutrition
CREATE TABLE IF NOT EXISTS menu_item_nutrition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  nutrient VARCHAR(30) NOT NULL,
  per_100g VARCHAR(30),
  per_serving VARCHAR(30),
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_sub_row BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  CONSTRAINT uk_nutrient_per_item UNIQUE (menu_item_id, nutrient)
);

CREATE INDEX IF NOT EXISTS idx_nutrition_menu_item_id ON menu_item_nutrition(menu_item_id);

DROP TRIGGER IF EXISTS trigger_menu_item_nutrition_updated_at ON menu_item_nutrition;
CREATE TRIGGER trigger_menu_item_nutrition_updated_at
  BEFORE UPDATE ON menu_item_nutrition
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Reporting view (subqueries avoid row multiplication from JOINs)
CREATE OR REPLACE VIEW vw_menu_item_card AS
SELECT
  mi.id AS item_id,
  mi.tenant_id,
  mi.category_id,
  mi.name,
  mi.description,
  mi.price,
  mi.image_url,
  mi.diet_type,
  mi.is_vegetarian,
  mi.serving_size,
  mi.ingredients,
  mi.spice_level,
  mi.prep_time_minutes,
  mi.is_available,
  mi.display_order,
  (SELECT COALESCE(ARRAY_AGG(ma.allergen), ARRAY[]::TEXT[])
   FROM menu_item_allergens ma
   WHERE ma.menu_item_id = mi.id AND ma.deleted_at IS NULL) AS allergens,
  (SELECT COALESCE(ARRAY_AGG(mf.tag ORDER BY mf.display_order), ARRAY[]::TEXT[])
   FROM menu_item_flavour_tags mf
   WHERE mf.menu_item_id = mi.id AND mf.deleted_at IS NULL) AS flavour_tags
FROM menu_items mi
WHERE mi.deleted_at IS NULL;
