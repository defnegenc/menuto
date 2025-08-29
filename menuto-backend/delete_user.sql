-- Delete User Account from Supabase
-- Run this in your Supabase SQL Editor to delete a specific user

-- Replace 'user_31vOvwcDdZGL5h7JUvWMUk3raR2' with the user ID you want to delete
DELETE FROM user_profiles WHERE id = 'user_31vOvwcDdZGL5h7JUvWMUk3raR2';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'User account deleted successfully!';
    RAISE NOTICE 'You can now recreate the account.';
END $$;
