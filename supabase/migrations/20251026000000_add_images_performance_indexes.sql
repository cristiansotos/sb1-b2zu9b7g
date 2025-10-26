/*
  # Add Performance Indexes for Images Table

  1. New Indexes
    - `idx_images_chapter_question` - Composite index on (chapter_id, question) for faster lookups
    - `idx_images_chapter_id` - Index on chapter_id for chapter-level queries
    - `idx_images_created_at` - Index on created_at for ordered queries

  2. Purpose
    - Fix statement timeout errors (57014) when fetching images
    - Improve query performance for image lookups by chapter and question
    - Optimize sorting by creation date

  3. Impact
    - Significantly reduces query execution time for image fetches
    - Prevents timeout errors during concurrent image queries
    - Improves overall application performance
*/

-- Add composite index for the most common query pattern (chapter_id + question)
CREATE INDEX IF NOT EXISTS idx_images_chapter_question
  ON images (chapter_id, question);

-- Add index for chapter-level queries
CREATE INDEX IF NOT EXISTS idx_images_chapter_id
  ON images (chapter_id);

-- Add index for date-ordered queries
CREATE INDEX IF NOT EXISTS idx_images_created_at
  ON images (created_at DESC);

-- Analyze the table to update query planner statistics
ANALYZE images;
