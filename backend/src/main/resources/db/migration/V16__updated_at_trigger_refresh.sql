-- Ensure trigger function exists for all updated_at managed tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- dining_tables was introduced after V6 and also has updated_at
DROP TRIGGER IF EXISTS trigger_dining_tables_updated_at ON dining_tables;
CREATE TRIGGER trigger_dining_tables_updated_at
    BEFORE UPDATE ON dining_tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
