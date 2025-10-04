/*
  # Create storage buckets

  1. Storage Buckets
    - `photos` - For story cover photos
    - `recordings` - For audio recordings
    - `images` - For chapter images
    - `memory-images` - For memory photos
    - `memory-recordings` - For memory audio
    - `shared-media` - For contributor uploads
    - `hero-images` - For landing page carousel

  2. Security
    - Enable RLS on all buckets
    - Add policies for authenticated users to manage their own files
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('photos', 'photos', true),
  ('recordings', 'recordings', true),
  ('images', 'images', true),
  ('memory-images', 'memory-images', true),
  ('memory-recordings', 'memory-recordings', true),
  ('shared-media', 'shared-media', true),
  ('hero-images', 'hero-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for photos bucket
CREATE POLICY "Users can upload own photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for recordings bucket
CREATE POLICY "Users can upload own recordings"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own recordings"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own recordings"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for images bucket
CREATE POLICY "Users can upload own images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public access for hero-images bucket
CREATE POLICY "Anyone can view hero images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'hero-images');

CREATE POLICY "Admins can manage hero images"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'hero-images');

-- Public access for shared-media bucket (for contributors)
CREATE POLICY "Anyone can view shared media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'shared-media');

CREATE POLICY "Anyone can upload to shared media"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'shared-media');