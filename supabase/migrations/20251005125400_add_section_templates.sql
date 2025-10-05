/*
  # Add Section Templates Structure

  ## Overview
  This migration adds support for organizing questions within chapters by sections.
  Sections provide a mid-level taxonomy between chapters and questions for better
  content organization and user experience.

  ## 1. New Tables
    - `section_templates`
      - `id` (uuid, primary key): Unique identifier for the section template
      - `chapter_template_id` (uuid, foreign key): Links to parent chapter template
      - `title` (text): Display name of the section (e.g., "Antepasados", "Padres")
      - `order` (integer): Sort order within the chapter (0-based)
      - `created_at` (timestamptz): Record creation timestamp
      - `updated_at` (timestamptz): Last modification timestamp

  ## 2. Schema Changes
    - Add `section_template_id` column to `question_templates` table
    - Add foreign key constraint from questions to sections
    - Update indexes for optimal section-based queries

  ## 3. Data Migration
    - Existing questions will have NULL section_template_id initially
    - CSV import script will populate sections and update question associations
    - No data loss occurs during migration

  ## 4. Security
    - Enable RLS on `section_templates` table
    - Authenticated users can read section templates
    - Only authenticated users can manage section templates (admin check in app logic)

  ## 5. Backward Compatibility
    - Existing chapters and questions continue to work
    - Questions without section_template_id are still valid
    - UI gracefully handles chapters with and without sections
*/

-- Create section_templates table
CREATE TABLE IF NOT EXISTS section_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_template_id uuid NOT NULL REFERENCES chapter_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add section_template_id to question_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'question_templates' AND column_name = 'section_template_id'
  ) THEN
    ALTER TABLE question_templates
    ADD COLUMN section_template_id uuid REFERENCES section_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_section_templates_chapter
  ON section_templates(chapter_template_id);

CREATE INDEX IF NOT EXISTS idx_section_templates_order
  ON section_templates(chapter_template_id, "order");

CREATE INDEX IF NOT EXISTS idx_question_templates_section
  ON question_templates(section_template_id);

-- Enable RLS on section_templates
ALTER TABLE section_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read section templates
CREATE POLICY "Authenticated users can read section templates"
  ON section_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can create section templates
CREATE POLICY "Authenticated users can create section templates"
  ON section_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update section templates
CREATE POLICY "Authenticated users can update section templates"
  ON section_templates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete section templates
CREATE POLICY "Authenticated users can delete section templates"
  ON section_templates
  FOR DELETE
  TO authenticated
  USING (true);

-- Add helpful comments
COMMENT ON TABLE section_templates IS 'Template sections for organizing questions within chapters';
COMMENT ON COLUMN section_templates.chapter_template_id IS 'Parent chapter that contains this section';
COMMENT ON COLUMN section_templates.title IS 'Display name of the section (e.g., Antepasados, Padres, Hermanos)';
COMMENT ON COLUMN section_templates."order" IS 'Sort order within the chapter (0-based, lower numbers appear first)';
COMMENT ON COLUMN question_templates.section_template_id IS 'Optional section assignment for better question organization';
