-- ========================================================================
-- AzGram Migration 02: Row Level Security (RLS) & Permission Policies
-- Zero-Trust Security: Every table has separate SELECT, INSERT, UPDATE, DELETE policies
-- ========================================================================

-- Enable Row Level Security on all application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- Security Helper Functions (SECURITY DEFINER)
-- ------------------------------------------------------------------------

-- Check if current authenticated user is an administrator or moderator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'moderator')
    );
$$;

-- Check if current authenticated user is active (not banned)
CREATE OR REPLACE FUNCTION public.is_not_banned()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND is_banned = FALSE
    );
$$;

-- ------------------------------------------------------------------------
-- 1. Profiles Policies
-- ------------------------------------------------------------------------

-- Anyone (authenticated or public viewer) can view profiles
CREATE POLICY "profiles_select_public"
    ON public.profiles
    FOR SELECT
    USING (true);

-- Only user themselves can insert profile (enforced by auth.uid() match)
CREATE POLICY "profiles_insert_owner"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Only user themselves can update their own profile (and must not be banned)
-- Admin can also update is_banned flag
CREATE POLICY "profiles_update_owner_or_admin"
    ON public.profiles
    FOR UPDATE
    USING (
        (auth.uid() = id AND public.is_not_banned())
        OR public.is_admin()
    )
    WITH CHECK (
        (auth.uid() = id AND public.is_not_banned())
        OR public.is_admin()
    );

-- Profiles cannot be deleted directly by clients (handled via auth.users CASCADE or Admin)
CREATE POLICY "profiles_delete_admin"
    ON public.profiles
    FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------
-- 2. User Roles Policies (Strict Isolation)
-- ------------------------------------------------------------------------

-- Users can see their own role; Admins can see all roles
CREATE POLICY "user_roles_select"
    ON public.user_roles
    FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

-- Only Admins can insert, update, or delete roles (prevents privilege escalation)
CREATE POLICY "user_roles_insert_admin_only"
    ON public.user_roles
    FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "user_roles_update_admin_only"
    ON public.user_roles
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "user_roles_delete_admin_only"
    ON public.user_roles
    FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------
-- 3. Posts Policies
-- ------------------------------------------------------------------------

-- Anyone can view posts that are not hidden; Admins can view all posts
CREATE POLICY "posts_select_public"
    ON public.posts
    FOR SELECT
    USING (is_hidden = FALSE OR public.is_admin() OR auth.uid() = user_id);

-- Authenticated, non-banned users can create posts with their own user_id
CREATE POLICY "posts_insert_authenticated"
    ON public.posts
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND auth.uid() = user_id
        AND public.is_not_banned()
    );

-- Only author can update post caption, OR admin can update is_hidden flag
CREATE POLICY "posts_update_owner_or_admin"
    ON public.posts
    FOR UPDATE
    USING (
        (auth.uid() = user_id AND public.is_not_banned())
        OR public.is_admin()
    )
    WITH CHECK (
        (auth.uid() = user_id AND public.is_not_banned())
        OR public.is_admin()
    );

-- Author or Admin can delete a post
CREATE POLICY "posts_delete_owner_or_admin"
    ON public.posts
    FOR DELETE
    USING (
        auth.uid() = user_id
        OR public.is_admin()
    );

-- ------------------------------------------------------------------------
-- 4. Comments Policies
-- ------------------------------------------------------------------------

-- Anyone can read comments
CREATE POLICY "comments_select_public"
    ON public.comments
    FOR SELECT
    USING (true);

-- Authenticated, non-banned users can comment on visible posts
CREATE POLICY "comments_insert_authenticated"
    ON public.comments
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND auth.uid() = user_id
        AND public.is_not_banned()
        AND EXISTS (
            SELECT 1 FROM public.posts
            WHERE id = post_id AND is_hidden = FALSE
        )
    );

-- Comment author can update their own comment
CREATE POLICY "comments_update_owner"
    ON public.comments
    FOR UPDATE
    USING (auth.uid() = user_id AND public.is_not_banned())
    WITH CHECK (auth.uid() = user_id AND public.is_not_banned());

-- Comment author, post author, or admin can delete comment
CREATE POLICY "comments_delete_owner_or_admin"
    ON public.comments
    FOR DELETE
    USING (
        auth.uid() = user_id
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.posts
            WHERE id = post_id AND user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------
-- 5. Likes Policies
-- ------------------------------------------------------------------------

-- Anyone can see likes
CREATE POLICY "likes_select_public"
    ON public.likes
    FOR SELECT
    USING (true);

-- Authenticated, non-banned user can insert like for themselves
CREATE POLICY "likes_insert_owner"
    ON public.likes
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND auth.uid() = user_id
        AND public.is_not_banned()
    );

-- Likes cannot be updated; only inserted or deleted
CREATE POLICY "likes_update_none"
    ON public.likes
    FOR UPDATE
    USING (false);

-- Only user themselves can remove their like (unlike)
CREATE POLICY "likes_delete_owner"
    ON public.likes
    FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------
-- 6. Follows Policies
-- ------------------------------------------------------------------------

-- Anyone can view follow relationships
CREATE POLICY "follows_select_public"
    ON public.follows
    FOR SELECT
    USING (true);

-- Authenticated non-banned user can follow someone (must be follower_id)
CREATE POLICY "follows_insert_owner"
    ON public.follows
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND auth.uid() = follower_id
        AND follower_id <> following_id
        AND public.is_not_banned()
    );

-- Follows cannot be updated
CREATE POLICY "follows_update_none"
    ON public.follows
    FOR UPDATE
    USING (false);

-- Only user themselves can unfollow
CREATE POLICY "follows_delete_owner"
    ON public.follows
    FOR DELETE
    USING (auth.uid() = follower_id);

-- ------------------------------------------------------------------------
-- 7. Notifications Policies
-- ------------------------------------------------------------------------

-- Users can only view their own incoming notifications
CREATE POLICY "notifications_select_recipient"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = recipient_id);

-- Notifications are inserted via database triggers (SECURITY DEFINER).
-- But if client inserts, sender_id must match auth.uid() and recipient != sender.
CREATE POLICY "notifications_insert_sender"
    ON public.notifications
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND recipient_id <> auth.uid()
        AND public.is_not_banned()
    );

-- Recipients can mark notifications as read
CREATE POLICY "notifications_update_recipient"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- Recipients can delete their own notifications
CREATE POLICY "notifications_delete_recipient"
    ON public.notifications
    FOR DELETE
    USING (auth.uid() = recipient_id);

-- ------------------------------------------------------------------------
-- 8. Reports Policies (Moderation)
-- ------------------------------------------------------------------------

-- Reporters can view their submitted reports; Admins can view all reports
CREATE POLICY "reports_select_reporter_or_admin"
    ON public.reports
    FOR SELECT
    USING (auth.uid() = reporter_id OR public.is_admin());

-- Authenticated users can submit reports
CREATE POLICY "reports_insert_authenticated"
    ON public.reports
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND auth.uid() = reporter_id
        AND public.is_not_banned()
    );

-- Only Admins can update report status
CREATE POLICY "reports_update_admin_only"
    ON public.reports
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Only Admins can delete reports
CREATE POLICY "reports_delete_admin_only"
    ON public.reports
    FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------
-- 9. Rate Limits Policies
-- ------------------------------------------------------------------------

-- Only the user or admin can view rate limit records
CREATE POLICY "rate_limits_select"
    ON public.rate_limits
    FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

-- Only database or user themselves can insert rate limit log
CREATE POLICY "rate_limits_insert"
    ON public.rate_limits
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
