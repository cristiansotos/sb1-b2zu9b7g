/*
  # Completely Fix Family Members RLS - No Recursion

  ## Problem
  Any policy that queries family_members while protecting family_members
  creates infinite recursion.

  ## Solution
  Use ONLY direct column checks and joins to other tables (family_groups)
  without ever querying family_members in the policy.

  ## Changes
  - Drop ALL existing policies on family_members
  - Create new policies that NEVER query family_members
*/

-- Drop ALL policies on family_members
DROP POLICY IF EXISTS "Users can view members of their families" ON family_members;
DROP POLICY IF EXISTS "System can insert members on family creation" ON family_members;
DROP POLICY IF EXISTS "Owners can update member roles" ON family_members;
DROP POLICY IF EXISTS "Owners can remove members" ON family_members;

-- Simple SELECT: Users can see themselves and anyone in families they own
CREATE POLICY "Users can view family members"
  ON family_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR family_group_id IN (
      SELECT id FROM family_groups WHERE created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM family_groups fg
      WHERE fg.id = family_members.family_group_id
      AND (
        fg.created_by = auth.uid()
        OR family_members.user_id = auth.uid()
      )
    )
  );

-- INSERT: Allow authenticated users to insert (for family creation and invitations)
CREATE POLICY "Allow member insertion"
  ON family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Only family group owners can update roles
CREATE POLICY "Owners can update roles"
  ON family_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_groups fg
      WHERE fg.id = family_members.family_group_id
      AND fg.created_by = auth.uid()
    )
  );

-- DELETE: Family owners can remove anyone, users can remove themselves
CREATE POLICY "Remove members"
  ON family_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM family_groups fg
      WHERE fg.id = family_members.family_group_id
      AND fg.created_by = auth.uid()
    )
  );
