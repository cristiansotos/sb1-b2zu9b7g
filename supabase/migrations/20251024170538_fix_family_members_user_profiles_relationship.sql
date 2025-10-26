/*
  # Fix Family Members to User Profiles Relationship

  ## Overview
  Adds a foreign key constraint between family_members.user_id and user_profiles.id
  to enable proper PostgREST joins when fetching family member data with user profile information.

  ## Changes Made
  
  1. **Foreign Key Addition**
     - Adds constraint linking family_members.user_id to user_profiles.id
     - Since both tables reference auth.users(id), this relationship is valid
     - Enables proper PostgREST resource embedding for queries
  
  2. **Index for Performance**
     - Ensures index exists on family_members.user_id for join performance
  
  ## Important Notes
  - This constraint is safe because:
    - family_members.user_id references auth.users(id)
    - user_profiles.id references auth.users(id)
    - Both reference the same parent table
  - The constraint will fail if there are any family_members records with user_ids
    that don't have corresponding user_profiles records
  - If migration fails, run the user_profiles backfill first to create missing profiles
*/

-- Ensure all users in family_members have profiles (safety check)
-- This inserts any missing profiles for users who are family members
INSERT INTO user_profiles (id, email, created_at, updated_at)
SELECT DISTINCT 
  fm.user_id,
  au.email,
  au.created_at,
  now()
FROM family_members fm
JOIN auth.users au ON au.id = fm.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.id = fm.user_id
)
ON CONFLICT (id) DO NOTHING;

-- Add foreign key constraint from family_members to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'family_members_user_id_fkey_profiles'
    AND table_name = 'family_members'
  ) THEN
    ALTER TABLE family_members 
    ADD CONSTRAINT family_members_user_id_fkey_profiles 
    FOREIGN KEY (user_id) 
    REFERENCES user_profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure index exists for performance (likely already exists, but verify)
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
