-- Clean up unnecessary tables in Supabase
-- Run this in your Supabase SQL Editor to remove tables we don't need

-- Drop unnecessary tables and their policies
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS user_ratings CASCADE; 
DROP TABLE IF EXISTS reviewer_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS dishes CASCADE;

-- Success message
SELECT 'Unnecessary tables cleaned up successfully!' as result;