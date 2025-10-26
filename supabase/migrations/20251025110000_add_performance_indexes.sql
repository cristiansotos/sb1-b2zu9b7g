/*
  # Add Performance Indexes

  ## Overview
  Adds database indexes to improve query performance for frequently accessed data.

  ## New Indexes

  ### Stories table
  - `idx_stories_user_created` - For dashboard queries
  - `idx_stories_family_lookup` - For family story filtering

  ### Recordings table
  - `idx_recordings_story_chapter` - For chapter recordings lookup
  - `idx_recordings_created_at` - For recent recordings queries

  ### Family Members table
  - `idx_family_members_user_families` - For user's families lookup

  ### User Profiles table
  - `idx_user_profiles_email` - For email lookups

  ## Performance Impact
  - Faster dashboard loading
  - Improved story filtering
  - Quicker family member lookups
  - Better search performance
*/

-- Stories indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_created
  ON stories(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_stories_updated
  ON stories(updated_at DESC)
  WHERE deleted_at IS NULL;

-- Recordings indexes (some may already exist)
CREATE INDEX IF NOT EXISTS idx_recordings_story_chapter
  ON recordings(story_id, chapter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recordings_created_at
  ON recordings(created_at DESC);

-- Family members indexes
CREATE INDEX IF NOT EXISTS idx_family_members_user_families
  ON family_members(user_id, family_group_id);

CREATE INDEX IF NOT EXISTS idx_family_members_family_users
  ON family_members(family_group_id, user_id);

-- Family story associations index
CREATE INDEX IF NOT EXISTS idx_family_story_associations_family
  ON family_story_associations(family_group_id, story_id);

CREATE INDEX IF NOT EXISTS idx_family_story_associations_story
  ON family_story_associations(story_id, family_group_id);

-- User profiles email index
CREATE INDEX IF NOT EXISTS idx_user_profiles_email
  ON user_profiles(email) WHERE email IS NOT NULL;

-- Family invitations indexes
CREATE INDEX IF NOT EXISTS idx_family_invitations_email_status
  ON family_invitations(email, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_family_invitations_token
  ON family_invitations(token)
  WHERE status = 'pending';

-- Chapters index for ordering
CREATE INDEX IF NOT EXISTS idx_chapters_order
  ON chapters(order_index ASC);

-- Questions index for chapter lookups
CREATE INDEX IF NOT EXISTS idx_questions_chapter_order
  ON questions(chapter_id, order_index ASC);

-- Question states for user progress tracking
CREATE INDEX IF NOT EXISTS idx_question_states_user_story
  ON question_states(user_id, story_id, status);

COMMENT ON INDEX idx_stories_user_created IS 'Improves dashboard story queries';
COMMENT ON INDEX idx_recordings_story_chapter IS 'Speeds up chapter recording lookups';
COMMENT ON INDEX idx_family_members_user_families IS 'Faster family membership checks';
COMMENT ON INDEX idx_user_profiles_email IS 'Optimizes user lookup by email';
