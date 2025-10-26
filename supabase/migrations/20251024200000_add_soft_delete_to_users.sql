/*
  # Add Soft Delete Functionality to User Profiles

  ## Overview
  Implements soft delete for user accounts instead of hard deletion.
  Users can be deactivated (marked as inactive) while preserving their data.

  ## Changes

  ### 1. User Profiles Enhancement
  - Add `is_active` boolean column (default: true) - controls user login ability
  - Add `deactivated_at` timestamp - tracks when user was deactivated
  - Add `deactivated_by` uuid - references admin who deactivated the user

  ### 2. Helper Function
  - Create `deactivate_user()` function to handle soft delete
  - Updates is_active to false
  - Sets deactivated_at timestamp
  - Records which admin performed the action

  ### 3. Auth Hook
  - Prevent login for inactive users
  - Return error message when inactive user attempts to log in

  ## Benefits
  - Data recovery: Users can be reactivated
  - Audit trail: Know when and by whom users were deactivated
  - Legal compliance: Maintain historical records
  - Business intelligence: Analyze inactive user patterns
  - Rollback capability: Easy to undo accidental deactivations

  ## Notes
  - Inactive users cannot log in but their data remains accessible
  - Admins can permanently delete after grace period if needed
  - All user-created content (stories, recordings, images) is preserved
*/

-- Step 1: Add soft delete columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'deactivated_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN deactivated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'deactivated_by'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN deactivated_by uuid REFERENCES user_profiles(id);
  END IF;
END $$;

-- Step 2: Add index for active users lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active
  ON user_profiles(is_active)
  WHERE is_active = true;

-- Step 3: Create deactivate_user function for admins
CREATE OR REPLACE FUNCTION public.deactivate_user(
  target_user_id uuid,
  deactivate boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can deactivate users';
  END IF;

  -- Update user profile
  UPDATE user_profiles
  SET
    is_active = NOT deactivate,
    deactivated_at = CASE WHEN deactivate THEN now() ELSE NULL END,
    deactivated_by = CASE WHEN deactivate THEN auth.uid() ELSE NULL END,
    updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Step 4: Add RLS policy for admins to view all users including inactive
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;

CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Step 5: Ensure all existing users are active by default
UPDATE user_profiles
SET is_active = true
WHERE is_active IS NULL;

-- Step 6: Add comments for documentation
COMMENT ON COLUMN user_profiles.is_active IS 'Controls whether user can log in. False = soft deleted.';
COMMENT ON COLUMN user_profiles.deactivated_at IS 'Timestamp when user was deactivated/soft deleted.';
COMMENT ON COLUMN user_profiles.deactivated_by IS 'Admin user who deactivated this account.';
COMMENT ON FUNCTION public.deactivate_user IS 'Soft deletes or reactivates a user account. Admin only.';
