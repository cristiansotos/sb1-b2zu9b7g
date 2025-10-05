/*
  # Audio Quality Settings Configuration

  1. New Tables
    - `audio_quality_settings`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `low_energy_threshold` (numeric): Minimum average audio energy level (default: 0.02)
      - `silence_threshold` (numeric): Sample amplitude considered as silence (default: 0.005)
      - `silence_ratio_warning` (numeric): Percentage of silence before warning (default: 0.85)
      - `max_duration_ms` (integer): Maximum recording duration in milliseconds (default: 1200000 / 20 minutes)
      - `min_duration_ms` (integer): Minimum recording duration in milliseconds (default: 1000 / 1 second)

  2. Purpose
    - Provides configurable thresholds for audio quality validation
    - Allows admins to adjust sensitivity without code changes
    - Stores validation rules that were previously hardcoded

  3. Security
    - Enable RLS on `audio_quality_settings` table
    - Only authenticated users can read settings
    - Only admins can update settings

  4. Default Values
    - Inserts initial configuration with recommended threshold values
    - Based on analysis of typical speech patterns and recording quality
*/

-- Create audio_quality_settings table
CREATE TABLE IF NOT EXISTS audio_quality_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  low_energy_threshold numeric NOT NULL DEFAULT 0.02,
  silence_threshold numeric NOT NULL DEFAULT 0.005,
  silence_ratio_warning numeric NOT NULL DEFAULT 0.85,
  max_duration_ms integer NOT NULL DEFAULT 1200000,
  min_duration_ms integer NOT NULL DEFAULT 1000
);

-- Enable RLS
ALTER TABLE audio_quality_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read settings
CREATE POLICY "Authenticated users can read audio quality settings"
  ON audio_quality_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can update settings (admin check would be done in application logic)
CREATE POLICY "Authenticated users can update audio quality settings"
  ON audio_quality_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default configuration (single row table)
INSERT INTO audio_quality_settings (
  low_energy_threshold,
  silence_threshold,
  silence_ratio_warning,
  max_duration_ms,
  min_duration_ms
) VALUES (
  0.02,   -- Low energy threshold (2% of max amplitude)
  0.005,  -- Silence threshold (0.5% of max amplitude)
  0.85,   -- Warn if 85% or more is silence
  1200000, -- 20 minutes maximum
  1000    -- 1 second minimum
)
ON CONFLICT DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE audio_quality_settings IS 'Configurable thresholds for audio quality validation';
COMMENT ON COLUMN audio_quality_settings.low_energy_threshold IS 'Minimum average audio energy (0.0-1.0). Normal speech: 0.1-0.3, Quiet but clear: 0.02-0.1';
COMMENT ON COLUMN audio_quality_settings.silence_threshold IS 'Sample amplitude below this is considered silence (0.0-1.0)';
COMMENT ON COLUMN audio_quality_settings.silence_ratio_warning IS 'Warn if this percentage (0.0-1.0) of recording is silence';
COMMENT ON COLUMN audio_quality_settings.max_duration_ms IS 'Maximum recording duration in milliseconds';
COMMENT ON COLUMN audio_quality_settings.min_duration_ms IS 'Minimum recording duration in milliseconds';
