/*
  # Add service_name Column to AI Model Settings

  ## Overview
  Adds the missing service_name column to ai_model_settings table for better UI display.

  ## Changes
  1. Add service_name column if it doesn't exist
  2. Populate existing rows with appropriate service names
  3. Enable RLS if not already enabled
  4. Add RLS policies for authenticated users

  ## Notes
  - The service_name provides a human-readable name for display in the admin UI
  - Existing transcription and text_generation services get proper names
*/

-- Add service_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_model_settings' AND column_name = 'service_name'
  ) THEN
    ALTER TABLE ai_model_settings ADD COLUMN service_name TEXT;
  END IF;
END $$;

-- Update existing rows with service names
UPDATE ai_model_settings 
SET service_name = CASE 
  WHEN service_type = 'transcription' THEN 'Audio Transcription'
  WHEN service_type = 'text_generation' THEN 'Text Generation'
  ELSE service_type
END
WHERE service_name IS NULL;

-- Enable RLS if not already enabled
ALTER TABLE ai_model_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view AI model settings" ON ai_model_settings;
  DROP POLICY IF EXISTS "Authenticated users can update AI model settings" ON ai_model_settings;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policy for authenticated users to view AI model settings
CREATE POLICY "Authenticated users can view AI model settings"
  ON ai_model_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to update AI model settings
CREATE POLICY "Authenticated users can update AI model settings"
  ON ai_model_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment to the new column
COMMENT ON COLUMN ai_model_settings.service_name IS 'Human-readable name of the service for display in admin UI';