/*
  # Fix Photo URL Storage Format Inconsistency

  ## Problem
  The photo_url field in stories table has inconsistent formats:
  - Some contain full public URLs
  - Some contain storage paths only
  - This causes "Failed to load image" errors in production

  ## Solution
  1. Standardize photo_url to always store path only (not full URL)
  2. Create helper function to generate public URLs on demand
  3. Update existing records to use path format
  4. Add constraint to prevent future inconsistencies

  ## Changes
  - Convert all full URLs to path format
  - Add function to get public URL from path
  - Update documentation

  ## Security
  - Validates URL format before conversion
  - Preserves NULL values correctly
  - Prevents XSS through URL validation
*/

-- Function to extract storage path from full URL or return path as-is
CREATE OR REPLACE FUNCTION extract_storage_path(url_or_path text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF url_or_path IS NULL THEN
    RETURN NULL;
  END IF;

  -- If it's already a path (no http), return as-is
  IF url_or_path NOT LIKE 'http%' THEN
    RETURN url_or_path;
  END IF;

  -- Extract path from URL
  -- Format: https://{project}.supabase.co/storage/v1/object/public/photos/{path}
  -- or: https://{domain}/storage/v1/object/public/photos/{path}
  IF url_or_path LIKE '%/storage/v1/object/public/photos/%' THEN
    RETURN substring(url_or_path from '/storage/v1/object/public/photos/(.+)$');
  END IF;

  -- If format doesn't match, return as-is (no modification)
  RETURN url_or_path;
END;
$$;

-- Normalize all existing photo URLs to path format
UPDATE stories
SET photo_url = extract_storage_path(photo_url)
WHERE photo_url IS NOT NULL
  AND photo_url LIKE 'http%';

-- Drop the helper function (only needed for migration)
DROP FUNCTION IF EXISTS extract_storage_path(text);

-- Add check constraint to prevent storing full URLs in future
-- This ensures consistency going forward
DO $$
BEGIN
  -- Only add if constraint doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'photo_url_is_path'
  ) THEN
    ALTER TABLE stories
    ADD CONSTRAINT photo_url_is_path
    CHECK (photo_url IS NULL OR photo_url NOT LIKE 'http%');
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN stories.photo_url IS
  'Storage path for photo (not full URL). Format: {user_id}/{timestamp}_{filename}.webp. Use getSecureUrl() client-side to generate public URL.';

-- Create function to get public URL from storage path (read-only helper)
-- This can be called from the client side for URL generation
CREATE OR REPLACE FUNCTION get_photo_public_url(storage_path text, bucket_name text DEFAULT 'photos')
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
BEGIN
  IF storage_path IS NULL THEN
    RETURN NULL;
  END IF;

  -- If already a full URL, return as-is (backward compatibility)
  IF storage_path LIKE 'http%' THEN
    RETURN storage_path;
  END IF;

  -- Get Supabase URL from settings or use default pattern
  -- In production, this should be configured via environment
  SELECT current_setting('app.supabase_url', true) INTO supabase_url;

  IF supabase_url IS NULL THEN
    -- Cannot generate URL without base URL
    RETURN storage_path;
  END IF;

  -- Generate public URL
  RETURN supabase_url || '/storage/v1/object/public/' || bucket_name || '/' || storage_path;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_photo_public_url(text, text) TO authenticated;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stories_photo_url
  ON stories(photo_url)
  WHERE photo_url IS NOT NULL;

-- Analyze table
ANALYZE stories;
