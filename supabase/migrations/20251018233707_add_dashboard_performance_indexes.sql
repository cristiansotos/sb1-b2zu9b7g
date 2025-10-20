/*
  # Add Performance Indexes for Dashboard Loading

  This migration adds strategic indexes to optimize dashboard query performance,
  specifically targeting the family groups and stories loading operations.

  ## New Indexes

  1. **stories table**
     - Composite index on (user_id, mode) for faster story filtering
     - Index on created_at for sorting operations

  2. **family_members table**
     - Composite index on (user_id, family_group_id) to optimize membership lookups
     - This improves the initial family groups query performance

  3. **story_family_groups table**
     - Composite index on (family_group_id, story_id) for efficient story-to-family joins
     - Already partially exists, but ensuring it's optimized for both directions

  ## Performance Impact

  These indexes will significantly reduce query execution time for:
  - Loading user's family groups (fetchFamilyGroups)
  - Loading stories for a specific family (fetchStoriesForFamily)
  - Overall dashboard rendering speed

  ## Notes

  - All indexes use IF NOT EXISTS to prevent errors on re-run
  - Indexes are chosen based on actual query patterns in the application
  - No data changes, only schema optimization
*/

-- Index for stories filtering by user and mode
CREATE INDEX IF NOT EXISTS idx_stories_user_mode
  ON stories(user_id, mode);

-- Index for stories sorting by creation date
CREATE INDEX IF NOT EXISTS idx_stories_created_at
  ON stories(created_at DESC);

-- Composite index for efficient family member lookups
CREATE INDEX IF NOT EXISTS idx_family_members_user_family
  ON family_members(user_id, family_group_id);

-- Ensure efficient story-family group lookups in both directions
CREATE INDEX IF NOT EXISTS idx_story_family_groups_lookup
  ON story_family_groups(family_group_id, story_id);

-- Add index for story progress queries
CREATE INDEX IF NOT EXISTS idx_stories_progress_complete
  ON stories(is_complete, progress)
  WHERE mode = 'adult';

-- Analyze tables to update statistics for query planner
ANALYZE stories;
ANALYZE family_members;
ANALYZE story_family_groups;
