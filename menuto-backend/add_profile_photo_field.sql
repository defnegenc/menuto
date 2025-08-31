-- Add profile_photo field to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN profile_photo TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.profile_photo IS 'URI/path to user profile photo image';
