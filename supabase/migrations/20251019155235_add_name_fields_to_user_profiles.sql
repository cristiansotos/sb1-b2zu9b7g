/*
  # Add Name Fields to User Profiles

  ## Overview
  Extends user_profiles table to support separate name fields (first name, last name, second last name).
  
  ## Changes
  1. Adds New Columns
    - `first_name` (text) - Required first name
    - `last_name` (text) - Required last name (primer apellido)
    - `second_last_name` (text) - Optional second last name (segundo apellido)
  
  2. Data Migration
    - Migrates existing `full_name` data by setting it to `first_name`
    - Existing users can update their names through the profile settings
  
  ## Notes
  - `full_name` column is kept for backwards compatibility but deprecated
  - New registrations will use the separate name fields
*/

-- Add new name columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'second_last_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN second_last_name text;
  END IF;
END $$;

-- Migrate existing full_name data to first_name
UPDATE user_profiles 
SET first_name = full_name 
WHERE first_name IS NULL AND full_name IS NOT NULL;
