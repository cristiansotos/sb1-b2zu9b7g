/*
  # Fix User Metrics Trigger Email Issue
  
  ## Overview
  Fixes the `update_user_metrics` trigger function to handle email properly
  by getting it from auth.users table instead of using non-existent auth.email()
  
  ## Changes
  - Replace auth.email() with a query to auth.users table
  - Make email nullable in the insert to prevent constraint violations
  
  ## Impact
  - update_story_progress will work without errors
  - User metrics will update correctly when stories are modified
*/

CREATE OR REPLACE FUNCTION update_user_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
  user_email text;
BEGIN
  -- Determine the user_id based on operation type
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;

  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = target_user_id;

  -- Update or insert user metrics
  INSERT INTO user_metrics (user_id, email, last_activity)
  VALUES (
    target_user_id,
    user_email,
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    last_activity = now(),
    updated_at = now();

  -- Recalculate metrics based on current data
  UPDATE user_metrics 
  SET 
    total_stories = (
      SELECT COUNT(*) 
      FROM stories 
      WHERE user_id = target_user_id
    ),
    total_recordings = (
      SELECT COUNT(*) 
      FROM recordings r
      JOIN chapters c ON c.id = r.chapter_id
      JOIN stories s ON s.id = c.story_id
      WHERE s.user_id = target_user_id
    ),
    total_images_uploaded = (
      SELECT COUNT(*) 
      FROM images i
      JOIN chapters c ON c.id = i.chapter_id
      JOIN stories s ON s.id = c.story_id
      WHERE s.user_id = target_user_id
    ),
    updated_at = now()
  WHERE user_id = target_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION update_user_metrics IS 'Updates user metrics when stories or related data changes. Fixed to properly fetch email from auth.users.';
