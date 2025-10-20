/*
  # Fix validation_flags Type Mismatch

  ## Problem
  The update_recording_transcription function has validation_flags parameter as jsonb,
  but the recordings.validation_flags column is TEXT[].

  ## Solution
  Update the function to accept TEXT[] for validation_flags parameter to match the column type.

  ## Changes
  - Change p_validation_flags parameter from jsonb to text[]
  - Keep all other functionality the same
*/

-- Drop and recreate function with correct type
DROP FUNCTION IF EXISTS update_recording_transcription;

CREATE OR REPLACE FUNCTION update_recording_transcription(
  p_recording_id uuid,
  p_transcript text,
  p_original_transcript text,
  p_transcript_formatted jsonb,
  p_detected_language text,
  p_transcription_model text,
  p_confidence_score numeric,
  p_validation_flags text[],
  p_transcription_attempts integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_chapter_id uuid;
  v_memory_id uuid;
  v_has_permission boolean := false;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get recording details
  SELECT chapter_id, memory_id
  INTO v_chapter_id, v_memory_id
  FROM recordings
  WHERE id = p_recording_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recording not found');
  END IF;

  -- Check permission (chapter-based recording)
  IF v_chapter_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM chapters c
      JOIN stories s ON s.id = c.story_id
      JOIN story_family_groups sfg ON sfg.story_id = s.id
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE c.id = v_chapter_id
        AND fm.user_id = v_user_id
        AND fm.role IN ('owner', 'editor')
      LIMIT 1
    ) INTO v_has_permission;
  END IF;

  -- Check permission (memory-based recording)
  IF v_memory_id IS NOT NULL AND NOT v_has_permission THEN
    SELECT EXISTS (
      SELECT 1
      FROM memory_entries me
      JOIN stories s ON s.id = me.story_id
      JOIN story_family_groups sfg ON sfg.story_id = s.id
      JOIN family_members fm ON fm.family_group_id = sfg.family_group_id
      WHERE me.id = v_memory_id
        AND fm.user_id = v_user_id
        AND fm.role IN ('owner', 'editor')
      LIMIT 1
    ) INTO v_has_permission;
  END IF;

  IF NOT v_has_permission THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  -- Update recording with transcription data
  UPDATE recordings
  SET
    transcript = p_transcript,
    original_transcript = p_original_transcript,
    transcript_formatted = p_transcript_formatted,
    detected_language = p_detected_language,
    transcription_model = p_transcription_model,
    confidence_score = p_confidence_score,
    validation_flags = p_validation_flags,
    transcription_attempts = p_transcription_attempts,
    last_transcription_error = NULL,
    updated_at = now()
  WHERE id = p_recording_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_recording_transcription TO authenticated;
