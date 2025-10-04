/*
  # Transcription Enhancements Migration

  ## Overview
  This migration adds support for improved transcription features including:
  - AI model tracking for each transcript
  - Language detection storage
  - Original transcript preservation (before paragraph breaks added)

  ## Tables Modified

  ### recordings
  - `transcription_model` (text): Tracks which AI model was used (e.g., whisper-1, gpt-4o-mini-transcribe)
  - `detected_language` (text): ISO language code detected by the AI (e.g., 'es', 'en')
  - `original_transcript` (text): Stores the unformatted transcript before paragraph breaking

  ### ai_model_settings
  - Updates existing 'transcription' service to include new model options

  ## Default Values
  - Existing transcription service_type already exists
  - Will add gpt-4o-mini-transcribe and gpt-4o-transcribe as available options

  ## Notes
  - No breaking changes to existing data
  - All new columns are nullable for backward compatibility
*/

-- Add new columns to recordings table
DO $$
BEGIN
  -- Add transcription_model column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recordings' AND column_name = 'transcription_model'
  ) THEN
    ALTER TABLE recordings ADD COLUMN transcription_model TEXT DEFAULT NULL;
  END IF;

  -- Add detected_language column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recordings' AND column_name = 'detected_language'
  ) THEN
    ALTER TABLE recordings ADD COLUMN detected_language TEXT DEFAULT NULL;
  END IF;

  -- Add original_transcript column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recordings' AND column_name = 'original_transcript'
  ) THEN
    ALTER TABLE recordings ADD COLUMN original_transcript TEXT DEFAULT NULL;
  END IF;
END $$;

-- Create indexes for better performance
DO $$
BEGIN
  -- Index on transcription_model
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_recordings_transcription_model'
  ) THEN
    CREATE INDEX idx_recordings_transcription_model ON recordings(transcription_model);
  END IF;

  -- Index on detected_language
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_recordings_detected_language'
  ) THEN
    CREATE INDEX idx_recordings_detected_language ON recordings(detected_language);
  END IF;
END $$;

-- Add comments to new columns
COMMENT ON COLUMN recordings.transcription_model IS 'AI model used for transcription (e.g., whisper-1, gpt-4o-mini-transcribe, gpt-4o-transcribe)';
COMMENT ON COLUMN recordings.detected_language IS 'ISO language code detected by the AI (e.g., es, en, fr)';
COMMENT ON COLUMN recordings.original_transcript IS 'Original transcript text before automatic paragraph formatting was applied';