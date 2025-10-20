/*
  # Add function to update story progress
  
  1. New Functions
    - `update_story_progress(story_id_param uuid)` - Calculates and updates story progress
      - Counts total questions across all chapters for the story
      - Counts recordings (both audio and images) for those chapters
      - Applies minimum 1% rule if any progress exists
      - Updates the story's progress field
  
  2. Changes
    - Provides accurate progress calculation for adult mode stories
    - Ensures progress is always up-to-date when called
    - Returns the calculated progress percentage
  
  3. Notes
    - Only handles adult mode stories (mode = 'adult')
    - For child mode stories, progress calculation will be handled separately
    - Minimum 1% progress shown when at least one recording or image exists
*/

CREATE OR REPLACE FUNCTION update_story_progress(story_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_questions integer := 0;
  total_recordings integer := 0;
  total_images integer := 0;
  total_content integer := 0;
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

  -- Count total recordings for all chapters of this story
  SELECT COUNT(DISTINCT r.id)
  INTO total_recordings
  FROM recordings r
  INNER JOIN chapters c ON r.chapter_id = c.id
  WHERE c.story_id = story_id_param
    AND r.chapter_id IS NOT NULL;

  -- Count total images for all chapters of this story
  SELECT COUNT(DISTINCT i.id)
  INTO total_images
  FROM images i
  INNER JOIN chapters c ON i.chapter_id = c.id
  WHERE c.story_id = story_id_param;

  -- Total content is recordings + images (each question can have multiple recordings/images)
  -- But we count unique questions that have been answered
  SELECT COUNT(DISTINCT r.question)
  INTO total_content
  FROM recordings r
  INNER JOIN chapters c ON r.chapter_id = c.id
  WHERE c.story_id = story_id_param
    AND r.chapter_id IS NOT NULL;

  -- Add unique questions with images
  SELECT total_content + COUNT(DISTINCT i.question)
  INTO total_content
  FROM images i
  INNER JOIN chapters c ON i.chapter_id = c.id
  WHERE c.story_id = story_id_param
    AND NOT EXISTS (
      SELECT 1 FROM recordings r2
      INNER JOIN chapters c2 ON r2.chapter_id = c2.id
      WHERE c2.story_id = story_id_param
        AND r2.question = i.question
    );

  -- Calculate progress percentage
  IF total_questions > 0 THEN
    calculated_progress := ROUND((total_content::numeric / total_questions::numeric) * 100);
    
    -- Apply minimum 1% rule if any content exists
    IF calculated_progress = 0 AND (total_recordings > 0 OR total_images > 0) THEN
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
