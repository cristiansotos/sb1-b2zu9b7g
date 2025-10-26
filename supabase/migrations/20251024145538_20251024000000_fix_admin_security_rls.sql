/*
  # Fix Admin Security and Harden RLS Policies
  
  ## Overview
  Implements database-driven admin role management and hardens RLS policies
  for configuration tables to prevent unauthorized modifications.
  
  ## Changes
  
  ### 1. User Profiles Enhancement
  - Add `is_admin` boolean column to user_profiles table
  - Set existing admin user (cristian.sotos.v@gmail.com) as admin
  - Default new users to non-admin (is_admin = false)
  
  ### 2. Admin Helper Function
  - Create `is_admin()` function to check if current user is admin
  - Returns true if user has is_admin = true in user_profiles
  - Returns false if not authenticated or not admin
  
  ### 3. Hardened RLS Policies
  
  #### ai_model_settings
  - Remove all existing policies
  - SELECT: Service role only (for Edge Functions)
  - ALL: Admin users only
  
  #### audio_quality_settings
  - Remove all existing policies
  - SELECT: All authenticated users (needed for validation)
  - INSERT/UPDATE/DELETE: Admin users only
  
  #### section_templates
  - Remove all existing policies
  - SELECT: All authenticated users (needed for UI)
  - INSERT/UPDATE/DELETE: Admin users only
  
  ## Security Impact
  - Prevents non-admin users from modifying AI models
  - Prevents non-admin users from changing audio quality thresholds
  - Prevents non-admin users from corrupting question templates
  - Centralizes admin management in database
*/

-- Step 1: Add is_admin column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin boolean DEFAULT false NOT NULL;
    
    -- Set existing admin user
    UPDATE user_profiles 
    SET is_admin = true 
    WHERE email = 'cristian.sotos.v@gmail.com';
  END IF;
END $$;

-- Step 2: Create is_admin() helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Step 3: Clean up ai_model_settings policies
DROP POLICY IF EXISTS "Authenticated users can view AI model settings" ON ai_model_settings;
DROP POLICY IF EXISTS "Authenticated users can update AI model settings" ON ai_model_settings;
DROP POLICY IF EXISTS "Authenticated users can read AI model settings" ON ai_model_settings;
DROP POLICY IF EXISTS "Service role can read AI model settings" ON ai_model_settings;
DROP POLICY IF EXISTS "Admins can manage AI model settings" ON ai_model_settings;
DROP POLICY IF EXISTS "Service can read AI model settings" ON ai_model_settings;

-- Create new ai_model_settings policies
CREATE POLICY "Service role reads AI settings"
  ON ai_model_settings
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Admins manage AI settings"
  ON ai_model_settings
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Step 4: Clean up audio_quality_settings policies
DROP POLICY IF EXISTS "Authenticated users can read audio quality settings" ON audio_quality_settings;
DROP POLICY IF EXISTS "Authenticated users can update audio quality settings" ON audio_quality_settings;
DROP POLICY IF EXISTS "Admins can modify audio quality settings" ON audio_quality_settings;
DROP POLICY IF EXISTS "Admins can update audio quality settings" ON audio_quality_settings;
DROP POLICY IF EXISTS "Admins can delete audio quality settings" ON audio_quality_settings;

-- Create new audio_quality_settings policies
CREATE POLICY "Users read audio quality settings"
  ON audio_quality_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins modify audio quality settings"
  ON audio_quality_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins update audio quality settings"
  ON audio_quality_settings
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins delete audio quality settings"
  ON audio_quality_settings
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Step 5: Clean up section_templates policies
DROP POLICY IF EXISTS "Authenticated users can read section templates" ON section_templates;
DROP POLICY IF EXISTS "Authenticated users can create section templates" ON section_templates;
DROP POLICY IF EXISTS "Authenticated users can update section templates" ON section_templates;
DROP POLICY IF EXISTS "Authenticated users can delete section templates" ON section_templates;
DROP POLICY IF EXISTS "Admins can create section templates" ON section_templates;
DROP POLICY IF EXISTS "Admins can update section templates" ON section_templates;
DROP POLICY IF EXISTS "Admins can delete section templates" ON section_templates;

-- Create new section_templates policies
CREATE POLICY "Users read section templates"
  ON section_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins create section templates"
  ON section_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins update section templates"
  ON section_templates
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins delete section templates"
  ON section_templates
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Step 6: Add index for is_admin lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin 
  ON user_profiles(is_admin) 
  WHERE is_admin = true;

-- Step 7: Add policy for admins to manage other users
DROP POLICY IF EXISTS "Admins can manage admin status" ON user_profiles;

CREATE POLICY "Admins manage user profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Step 8: Add comments
COMMENT ON FUNCTION public.is_admin() IS 'Returns true if the current authenticated user has admin privileges';
COMMENT ON COLUMN user_profiles.is_admin IS 'Indicates if user has administrator privileges. Set to true for admin users.';
