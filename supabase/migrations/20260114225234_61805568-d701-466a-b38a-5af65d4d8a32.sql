-- Update storage policies to enforce path-based ownership validation
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload glasses images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update glasses images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete glasses images" ON storage.objects;

-- Users can only upload to their own profile folder
CREATE POLICY "Users can upload to own profile folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'glasses-images' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Users can only update files in their own profile folder
CREATE POLICY "Users can update own profile folder files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'glasses-images' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Users can only delete files in their own profile folder
CREATE POLICY "Users can delete own profile folder files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'glasses-images' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Masters can manage all files in the bucket
CREATE POLICY "Masters can manage all files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'glasses-images' AND
  public.has_role(auth.uid(), 'master')
)
WITH CHECK (
  bucket_id = 'glasses-images' AND
  public.has_role(auth.uid(), 'master')
);