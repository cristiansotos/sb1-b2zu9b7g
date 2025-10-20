/*
  # Family Groups Architecture

  ## Overview
  Implements multi-user family group system where:
  - Users can create and join multiple family groups (max 4 owned per user)
  - Stories can be associated with multiple family groups
  - Three role levels: Owner, Editor, Viewer with customizable permissions
  - Email-based invitation system with role selection

  ## New Tables

  ### family_groups
  Represents independent family units (e.g., "Sotos Villaescusa", "Sotos García")
  - `id` (uuid, PK) - Unique identifier
  - `name` (text) - Family group name (not globally unique)
  - `created_by` (uuid, FK) - User who created the group
  - `created_at` (timestamptz) - Creation timestamp
  - `settings` (jsonb) - Future extensibility for group settings

  ### family_members
  Links users to family groups with roles
  - `id` (uuid, PK)
  - `family_group_id` (uuid, FK → family_groups)
  - `user_id` (uuid, FK → auth.users)
  - `role` (text) - 'owner', 'editor', or 'viewer'
  - `invited_by` (uuid, FK → auth.users) - Who invited this member
  - `joined_at` (timestamptz) - When they joined
  - UNIQUE constraint on (family_group_id, user_id)

  ### story_family_groups (Junction Table)
  Many-to-many relationship: stories can be in multiple families
  - `id` (uuid, PK)
  - `story_id` (uuid, FK → stories)
  - `family_group_id` (uuid, FK → family_groups)
  - `added_by` (uuid, FK → auth.users) - Who added story to this family
  - `added_at` (timestamptz)
  - UNIQUE constraint on (story_id, family_group_id)

  ### family_invitations
  Tracks pending and completed invitations
  - `id` (uuid, PK)
  - `family_group_id` (uuid, FK → family_groups)
  - `email` (text) - Invitee email
  - `role` (text) - Invited role
  - `invited_by` (uuid, FK → auth.users)
  - `token` (uuid, UNIQUE) - Secure invitation token
  - `expires_at` (timestamptz) - Default 7 days
  - `status` (text) - 'pending', 'accepted', 'expired', 'cancelled'
  - `accepted_at` (timestamptz)
  - `created_at` (timestamptz)

  ### role_permissions
  Admin-configurable permissions per role
  - `id` (uuid, PK)
  - `role_name` (text) - 'owner', 'editor', 'viewer'
  - `permission_key` (text) - e.g., 'story.create', 'member.invite'
  - `is_enabled` (boolean) - Whether this permission is active
  - `updated_by` (uuid, FK → auth.users)
  - `updated_at` (timestamptz)
  - UNIQUE constraint on (role_name, permission_key)

  ## Security
  - RLS enabled on all tables
  - Policies enforce family membership and role permissions
  - Stories accessible only to family members
  - Invitations only visible to family owners/editors

  ## Functions
  - `check_user_permission` - Validates if user has specific permission in family
  - `get_user_owned_family_count` - Counts families where user is owner (for 4-group limit)
  - `get_story_families` - Returns all families a story belongs to
*/

-- Create family_groups table
CREATE TABLE IF NOT EXISTS family_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb
);

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id uuid REFERENCES family_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(family_group_id, user_id)
);

-- Create story_family_groups junction table
CREATE TABLE IF NOT EXISTS story_family_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  family_group_id uuid REFERENCES family_groups(id) ON DELETE CASCADE NOT NULL,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(story_id, family_group_id)
);

-- Create family_invitations table
CREATE TABLE IF NOT EXISTS family_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id uuid REFERENCES family_groups(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '7 days') NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL CHECK (role_name IN ('owner', 'editor', 'viewer')),
  permission_key text NOT NULL,
  is_enabled boolean DEFAULT true NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(role_name, permission_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_group_id);
CREATE INDEX IF NOT EXISTS idx_story_families_story ON story_family_groups(story_id);
CREATE INDEX IF NOT EXISTS idx_story_families_family ON story_family_groups(family_group_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON family_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON family_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON family_invitations(status);

-- Enable Row Level Security
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for family_groups
CREATE POLICY "Users can view families they belong to"
  ON family_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_group_id = family_groups.id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create family groups"
  ON family_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update their family groups"
  ON family_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_group_id = family_groups.id
      AND family_members.user_id = auth.uid()
      AND family_members.role = 'owner'
    )
  );

CREATE POLICY "Owners can delete their family groups"
  ON family_groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_group_id = family_groups.id
      AND family_members.user_id = auth.uid()
      AND family_members.role = 'owner'
    )
  );

-- RLS Policies for family_members
CREATE POLICY "Users can view members of their families"
  ON family_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_group_id = family_members.family_group_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert members on family creation"
  ON family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owners can update member roles"
  ON family_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_group_id = family_members.family_group_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'owner'
    )
  );

CREATE POLICY "Owners can remove members"
  ON family_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_group_id = family_members.family_group_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'owner'
    )
    OR family_members.user_id = auth.uid()
  );

-- RLS Policies for story_family_groups
CREATE POLICY "Users can view story associations for their families"
  ON story_family_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_group_id = story_family_groups.family_group_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can add stories to families"
  ON story_family_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_group_id = story_family_groups.family_group_id
      AND family_members.user_id = auth.uid()
      AND family_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Members can remove stories from families"
  ON story_family_groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_group_id = story_family_groups.family_group_id
      AND family_members.user_id = auth.uid()
      AND family_members.role IN ('owner', 'editor')
    )
  );

