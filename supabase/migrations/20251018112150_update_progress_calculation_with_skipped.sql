/*
  # Update Story Progress Calculation to Include Skipped Questions

  ## Overview
  Updates the `update_story_progress` function to treat skipped questions
  as completed for progress calculation purposes.

  ## Changes
  - Modified progress calculation to count:
    - Questions with recordings/images (answered)
    - Questions marked as 'skipped' in question_states table
  - Progress = (answered + skipped) / total questions * 100
  - Maintains existing minimum 1% rule and capping at 100%

  ## Impact
  - Skipped questions now count toward story completion percentage
  - Users see progress increase when they skip questions
  - Progress accurately reflects "questions dealt with" vs "questions remaining"
*/

CREATE OR REPLACE FUNCTION update_story_progress(story_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_questions integer := 0;
  answered_questions integer := 0;
  skipped_questions integer := 0;
  completed_questions integer := 0;
  calculated_progress integer := 0;
  story_mode text;
BEGIN
  -- Get story mode
  SELECT mode INTO story_mode
  FROM stories
  WHERE id = story_id_param;

  -- Only calculate for adult mode stories
  IF story_mode != 'adult' THEN
    RETURN NULL;
  END IF;

  -- Count total questions across all chapters for this story
  SELECT COALESCE(SUM(array_length(question_order, 1)), 0)
  INTO total_questions
  FROM chapters
  WHERE story_id = story_id_param;

  -- Count unique questions that have been answered (have recordings or images)
  WITH answered_from_recordings AS (
    SELECT DISTINCT r.question, c.id as chapter_id
    FROM recordings r
    INNER JOIN chapters c ON r.chapter_id = c.id
    WHERE c.story_id = story_id_param
      AND r.chapter_id IS NOT NULL
  ),
  answered_from_images AS (
    SELECT DISTINCT i.question, c.id as chapter_id
    FROM images i
    INNER JOIN chapters c ON i.chapter_id = c.id
    WHERE c.story_id = story_id_param
  ),
  all_answered AS (
    SELECT question, chapter_id FROM answered_from_recordings
    UNION
    SELECT question, chapter_id FROM answered_from_images
  )
  SELECT COUNT(*)
  INTO answered_questions
  FROM all_answered;

  -- Count questions marked as skipped in question_states
  SELECT COUNT(*)
  INTO skipped_questions
  FROM question_states
  WHERE story_id = story_id_param
    AND state = 'skipped';

  -- Total completed = answered + skipped
  completed_questions := answered_questions + skipped_questions;

  -- Calculate progress percentage
  IF total_questions > 0 THEN
    calculated_progress := ROUND((completed_questions::numeric / total_questions::numeric) * 100);
    
    -- Apply minimum 1% rule if any content exists (answered or skipped)
    IF calculated_progress = 0 AND completed_questions > 0 THEN
      calculated_progress := 1;
    END IF;
    
    -- Cap at 100%
    IF calculated_progress > 100 THEN
      calculated_progress := 100;
    END IF;
  ELSE
    calculated_progress := 0;
  END IF;

  -- Update the story's progress
  UPDATE stories
  SET progress = calculated_progress,
      updated_at = now()
  WHERE id = story_id_param;

  RETURN calculated_progress;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION update_story_progress IS 'Calculates story progress treating both answered and skipped questions as completed';
