/*
  # Phase 1: Database Index Optimization
  
  ## Overview
  Adds comprehensive indexes to improve query performance and reduce disk IO.
  All indexes use IF NOT EXISTS to safely handle existing indexes.
  
  ## New Indexes
  
  1. **chapters table**
     - Composite index on (story_id, order) for sorted chapter fetching
     - Index on (story_id, created_at) for timeline queries
  
  2. **recordings table**
     - Composite index on (chapter_id, question) for question-specific lookups
     - Composite index on (chapter_id, created_at) for chronological ordering
     - Partial index on transcription status for filtering untranscribed recordings
  
  3. **images table**
     - Composite index on (chapter_id, question) for question-specific image lookups
     - Index on created_at for chronological queries
  
  4. **chapter_templates table**
     - Index on order for template ordering
  
  5. **question_templates table**
     - Composite index on (chapter_template_id, order) for sorted question fetching
     - Composite index on (section_template_id, order) for section questions
  
  6. **stories table**
     - Composite index on (user_id, created_at DESC) for user story timeline
     - Index on updated_at for recently modified stories
     - Partial index on is_complete for filtering complete/incomplete stories
  
  7. **family_groups table**
     - Composite index on (created_by, created_at DESC) for user's family timeline
  
  8. **family_invitations table**
     - Composite index on (family_group_id, status) for filtering pending invitations
  
  9. **memory_entries table**
      - Composite index on (story_id, created_at) for story memories timeline
  
  ## Performance Impact
  - Reduces full table scans in common queries
  - Improves ORDER BY performance with matching indexes
  - Enables index-only scans for covering queries
  - Reduces disk IO by using indexes instead of sequential scans
  
  ## Notes
  - All indexes use IF NOT EXISTS for safety
  - Partial indexes reduce index size and maintenance overhead
  - Composite indexes ordered by selectivity (most selective column first)
*/

-- Chapters table indexes
CREATE INDEX IF NOT EXISTS idx_chapters_story_order
  ON chapters(story_id, "order");

CREATE INDEX IF NOT EXISTS idx_chapters_story_created
  ON chapters(story_id, created_at DESC);

-- Recordings table indexes
CREATE INDEX IF NOT EXISTS idx_recordings_chapter_question
  ON recordings(chapter_id, question);

CREATE INDEX IF NOT EXISTS idx_recordings_chapter_created
  ON recordings(chapter_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_recordings_needs_transcription
  ON recordings(chapter_id)
  WHERE transcript IS NULL AND audio_url IS NOT NULL;

-- Images table indexes
CREATE INDEX IF NOT EXISTS idx_images_chapter_question
  ON images(chapter_id, question);

CREATE INDEX IF NOT EXISTS idx_images_created_at
  ON images(created_at DESC);

-- Chapter templates indexes
CREATE INDEX IF NOT EXISTS idx_chapter_templates_order
  ON chapter_templates("order");

-- Question templates indexes
CREATE INDEX IF NOT EXISTS idx_question_templates_chapter_order
  ON question_templates(chapter_template_id, "order");

CREATE INDEX IF NOT EXISTS idx_question_templates_section_order
  ON question_templates(section_template_id, "order")
  WHERE section_template_id IS NOT NULL;

-- Stories table indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_created
  ON stories(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stories_updated_at
  ON stories(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_stories_incomplete
  ON stories(user_id, progress)
  WHERE is_complete = false;

-- Family groups indexes
CREATE INDEX IF NOT EXISTS idx_family_groups_created_by
  ON family_groups(created_by, created_at DESC);

-- Family invitations indexes
CREATE INDEX IF NOT EXISTS idx_invitations_family_status
  ON family_invitations(family_group_id, status);

CREATE INDEX IF NOT EXISTS idx_invitations_pending
  ON family_invitations(family_group_id, created_at DESC)
  WHERE status = 'pending';

-- Memory entries indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memory_entries') THEN
    CREATE INDEX IF NOT EXISTS idx_memory_entries_story_created
      ON memory_entries(story_id, created_at DESC);
  END IF;
END $$;

-- Run ANALYZE on all major tables to update query planner statistics
ANALYZE chapters;
ANALYZE recordings;
ANALYZE images;
ANALYZE stories;
ANALYZE chapter_templates;
ANALYZE question_templates;
ANALYZE section_templates;
ANALYZE family_groups;
ANALYZE family_members;
ANALYZE story_family_groups;
ANALYZE family_invitations;
ANALYZE role_permissions;

-- Analyze memory_entries if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memory_entries') THEN
    EXECUTE 'ANALYZE memory_entries';
  END IF;
END $$;
