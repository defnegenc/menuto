-- Temporarily disable Row Level Security for data migration
-- Run this BEFORE the migration, then run the enable script AFTER

-- Disable RLS temporarily for migration
ALTER TABLE parsed_menus DISABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_dishes DISABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

SELECT 'RLS disabled for migration' as status;