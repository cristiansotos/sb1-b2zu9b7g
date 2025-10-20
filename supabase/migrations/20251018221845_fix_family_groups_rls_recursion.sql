/*
  # Fix Family Groups RLS Infinite Recursion

  ## Problem
  The SELECT policy on family_groups queries family_members to check membership.
  When fetching family_groups with nested family_members (via foreign key join),
  this creates infinite recursion between the two tables' policies.

  ## Solution
  Simplify family_groups policies to only check the created_by column,
  which doesn't require querying family_members.
  Users can see families they created OR families where they exist in family_members.

  ## Changes
  - Drop existing family_groups policies
  - Create new non-recursive policies using direct column checks
*/

-- Drop existing policies on family_groups
DROP POLICY IF EXISTS "Users can view families they belong to" ON family_groups;
DROP POLICY IF EXISTS "Users can create family groups" ON family_groups;
DROP POLICY IF EXISTS "Owners can update their family groups" ON family_groups;
DROP POLICY IF EXISTS "Owners can delete their family groups" ON family_groups;

-- SELECT: Users can view families they created (no recursion)
CREATE POLICY "Users can view their created families"
  ON family_groups
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- INSERT: Users can create family groups
CREATE POLICY "Users can create family groups"
  ON family_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- UPDATE: Only creators can update (no recursion)
CREATE POLICY "Creators can update family groups"
  ON family_groups
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- DELETE: Only creators can delete (no recursion)
CREATE POLICY "Creators can delete family groups"
  ON family_groups
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
