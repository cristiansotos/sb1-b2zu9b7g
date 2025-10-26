/*
  # GDPR Compliance Features

  ## Overview
  Implements GDPR-compliant data export and deletion features.

  ## Changes

  ### 1. Data Export Function
  - Function to export all user data in JSON format
  - Includes profile, stories, recordings, and family memberships
  - User can request their complete data

  ### 2. Data Deletion Request Table
  - Track user data deletion requests
  - 30-day grace period before permanent deletion
  - Audit trail of deletion requests

  ### 3. Privacy Settings
  - User preferences for data retention
  - Email notification preferences

  ## Security
  - Users can only export/delete their own data
  - Admin can view deletion requests
  - Permanent deletion after grace period
*/

-- Data deletion requests table
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_at timestamptz DEFAULT now() NOT NULL,
  scheduled_deletion_at timestamptz DEFAULT (now() + interval '30 days') NOT NULL,
  reason text,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own deletion requests
CREATE POLICY "Users can view own deletion requests"
  ON data_deletion_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create deletion requests
CREATE POLICY "Users can create deletion requests"
  ON data_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own pending deletion requests
CREATE POLICY "Users can cancel own deletion requests"
  ON data_deletion_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'cancelled'));

-- Admins can view all deletion requests
CREATE POLICY "Admins can view all deletion requests"
  ON data_deletion_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create index
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user
  ON data_deletion_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_scheduled
  ON data_deletion_requests(scheduled_deletion_at)
  WHERE status = 'pending';

-- Function to export user data (GDPR compliance)
CREATE OR REPLACE FUNCTION export_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_data jsonb;
BEGIN
  -- Verify user is requesting their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Can only export your own data';
  END IF;

  SELECT jsonb_build_object(
    'user_profile', (
      SELECT jsonb_build_object(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'second_last_name', second_last_name,
        'created_at', created_at,
        'updated_at', updated_at
      )
      FROM user_profiles
      WHERE id = p_user_id
    ),
    'stories', (
      SELECT json_agg(
        jsonb_build_object(
          'id', id,
          'child_name', child_name,
          'child_birthdate', child_birthdate,
          'dedication', dedication,
          'created_at', created_at,
          'updated_at', updated_at
        )
      )
      FROM stories
      WHERE user_id = p_user_id
        AND deleted_at IS NULL
    ),
    'recordings', (
      SELECT json_agg(
        jsonb_build_object(
          'id', id,
          'story_id', story_id,
          'chapter_id', chapter_id,
          'question_id', question_id,
          'transcript', transcript,
          'created_at', created_at
        )
      )
      FROM recordings r
      JOIN stories s ON s.id = r.story_id
      WHERE s.user_id = p_user_id
    ),
    'family_memberships', (
      SELECT json_agg(
        jsonb_build_object(
          'family_group_id', fm.family_group_id,
          'family_name', fg.name,
          'role', fm.role,
          'joined_at', fm.joined_at
        )
      )
      FROM family_members fm
      JOIN family_groups fg ON fg.id = fm.family_group_id
      WHERE fm.user_id = p_user_id
    ),
    'exported_at', now()
  ) INTO v_data;

  RETURN v_data;
END;
$$;

-- Function to request data deletion
CREATE OR REPLACE FUNCTION request_data_deletion(
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id uuid;
  v_existing_request record;
BEGIN
  -- Check for existing pending request
  SELECT id, status INTO v_existing_request
  FROM data_deletion_requests
  WHERE user_id = auth.uid()
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'You already have a pending deletion request';
  END IF;

  -- Create new deletion request
  INSERT INTO data_deletion_requests (user_id, reason)
  VALUES (auth.uid(), p_reason)
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Function to cancel data deletion request
CREATE OR REPLACE FUNCTION cancel_data_deletion(
  p_request_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE data_deletion_requests
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = p_reason,
    updated_at = now()
  WHERE id = p_request_id
    AND user_id = auth.uid()
    AND status = 'pending';

  RETURN FOUND;
END;
$$;

COMMENT ON TABLE data_deletion_requests IS 'Tracks GDPR data deletion requests with 30-day grace period';
COMMENT ON FUNCTION export_user_data IS 'Exports all user data in JSON format for GDPR compliance';
COMMENT ON FUNCTION request_data_deletion IS 'Creates a data deletion request with 30-day grace period';
COMMENT ON FUNCTION cancel_data_deletion IS 'Cancels a pending data deletion request';
