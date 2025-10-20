/*
  # Migrate Existing Data to Family Groups

  ## Changes
  - Create default "My Family" group for each existing user
  - Add users as owners of their default family
  - Associate existing stories with user's default family
  - Preserve data integrity during migration

  ## Process
  1. For each user in auth.users, create a family group
  2. Add user as owner of that family
  3. Link all their stories to their family group
*/

-- Function to migrate existing users and stories
DO $$
DECLARE
  user_record RECORD;
  new_family_id uuid;
BEGIN
  -- Loop through all existing users
  FOR user_record IN 
    SELECT id, email FROM auth.users
  LOOP
    -- Check if user already has a default family
    SELECT id INTO new_family_id
    FROM family_groups
    WHERE created_by = user_record.id
    AND name = 'My Family'
    LIMIT 1;
    
    -- If no default family exists, create one
    IF new_family_id IS NULL THEN
      -- Create default family group
      INSERT INTO family_groups (name, created_by)
      VALUES ('My Family', user_record.id)
      RETURNING id INTO new_family_id;
      
      -- Add user as owner of the family
      INSERT INTO family_members (family_group_id, user_id, role, invited_by)
      VALUES (new_family_id, user_record.id, 'owner', user_record.id);
      
      RAISE NOTICE 'Created default family for user: %', user_record.email;
    END IF;
    
    -- Associate all user's stories with their default family
    -- First check if stories table has user_id column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'stories' AND column_name = 'user_id'
    ) THEN
      -- Insert story associations, avoiding duplicates
      INSERT INTO story_family_groups (story_id, family_group_id, added_by)
      SELECT s.id, new_family_id, user_record.id
      FROM stories s
      WHERE s.user_id = user_record.id
      AND NOT EXISTS (
        SELECT 1 FROM story_family_groups sfg
        WHERE sfg.story_id = s.id
        AND sfg.family_group_id = new_family_id
      );
      
      RAISE NOTICE 'Associated stories for user: %', user_record.email;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully';
END $$;

-- Create trigger to auto-create family group for new users
CREATE OR REPLACE FUNCTION create_default_family_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_family_id uuid;
BEGIN
  -- Create default family group
  INSERT INTO family_groups (name, created_by)
  VALUES ('My Family', NEW.id)
  RETURNING id INTO new_family_id;
  
  -- Add user as owner
  INSERT INTO family_members (family_group_id, user_id, role, invited_by)
  VALUES (new_family_id, NEW.id, 'owner', NEW.id);
  
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_family_for_new_user();
