-- ========================================================================
-- AzGram Migration 05: Complete Social Network Architecture
-- Stories, Reels, Direct Messages, Saved Posts, Hashtags, Comment Replies,
-- User Blocks, Moderation Audit Log and Storage Security
-- Target Project: zsrkijbvsfczaspxppkj (https://zsrkijbvsfczaspxppkj.supabase.co)
-- ========================================================================

-- 1. Extend profiles with website and privacy flag
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Post Media (for carousel / multi-photo posts)
CREATE TABLE IF NOT EXISTS public.post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_post_media_post ON public.post_media(post_id, sort_order ASC);

-- 3. Extend comments for nested replies
ALTER TABLE public.comments
    ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_comment_id);

-- 4. Extend follows for private account approval flow
ALTER TABLE public.follows
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'pending'));
CREATE INDEX IF NOT EXISTS idx_follows_status ON public.follows(following_id, status);

-- 5. Stories (24-hour expiration)
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    caption TEXT DEFAULT '',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_stories_active ON public.stories(user_id, expires_at DESC);

-- Story Views tracking
CREATE TABLE IF NOT EXISTS public.story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_story_viewer UNIQUE (story_id, viewer_id)
);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.story_views(story_id);

-- 6. Reels / Short Video Feed
CREATE TABLE IF NOT EXISTS public.reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    caption TEXT DEFAULT '',
    views_count INTEGER NOT NULL DEFAULT 0 CHECK (views_count >= 0),
    likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
    comments_count INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_reels_cursor ON public.reels(created_at DESC, id DESC) WHERE is_hidden = FALSE;

-- 7. Saved Posts (Bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_saved_post UNIQUE (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON public.saved_posts(user_id, created_at DESC);

-- 8. Direct Messaging (Conversations & Messages)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_conversation_member UNIQUE (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON public.conversation_members(user_id);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 3000),
    media_url TEXT DEFAULT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);

-- 9. Hashtags System
CREATE TABLE IF NOT EXISTS public.hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag TEXT NOT NULL UNIQUE CHECK (tag ~* '^[a-z0-9_]+$'),
    posts_count INTEGER NOT NULL DEFAULT 0 CHECK (posts_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON public.hashtags(tag);

CREATE TABLE IF NOT EXISTS public.post_hashtags (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, hashtag_id)
);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag ON public.post_hashtags(hashtag_id);

-- 10. User Blocks (Privacy & Anti-Harassment)
CREATE TABLE IF NOT EXISTS public.user_blocks (
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id)
);

-- 11. Moderation Audit Log (Security & Accountability)
CREATE TABLE IF NOT EXISTS public.moderation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_moderation_log_admin ON public.moderation_log(admin_id, created_at DESC);

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR NEW ENTITIES
-- ========================================================================

ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;

-- Post Media policies
CREATE POLICY "post_media_select" ON public.post_media FOR SELECT USING (true);
CREATE POLICY "post_media_insert" ON public.post_media FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);
CREATE POLICY "post_media_delete" ON public.post_media FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid()) OR public.is_admin()
);

-- Stories policies (Active stories < 24h, or own archive)
CREATE POLICY "stories_select" ON public.stories FOR SELECT USING (
    (expires_at > timezone('utc'::text, now()) AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks WHERE blocker_id = stories.user_id AND blocked_id = auth.uid()
    ))
    OR user_id = auth.uid()
    OR public.is_admin()
);
CREATE POLICY "stories_insert" ON public.stories FOR INSERT WITH CHECK (
    auth.uid() = user_id AND public.is_not_banned()
);
CREATE POLICY "stories_delete" ON public.stories FOR DELETE USING (
    auth.uid() = user_id OR public.is_admin()
);

-- Story Views policies
CREATE POLICY "story_views_select" ON public.story_views FOR SELECT USING (
    viewer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid())
);
CREATE POLICY "story_views_insert" ON public.story_views FOR INSERT WITH CHECK (
    auth.uid() = viewer_id AND public.is_not_banned()
);

-- Reels policies
CREATE POLICY "reels_select" ON public.reels FOR SELECT USING (
    is_hidden = FALSE OR user_id = auth.uid() OR public.is_admin()
);
CREATE POLICY "reels_insert" ON public.reels FOR INSERT WITH CHECK (
    auth.uid() = user_id AND public.is_not_banned()
);
CREATE POLICY "reels_update" ON public.reels FOR UPDATE USING (
    auth.uid() = user_id OR public.is_admin()
);
CREATE POLICY "reels_delete" ON public.reels FOR DELETE USING (
    auth.uid() = user_id OR public.is_admin()
);

-- Saved Posts (Only owner can read/write their bookmarks)
CREATE POLICY "saved_posts_select" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_posts_insert" ON public.saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_posts_delete" ON public.saved_posts FOR DELETE USING (auth.uid() = user_id);

-- Conversations & Members
CREATE POLICY "conversations_select" ON public.conversations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = id AND user_id = auth.uid())
);
CREATE POLICY "conversation_members_select" ON public.conversation_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid())
);
CREATE POLICY "conversation_members_insert" ON public.conversation_members FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
);

-- Messages (Strict isolation: only conversation members can see/send)
CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND public.is_not_banned()
    AND EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);
CREATE POLICY "messages_update" ON public.messages FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);

-- Hashtags policies
CREATE POLICY "hashtags_select" ON public.hashtags FOR SELECT USING (true);
CREATE POLICY "hashtags_insert" ON public.hashtags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "post_hashtags_select" ON public.post_hashtags FOR SELECT USING (true);
CREATE POLICY "post_hashtags_insert" ON public.post_hashtags FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);

-- User Blocks policies
CREATE POLICY "user_blocks_select" ON public.user_blocks FOR SELECT USING (blocker_id = auth.uid());
CREATE POLICY "user_blocks_insert" ON public.user_blocks FOR INSERT WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "user_blocks_delete" ON public.user_blocks FOR DELETE USING (blocker_id = auth.uid());

-- Moderation Log policies (Only admins/moderators can view and write audit entries)
CREATE POLICY "moderation_log_select" ON public.moderation_log FOR SELECT USING (public.is_admin());
CREATE POLICY "moderation_log_insert" ON public.moderation_log FOR INSERT WITH CHECK (public.is_admin());

-- Additional Storage Buckets (stories, reels, messages)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('stories', 'stories', true, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
    ('reels', 'reels', true, 31457280, ARRAY['video/mp4', 'video/webm']),
    ('messages', 'messages', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Policies for stories & reels
CREATE POLICY "stories_storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'stories');
CREATE POLICY "stories_storage_insert" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'stories' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "reels_storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'reels');
CREATE POLICY "reels_storage_insert" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'reels' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
);
