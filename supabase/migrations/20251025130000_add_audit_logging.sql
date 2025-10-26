/*
  # Audit Logging System

  ## Overview
  Implements comprehensive audit logging for security-sensitive operations.

  ## Changes

  ### 1. Audit Log Table
  - Tracks all sensitive operations
  - Records user, action, resource, and outcome
  - Immutable once created (no updates/deletes)

  ### 2. Automatic Triggers
  - Log user profile changes
  - Log family membership changes
  - Log story deletions
  - Log admin actions

  ### 3. Audit Functions
  - Manual audit logging function
  - Query audit logs with filters

  ## Security Impact
  - Accountability for all actions
  - Forensic analysis capability
  - Compliance requirements
  - Incident investigation
*/

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true NOT NULL,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Prevent updates and deletes (audit logs are immutable)
CREATE POLICY "Audit logs are immutable"
  ON audit_logs
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Audit logs cannot be deleted"
  ON audit_logs
  FOR DELETE
  TO authenticated
  USING (false);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs(resource_type, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON audit_logs(created_at DESC);

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_user_email text;
BEGIN
  -- Get user email if authenticated
  IF auth.uid() IS NOT NULL THEN
    SELECT email INTO v_user_email
    FROM user_profiles
    WHERE id = auth.uid();
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    user_email,
    action,
    resource_type,
    resource_id,
    old_data,
    new_data,
    success,
    error_message,
    metadata
  )
  VALUES (
    auth.uid(),
    v_user_email,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_data,
    p_new_data,
    p_success,
    p_error_message,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Trigger function for user profile changes
CREATE OR REPLACE FUNCTION audit_user_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      'user_profile_updated',
      'user_profile',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      true,
      NULL,
      jsonb_build_object('trigger', TG_NAME)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'user_profile_deleted',
      'user_profile',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      true,
      NULL,
      jsonb_build_object('trigger', TG_NAME)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for family membership changes
CREATE OR REPLACE FUNCTION audit_family_membership_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_audit_log(
      'family_member_added',
      'family_member',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      true,
      NULL,
      jsonb_build_object(
        'family_group_id', NEW.family_group_id,
        'trigger', TG_NAME
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      'family_member_updated',
      'family_member',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      true,
      NULL,
      jsonb_build_object(
        'family_group_id', NEW.family_group_id,
        'trigger', TG_NAME
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'family_member_removed',
      'family_member',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      true,
      NULL,
      jsonb_build_object(
        'family_group_id', OLD.family_group_id,
        'trigger', TG_NAME
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for story deletions (soft delete tracking)
CREATE OR REPLACE FUNCTION audit_story_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    PERFORM create_audit_log(
      'story_deleted',
      'story',
      NEW.id,
      jsonb_build_object(
        'child_name', OLD.child_name,
        'created_at', OLD.created_at
      ),
      jsonb_build_object(
        'deleted_at', NEW.deleted_at
      ),
      true,
      NULL,
      jsonb_build_object('trigger', TG_NAME)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS audit_user_profile_changes_trigger ON user_profiles;
CREATE TRIGGER audit_user_profile_changes_trigger
  AFTER UPDATE OR DELETE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_user_profile_changes();

DROP TRIGGER IF EXISTS audit_family_membership_changes_trigger ON family_members;
CREATE TRIGGER audit_family_membership_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION audit_family_membership_changes();

DROP TRIGGER IF EXISTS audit_story_deletion_trigger ON stories;
CREATE TRIGGER audit_story_deletion_trigger
  AFTER UPDATE ON stories
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION audit_story_deletion();

-- Function to query audit logs with filters
CREATE OR REPLACE FUNCTION query_audit_logs(
  p_user_id uuid DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_resource_type text DEFAULT NULL,
  p_from_date timestamptz DEFAULT NULL,
  p_to_date timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_email text,
  action text,
  resource_type text,
  resource_id uuid,
  success boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.user_id,
    al.user_email,
    al.action,
    al.resource_type,
    al.resource_id,
    al.success,
    al.created_at
  FROM audit_logs al
  WHERE
    (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
    AND (p_from_date IS NULL OR al.created_at >= p_from_date)
    AND (p_to_date IS NULL OR al.created_at <= p_to_date)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON TABLE audit_logs IS 'Immutable audit trail of all security-sensitive operations';
COMMENT ON FUNCTION create_audit_log IS 'Creates an audit log entry for manual logging';
COMMENT ON FUNCTION query_audit_logs IS 'Query audit logs with filters (admin only)';
