/*
  # Add file_size column to hero_images table

  ## Overview
  Adds a file_size column to the hero_images table to track the size
  of uploaded carousel images.

  ## Changes
  - Add `file_size` column (integer) to hero_images table
  - Column is nullable for backwards compatibility with existing records

  ## Notes
  - File size is stored in bytes
  - Existing records will have NULL file_size values
*/

-- Add file_size column to hero_images table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hero_images' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE hero_images ADD COLUMN file_size integer;
  END IF;
END $$;

COMMENT ON COLUMN hero_images.file_size IS 'Size of the image file in bytes';
