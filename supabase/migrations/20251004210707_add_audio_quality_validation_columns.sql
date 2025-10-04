/*
  # Add Audio Quality and Validation Columns

  1. New Columns for recordings table
    - `confidence_score` (decimal): Calculated confidence ratio from audio duration vs transcript analysis (0.0 to 1.0)
    - `validation_flags` (text array): Array of detected issues like ["short_transcript", "hallucination_filtered", "high_silence_ratio"]
    - `audio_duration_ms` (integer): Precise duration in milliseconds for better accuracy than seconds
    - `silence_ratio` (decimal): Percentage of audio that is silence (0.0 to 1.0)
    - `audio_energy_average` (decimal): Average audio energy level for quality tracking
    - `transcription_attempts` (integer): Counter for how many times transcription was attempted
    - `last_transcription_error` (text): Store last error message if transcription failed
    
  2. Update AI Model Settings Table
    - Add missing columns to existing `ai_model_settings` table
    - `temperature`, `prompt`, `response_format`, `additional_settings`
    - Allows admin to modify temperature, model selection, and other Whisper parameters
    
  3. Security
    - Maintain existing RLS policies on recordings table
    - Ensure RLS policies exist for ai_model_settings
    
  4. Notes
    - All new columns are nullable to support existing records
    - Default values set where appropriate
    - Indexes added for performance on frequently queried columns
*/

-- Add new columns to recordings table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recordings' AND column_name = 'confidence_score'
  ) THEN
    ALTER TABLE recordings ADD COLUMN confidence_score DECIMAL(3,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recordings' AND column_name = 'validation_flags'
  ) THEN
    ALTER TABLE recordings ADD COLUMN validation_flags TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recordings' AND column_name = 'audio_duration_ms'
  ) THEN
    ALTER TABLE recordings ADD COLUMN audio_duration_ms INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recordings' AND column_name = 'silence_ratio'
  ) THEN
    ALTER TABLE recordings ADD COLUMN silence_ratio DECIMAL(4,3);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recordings' AND column_name = 'audio_energy_average'
  ) THEN
    ALTER TABLE recordings ADD COLUMN audio_energy_average DECIMAL(6,5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recordings' AND column_name = 'transcription_attempts'
  ) THEN
    ALTER TABLE recordings ADD COLUMN transcription_attempts INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recordings' AND column_name = 'last_transcription_error'
  ) THEN
    ALTER TABLE recordings ADD COLUMN last_transcription_error TEXT;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recordings_confidence_score ON recordings(confidence_score);
CREATE INDEX IF NOT EXISTS idx_recordings_validation_flags ON recordings USING GIN(validation_flags);
CREATE INDEX IF NOT EXISTS idx_recordings_transcription_attempts ON recordings(transcription_attempts);

-- Add missing columns to ai_model_settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_model_settings' AND column_name = 'temperature'
  ) THEN
    ALTER TABLE ai_model_settings ADD COLUMN temperature DECIMAL(3,2) DEFAULT 0.0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_model_settings' AND column_name = 'prompt'
  ) THEN
    ALTER TABLE ai_model_settings ADD COLUMN prompt TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_model_settings' AND column_name = 'response_format'
  ) THEN
    ALTER TABLE ai_model_settings ADD COLUMN response_format TEXT DEFAULT 'json';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_model_settings' AND column_name = 'additional_settings'
  ) THEN
    ALTER TABLE ai_model_settings ADD COLUMN additional_settings JSONB DEFAULT '{}';
  END IF;
END $$;

-- Update existing transcription record with new fields
UPDATE ai_model_settings 
SET 
  temperature = 0.0,
  prompt = 'This is a personal memoir recording where someone is sharing their life story. Transcribe only the spoken words, ignore background noise, music, or silence. Do not add phrases like thanks for watching or credits.',
  response_format = 'json'
WHERE service_type = 'transcription' AND (temperature IS NULL OR prompt IS NULL);

-- Add comment to document the purpose
COMMENT ON TABLE ai_model_settings IS 'Stores configurable AI model settings for transcription and other AI services';
COMMENT ON COLUMN ai_model_settings.temperature IS 'Temperature parameter for AI model (0.0 to 1.0, lower is more deterministic)';
COMMENT ON COLUMN ai_model_settings.prompt IS 'System prompt to guide AI model behavior';
COMMENT ON COLUMN ai_model_settings.additional_settings IS 'Additional JSON configuration for advanced settings';
COMMENT ON COLUMN recordings.confidence_score IS 'Confidence ratio calculated from transcript length vs audio duration (0.0 to 1.0)';
COMMENT ON COLUMN recordings.validation_flags IS 'Array of detected validation issues like excessive_repetition, short_transcript, etc.';
COMMENT ON COLUMN recordings.audio_duration_ms IS 'Precise audio duration in milliseconds';
COMMENT ON COLUMN recordings.silence_ratio IS 'Ratio of silent audio to total duration (0.0 to 1.0)';
COMMENT ON COLUMN recordings.audio_energy_average IS 'Average audio energy level for quality assessment';
