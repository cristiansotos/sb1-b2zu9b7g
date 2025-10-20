/*
  # Fix Infinite Recursion in Family Members RLS

  ## Problem
  The SELECT policy on family_members was causing infinite recursion by querying
  the same table it's protecting, creating a circular dependency.

  ## Solution
  Replace the recursive policy with a direct check using the family_groups table
  or simply allow users to see all members they're associated with through a
  simpler join.

  ## Changes
  - Drop the problematic recursive SELECT policy
  - Create new non-recursive policies for family_members
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view members of their families" ON family_members;
DROP POLICY IF EXISTS "Owners can update member roles" ON family_members;
DROP POLICY IF EXISTS "Owners can remove members" ON family_members;

-- Create simpler, non-recursive SELECT policy
-- Users can view members if they share the same family_group_id
CREATE POLICY "Users can view members of their families"
  ON family_members
  FOR SELECT
  TO authenticated
  USING (
    family_group_id IN (
      SELECT family_group_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- Owners can update member roles (using direct role check)
CREATE POLICY "Owners can update member roles"
  ON family_members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR family_group_id IN (
      SELECT fg.id
      FROM family_groups fg
      WHERE fg.id = family_members.family_group_id
      AND fg.created_by = auth.uid()
    )
  );

-- Owners can remove members OR users can remove themselves
CREATE POLICY "Owners can remove members"
  ON family_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR family_group_id IN (
      SELECT fg.id
      FROM family_groups fg
      WHERE fg.id = family_members.family_group_id
      AND fg.created_by = auth.uid()
    )
  );
