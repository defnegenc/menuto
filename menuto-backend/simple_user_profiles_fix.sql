-- Simple fix for user_profiles table to work with Clerk
-- Run this in your Supabase SQL Editor

-- Drop the foreign key constraint that's causing issues
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Change the id column to text to accept Clerk user IDs directly
ALTER TABLE user_profiles ALTER COLUMN id TYPE text;

-- Update RLS policies to allow operations
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow all operations on user_profiles" ON user_profiles;

-- Create new policies that allow operations for now
CREATE POLICY "Allow all operations on user_profiles" ON user_profiles
    FOR ALL USING (true) WITH CHECK (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Updated user_profiles table to work with Clerk user IDs!';
    RAISE NOTICE 'Foreign key constraint removed - user_profiles can now store Clerk user IDs directly.';
END $$;
