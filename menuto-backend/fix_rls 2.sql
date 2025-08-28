-- Temporarily disable RLS for testing
-- Run this in your Supabase SQL Editor

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings DISABLE ROW LEVEL SECURITY;

-- Or alternatively, add policies that allow all operations for now
-- DROP POLICY IF EXISTS "Users can see their own profile" ON users;
-- DROP POLICY IF EXISTS "Users can manage their own ratings" ON user_ratings;

-- Allow all operations for testing
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_ratings" ON user_ratings FOR ALL USING (true);

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;