-- ========================================================================
-- AzGram Migration 04: Supabase Storage Buckets & Storage Security Policies
-- Buckets: 'avatars' (max 2MB), 'posts' (max 5MB)
-- Strict MIME types: image/jpeg, image/png, image/webp
-- ========================================================================

-- Create Storage Buckets (if storage schema exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('posts', 'posts', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- Storage Policies for 'avatars' bucket
-- Path format: {user_id}/{filename}
-- ------------------------------------------------------------------------

-- Public read access for avatars
CREATE POLICY "avatars_public_select"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar only
CREATE POLICY "avatars_user_insert"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- User can update their own avatar
CREATE POLICY "avatars_user_update"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- User can delete their own avatar
CREATE POLICY "avatars_user_delete"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ------------------------------------------------------------------------
-- Storage Policies for 'posts' bucket
-- Path format: {user_id}/{post_id}_{filename}
-- ------------------------------------------------------------------------

-- Public read access for post images
CREATE POLICY "posts_images_public_select"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'posts');

-- Authenticated, non-banned users can upload post images in their own folder
CREATE POLICY "posts_images_user_insert"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'posts'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND public.is_not_banned()
    );

-- Author or Admin can delete post image
CREATE POLICY "posts_images_delete"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'posts'
        AND auth.role() = 'authenticated'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_admin()
        )
    );
