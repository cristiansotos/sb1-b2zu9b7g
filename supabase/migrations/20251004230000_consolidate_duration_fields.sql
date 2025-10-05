/*
  # Consolidate Duration Fields

  1. Changes
    - Copy data from duration_seconds to audio_duration_ms where audio_duration_ms is null
    - Drop duration_seconds column (redundant with audio_duration_ms)
    - audio_duration_ms is more precise and will be used going forward

  2. Notes
    - This migration ensures no data is lost
    - Frontend will use duration_ms (mapped to audio_duration_ms) going forward
    - Display formatting will convert milliseconds to seconds when needed
*/

-- Update audio_duration_ms with data from duration_seconds where null
UPDATE recordings
SET audio_duration_ms = CAST(duration_seconds * 1000 AS INTEGER)
WHERE audio_duration_ms IS NULL AND duration_seconds IS NOT NULL;

-- Drop the redundant duration_seconds column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recordings' AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE recordings DROP COLUMN duration_seconds;
  END IF;
END $$;

-- Add comment to document the change
COMMENT ON COLUMN recordings.audio_duration_ms IS 'Audio duration in milliseconds (consolidated from duration_seconds)';
