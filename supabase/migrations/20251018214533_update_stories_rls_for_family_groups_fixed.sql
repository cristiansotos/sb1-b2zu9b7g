/*
  # Update Stories RLS for Family Groups

  ## Changes
  - Drop old RLS policies based on user_id
  - Create new policies based on family_members table
  - Stories are now accessed through family membership
  - Maintain backward compatibility during migration

  ## Security
  - Users can only see stories in families they belong to
  - Edit/delete permissions based on role and story creator
*/

-- Drop existing stories RLS policies
DROP POLICY IF EXISTS "Users can view own stories" ON stories;
DROP POLICY IF EXISTS "Users can create stories" ON stories;
DROP POLICY IF EXISTS "Users can update own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON stories;

-- Add created_by column to stories table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE stories ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    
    -- Set created_by to user_id for existing records if user_id exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'stories' AND column_name = 'user_id'
    ) THEN
      UPDATE stories SET created_by = user_id WHERE created_by IS NULL;
    END IF;
  END IF;
END $$;

-- Create new RLS policies for stories
CREATE POLICY "Users can view stories in their families"
  ON stories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM story_family_groups sfg
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE sfg.story_id = stories.id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create stories"
  ON stories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update stories based on permissions"
  ON stories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM story_family_groups sfg
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE sfg.story_id = stories.id
      AND fm.user_id = auth.uid()
      AND (
        fm.role = 'owner'
        OR (fm.role = 'editor' AND stories.created_by = auth.uid())
      )
    )
  );

CREATE POLICY "Users can delete stories based on permissions"
  ON stories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM story_family_groups sfg
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE sfg.story_id = stories.id
      AND fm.user_id = auth.uid()
      AND (
        fm.role = 'owner'
        OR (fm.role = 'editor' AND stories.created_by = auth.uid())
      )
    )
  );

-- Update recordings RLS for family-based access
DROP POLICY IF EXISTS "Users can view recordings for their stories" ON recordings;
DROP POLICY IF EXISTS "Users can create recordings" ON recordings;
DROP POLICY IF EXISTS "Users can update recordings" ON recordings;
DROP POLICY IF EXISTS "Users can delete recordings" ON recordings;

CREATE POLICY "Users can view recordings in their families"
  ON recordings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM chapters c
      JOIN stories s ON s.id = c.story_id
      JOIN story_family_groups sfg ON sfg.story_id = s.id
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE c.id = recordings.chapter_id
      AND fm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM memory_entries me
      JOIN stories s ON s.id = me.story_id
      JOIN story_family_groups sfg ON sfg.story_id = s.id
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE me.id = recordings.memory_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recordings in their families"
  ON recordings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM chapters c
      JOIN stories s ON s.id = c.story_id
      JOIN story_family_groups sfg ON sfg.story_id = s.id
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE c.id = recordings.chapter_id
      AND fm.user_id = auth.uid()
      AND fm.role IN ('owner', 'editor')
    )
    OR EXISTS (
      SELECT 1
      FROM memory_entries me
      JOIN stories s ON s.id = me.story_id
      JOIN story_family_groups sfg ON sfg.story_id = s.id
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE me.id = recordings.memory_id
      AND fm.user_id = auth.uid()
      AND fm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can update recordings in their families"
  ON recordings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM chapters c
      JOIN stories s ON s.id = c.story_id
      JOIN story_family_groups sfg ON sfg.story_id = s.id
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE c.id = recordings.chapter_id
      AND fm.user_id = auth.uid()
      AND fm.role IN ('owner', 'editor')
    )
    OR EXISTS (
      SELECT 1
      FROM memory_entries me
      JOIN stories s ON s.id = me.story_id
      JOIN story_family_groups sfg ON sfg.story_id = s.id
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE me.id = recordings.memory_id
      AND fm.user_id = auth.uid()
      AND fm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Owners can delete recordings"
  ON recordings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM chapters c
      JOIN stories s ON s.id = c.story_id
      JOIN story_family_groups sfg ON sfg.story_id = s.id
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE c.id = recordings.chapter_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'owner'
    )
    OR EXISTS (
      SELECT 1
      FROM memory_entries me
      JOIN stories s ON s.id = me.story_id
      JOIN story_family_groups sfg ON sfg.story_id = s.id
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE me.id = recordings.memory_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'owner'
    )
  );

-- Update chapters RLS
DROP POLICY IF EXISTS "Users can view chapters for their stories" ON chapters;
DROP POLICY IF EXISTS "Users can manage chapters" ON chapters;

CREATE POLICY "Users can view chapters in their families"
  ON chapters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM stories s
      JOIN story_family_groups sfg ON sfg.story_id = s.id
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE s.id = chapters.story_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and editors can manage chapters"
  ON chapters
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM stories s
      JOIN story_family_groups sfg ON sfg.story_id = s.id
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE s.id = chapters.story_id
      AND fm.user_id = auth.uid()
      AND fm.role IN ('owner', 'editor')
    )
  );
