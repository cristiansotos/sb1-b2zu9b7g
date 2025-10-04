/*
  # Add Quality Warnings Column to Recordings

  1. Changes
    - Add `quality_warnings` text array column to recordings table
    - This stores the human-readable warnings from audio validation
    - Allows displaying context when transcription returns no speech detected
    
  2. Notes
    - Column is nullable for existing records
    - Warnings are displayed to users when transcription fails
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recordings' AND column_name = 'quality_warnings'
  ) THEN
    ALTER TABLE recordings ADD COLUMN quality_warnings TEXT[];
  END IF;
END $$;

COMMENT ON COLUMN recordings.quality_warnings IS 'Human-readable audio quality warnings shown to user during recording';
