/*
  # Fix Storage Bucket Security - Convert Public to Private

  ## Critical Security Fix
  This migration addresses CRITICAL vulnerability where all user data storage buckets
  were publicly accessible, exposing personal photos, recordings, and sensitive data.

  ## Changes
  1. Convert all user data buckets from public to private
  2. Keep only hero-images and shared-media as public (legitimate public use cases)
  3. Force application to use signed URLs for private content access

  ## Affected Buckets
  - photos: Story cover photos → PRIVATE
  - recordings: Audio recordings → PRIVATE
  - images: Chapter images → PRIVATE
  - memory-images: Memory photos → PRIVATE
  - memory-recordings: Memory audio → PRIVATE
  - shared-media: Contributor uploads → PUBLIC (unchanged)
  - hero-images: Landing page images → PUBLIC (unchanged)

  ## Impact
  After this migration, applications using getPublicUrl() for private buckets
  will need to be updated to use createSignedUrl() with expiration times.

  ## Security Note
  This is a breaking change but necessary for data security. All existing
  public URLs for private content will stop working immediately after deployment.
*/

-- Update bucket configuration to make private buckets actually private
UPDATE storage.buckets
SET public = false
WHERE id IN ('photos', 'recordings', 'images', 'memory-images', 'memory-recordings');

-- Ensure public buckets remain public
UPDATE storage.buckets
SET public = true
WHERE id IN ('shared-media', 'hero-images');

-- Add comment for documentation
COMMENT ON TABLE storage.buckets IS 'Storage buckets with security configuration. Private buckets require signed URLs for access.';
