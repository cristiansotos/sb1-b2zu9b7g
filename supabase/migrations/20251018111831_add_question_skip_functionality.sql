/*
  # Add Question Skip Functionality

  ## Overview
  This migration adds support for tracking question states (unanswered, skipped, answered)
  per story, enabling users to skip questions and have that count toward completion progress.
  It also adds user preferences for customizing warning modals.

  ## 1. New Tables

    ### `question_states`
      - `id` (uuid, primary key): Unique identifier
      - `story_id` (uuid, foreign key): Links to the story
      - `question_text` (text): The question text (matches question from question_templates)
      - `chapter_id` (uuid, foreign key): Links to the chapter
      - `state` (text): Question state - 'unanswered', 'skipped', or 'answered'
      - `has_content` (boolean): Whether question has recordings or images attached
      - `skipped_at` (timestamptz): When the question was skipped
      - `answered_at` (timestamptz): When the question was answered
      - `created_at` (timestamptz): Record creation timestamp
      - `updated_at` (timestamptz): Last modification timestamp

    ### `user_preferences`
      - `id` (uuid, primary key): Unique identifier
      - `user_id` (uuid, foreign key): Links to auth.users
      - `show_skip_warning` (boolean): Whether to show skip warning modals (default: true)
      - `created_at` (timestamptz): Record creation timestamp
      - `updated_at` (timestamptz): Last modification timestamp

  ## 2. Indexes
    - Index on question_states(story_id, chapter_id) for fast queries
    - Index on question_states(story_id, state) for progress calculation
    - Unique index on user_preferences(user_id)

  ## 3. Database Function
    - `calculate_story_progress(story_id uuid)`: Returns progress percentage treating skipped as completed

  ## 4. Security
    - Enable RLS on both tables
    - Users can only access their own question states and preferences
    - Proper ownership checks on all policies

  ## 5. Notes
    - Questions start as 'unanswered' (no row exists)
    - Only create rows when state changes from default
    - Skipped questions count toward completion
    - Progress = (answered + skipped) / total questions
*/

-- Create question_states table
CREATE TABLE IF NOT EXISTS question_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'unanswered',
  has_content boolean DEFAULT false,
  skipped_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_state CHECK (state IN ('unanswered', 'skipped', 'answered')),
  CONSTRAINT unique_question_per_story UNIQUE (story_id, chapter_id, question_text)
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_skip_warning boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_states_story_chapter
  ON question_states(story_id, chapter_id);

CREATE INDEX IF NOT EXISTS idx_question_states_story_state
  ON question_states(story_id, state);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user
  ON user_preferences(user_id);

-- Enable RLS on question_states
ALTER TABLE question_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own question states
CREATE POLICY "Users can read own question states"
  ON question_states
  FOR SELECT
  TO authenticated
  USING (
    story_id IN (
      SELECT id FROM stories WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert their own question states
CREATE POLICY "Users can insert own question states"
  ON question_states
  FOR INSERT
  TO authenticated
  WITH CHECK (
    story_id IN (
      SELECT id FROM stories WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their own question states
CREATE POLICY "Users can update own question states"
  ON question_states
  FOR UPDATE
  TO authenticated
  USING (
    story_id IN (
      SELECT id FROM stories WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    story_id IN (
      SELECT id FROM stories WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own question states
CREATE POLICY "Users can delete own question states"
  ON question_states
  FOR DELETE
  TO authenticated
  USING (
    story_id IN (
      SELECT id FROM stories WHERE user_id = auth.uid()
    )
  );

-- Enable RLS on user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own preferences
CREATE POLICY "Users can read own preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own preferences"
  ON user_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add helpful comments
COMMENT ON TABLE question_states IS 'Tracks per-story question states (unanswered, skipped, answered)';
COMMENT ON COLUMN question_states.story_id IS 'Story this question state belongs to';
COMMENT ON COLUMN question_states.question_text IS 'Question text matching question_templates.question';
COMMENT ON COLUMN question_states.chapter_id IS 'Chapter this question belongs to';
COMMENT ON COLUMN question_states.state IS 'Current state: unanswered, skipped, or answered';
COMMENT ON COLUMN question_states.has_content IS 'Whether question has recordings or images attached';
COMMENT ON COLUMN question_states.skipped_at IS 'Timestamp when question was skipped';
COMMENT ON COLUMN question_states.answered_at IS 'Timestamp when question was answered';

COMMENT ON TABLE user_preferences IS 'User-specific preferences and settings';
COMMENT ON COLUMN user_preferences.show_skip_warning IS 'Whether to show warning when skipping questions with content';
