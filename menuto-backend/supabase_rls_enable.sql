-- Re-enable Row Level Security after migration
-- Run this AFTER the data migration is complete

-- Re-enable RLS after migration
ALTER TABLE parsed_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

SELECT 'RLS re-enabled after migration' as status;