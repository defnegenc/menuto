-- Clean up bad user IDs in user_profiles table
-- This script removes entries with email-derived user IDs and null UUIDs

-- First, let's see what we have
SELECT id, name, email, created_at FROM user_profiles ORDER BY created_at DESC;

-- Delete entries with bad user IDs (email-derived or null UUIDs)
DELETE FROM user_profiles 
WHERE id = '00000000-0000-0000-0000-00000000' 
   OR id LIKE 'user_%' 
   OR id = 'undefined'
   OR id IS NULL;

-- Verify the cleanup
SELECT id, name, email, created_at FROM user_profiles ORDER BY created_at DESC;

-- Note: After running this, you'll need to sign up again with a new account
-- The new account will use proper Clerk user IDs