-- RLS Policies for family_invitations
CREATE POLICY "Users can view invitations for their families"
  ON family_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_group_id = family_invitations.family_group_id
      AND family_members.user_id = auth.uid()
      AND family_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Members can create invitations"
  ON family_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_group_id = family_invitations.family_group_id
      AND family_members.user_id = auth.uid()
      AND family_members.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can update invitations they created"
  ON family_invitations
  FOR UPDATE
  TO authenticated
  USING (invited_by = auth.uid());

-- RLS Policies for role_permissions
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage role permissions"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'cristian.sotos.v@gmail.com'
    )
  );

-- Helper function: Get count of families where user is owner
CREATE OR REPLACE FUNCTION get_user_owned_family_count(user_id_param uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM family_members
  WHERE user_id = user_id_param
  AND role = 'owner';
$$;

-- Helper function: Check if user has permission in family
CREATE OR REPLACE FUNCTION check_user_permission(
  user_id_param uuid,
  family_id_param uuid,
  permission_key_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  has_permission boolean;
BEGIN
  -- Get user's role in family
  SELECT role INTO user_role
  FROM family_members
  WHERE user_id = user_id_param
  AND family_group_id = family_id_param;

  -- If not a member, no permission
  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Check if permission is enabled for this role
  SELECT COALESCE(
    (SELECT is_enabled FROM role_permissions 
     WHERE role_name = user_role 
     AND permission_key = permission_key_param),
    true  -- Default to true if permission not configured
  ) INTO has_permission;

  RETURN has_permission;
END;
$$;

-- Helper function: Get all families a story belongs to
CREATE OR REPLACE FUNCTION get_story_families(story_id_param uuid)
RETURNS TABLE (
  family_group_id uuid,
  family_name text,
  added_by uuid,
  added_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    fg.id as family_group_id,
    fg.name as family_name,
    sfg.added_by,
    sfg.added_at
  FROM story_family_groups sfg
  JOIN family_groups fg ON fg.id = sfg.family_group_id
  WHERE sfg.story_id = story_id_param;
$$;

-- Insert default role permissions
INSERT INTO role_permissions (role_name, permission_key, is_enabled) VALUES
  -- Owner permissions
  ('owner', 'story.create', true),
  ('owner', 'story.edit.own', true),
  ('owner', 'story.edit.all', true),
  ('owner', 'story.delete.own', true),
  ('owner', 'story.delete.all', true),
  ('owner', 'story.associate', true),
  ('owner', 'recording.add', true),
  ('owner', 'recording.edit', true),
  ('owner', 'recording.delete', true),
  ('owner', 'image.add', true),
  ('owner', 'image.delete', true),
  ('owner', 'member.invite', true),
  ('owner', 'member.invite.owner', true),
  ('owner', 'member.invite.editor', true),
  ('owner', 'member.invite.viewer', true),
  ('owner', 'member.remove', true),
  ('owner', 'member.change_role', true),
  ('owner', 'family.edit', true),
  ('owner', 'family.delete', true),
  ('owner', 'content.view', true),
  ('owner', 'content.export', true),
  
  -- Editor permissions
  ('editor', 'story.create', true),
  ('editor', 'story.edit.own', true),
  ('editor', 'story.edit.all', false),
  ('editor', 'story.delete.own', true),
  ('editor', 'story.delete.all', false),
  ('editor', 'story.associate', true),
  ('editor', 'recording.add', true),
  ('editor', 'recording.edit', true),
  ('editor', 'recording.delete', false),
  ('editor', 'image.add', true),
  ('editor', 'image.delete', false),
  ('editor', 'member.invite', true),
  ('editor', 'member.invite.owner', false),
  ('editor', 'member.invite.editor', true),
  ('editor', 'member.invite.viewer', true),
  ('editor', 'member.remove', false),
  ('editor', 'member.change_role', false),
  ('editor', 'family.edit', false),
  ('editor', 'family.delete', false),
  ('editor', 'content.view', true),
  ('editor', 'content.export', true),
  
  -- Viewer permissions
  ('viewer', 'story.create', false),
  ('viewer', 'story.edit.own', false),
  ('viewer', 'story.edit.all', false),
  ('viewer', 'story.delete.own', false),
  ('viewer', 'story.delete.all', false),
  ('viewer', 'story.associate', false),
  ('viewer', 'recording.add', false),
  ('viewer', 'recording.edit', false),
  ('viewer', 'recording.delete', false),
  ('viewer', 'image.add', false),
  ('viewer', 'image.delete', false),
  ('viewer', 'member.invite', false),
  ('viewer', 'member.invite.owner', false),
  ('viewer', 'member.invite.editor', false),
  ('viewer', 'member.invite.viewer', false),
  ('viewer', 'member.remove', false),
  ('viewer', 'member.change_role', false),
  ('viewer', 'family.edit', false),
  ('viewer', 'family.delete', false),
  ('viewer', 'content.view', true),
  ('viewer', 'content.export', true)
ON CONFLICT (role_name, permission_key) DO NOTHING;
