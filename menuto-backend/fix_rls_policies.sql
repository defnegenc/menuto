-- Temporarily disable RLS for data migration
ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_menus DISABLE ROW LEVEL SECURITY; 
ALTER TABLE parsed_dishes DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with updated policies after migration
-- You can run this after data migration is complete:
/*
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_dishes ENABLE ROW LEVEL SECURITY; 
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Update policies to allow service role access
CREATE POLICY "Allow service role full access" ON restaurants
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access" ON parsed_menus
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access" ON parsed_dishes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access" ON user_profiles
  FOR ALL USING (true) WITH CHECK (true);
*/

-- Fix RLS Policies for Menu Parsing
-- Run this in your Supabase SQL Editor

-- Allow service role to insert into parsed_menus
CREATE POLICY "Service role can insert parsed menus" ON parsed_menus
    FOR INSERT WITH CHECK (true);

-- Allow service role to insert into parsed_dishes  
CREATE POLICY "Service role can insert parsed dishes" ON parsed_dishes
    FOR INSERT WITH CHECK (true);

-- Allow service role to update parsed_menus
CREATE POLICY "Service role can update parsed menus" ON parsed_menus
    FOR UPDATE USING (true);

-- Allow service role to update parsed_dishes
CREATE POLICY "Service role can update parsed dishes" ON parsed_dishes
    FOR UPDATE USING (true);

-- Allow service role to delete from parsed_dishes (for clearing existing dishes)
CREATE POLICY "Service role can delete parsed dishes" ON parsed_dishes
    FOR DELETE USING (true);