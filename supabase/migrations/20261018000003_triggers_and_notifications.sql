-- ========================================================================
-- AzGram Migration 03: Database Triggers, Atomic Counters & Notification Engine
-- ========================================================================

-- ------------------------------------------------------------------------
-- 1. Automatic Profile & Role Creation on User Sign Up (auth.users Trigger)
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_raw_username TEXT;
    v_clean_username TEXT;
    v_display_name TEXT;
    v_suffix INT := 1;
BEGIN
    -- Extract username from raw_user_meta_data or email
    v_raw_username := LOWER(COALESCE(
        NEW.raw_user_meta_data->>'username',
        SPLIT_PART(NEW.email, '@', 1)
    ));
    -- Remove non-alphanumeric characters except underscore
    v_clean_username := REGEXP_REPLACE(v_raw_username, '[^a-z0-9_.]', '', 'g');
    IF char_length(v_clean_username) < 3 THEN
        v_clean_username := 'user_' || SUBSTRING(NEW.id::text FROM 1 FOR 6);
    END IF;

    -- Ensure unique username if clash exists
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_clean_username) LOOP
        v_clean_username := SUBSTRING(v_clean_username FROM 1 FOR 20) || v_suffix::text;
        v_suffix := v_suffix + 1;
    END LOOP;

    v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'name',
        v_clean_username
    );

    -- Insert into public.profiles
    INSERT INTO public.profiles (id, username, display_name, bio, avatar_url, created_at, updated_at)
    VALUES (
        NEW.id,
        v_clean_username,
        v_display_name,
        COALESCE(NEW.raw_user_meta_data->>'bio', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    );

    -- Assign default user role (or admin if specified in server-side metadata)
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (
        NEW.id,
        CASE
            WHEN NEW.email = 'admin@azgram.az' THEN 'admin'
            ELSE 'user'
        END,
        timezone('utc'::text, now())
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------
-- 2. Atomic Likes Counter & Notification Trigger
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_like_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_post_author UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Atomically increment likes_count
        UPDATE public.posts
        SET likes_count = likes_count + 1
        WHERE id = NEW.post_id
        RETURNING user_id INTO v_post_author;

        -- Create notification if author is not the liker
        IF v_post_author IS NOT NULL AND v_post_author <> NEW.user_id THEN
            INSERT INTO public.notifications (recipient_id, sender_id, type, post_id, created_at)
            VALUES (v_post_author, NEW.user_id, 'like', NEW.post_id, timezone('utc'::text, now()));
        END IF;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Atomically decrement likes_count
        UPDATE public.posts
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.post_id;

        -- Remove corresponding notification
        DELETE FROM public.notifications
        WHERE recipient_id = (SELECT user_id FROM public.posts WHERE id = OLD.post_id)
          AND sender_id = OLD.user_id
          AND post_id = OLD.post_id
          AND type = 'like';

        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_like_change ON public.likes;
CREATE TRIGGER on_like_change
    AFTER INSERT OR DELETE ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_like_change();

-- ------------------------------------------------------------------------
-- 3. Atomic Comments Counter & Notification Trigger
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_comment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_post_author UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id
        RETURNING user_id INTO v_post_author;

        IF v_post_author IS NOT NULL AND v_post_author <> NEW.user_id THEN
            INSERT INTO public.notifications (recipient_id, sender_id, type, post_id, comment_id, created_at)
            VALUES (v_post_author, NEW.user_id, 'comment', NEW.post_id, NEW.id, timezone('utc'::text, now()));
        END IF;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.post_id;

        DELETE FROM public.notifications
        WHERE comment_id = OLD.id;

        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change
    AFTER INSERT OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_comment_change();

-- ------------------------------------------------------------------------
-- 4. Follows Notification Trigger
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_follow_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications (recipient_id, sender_id, type, created_at)
        VALUES (NEW.following_id, NEW.follower_id, 'follow', timezone('utc'::text, now()));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.notifications
        WHERE recipient_id = OLD.following_id
          AND sender_id = OLD.follower_id
          AND type = 'follow';
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_follow_change ON public.follows;
CREATE TRIGGER on_follow_change
    AFTER INSERT OR DELETE ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.handle_follow_change();

-- ------------------------------------------------------------------------
-- 5. Anti-Spam Server-Side Rate Limiter Function
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_rate_limit(
    p_action_type TEXT,
    p_max_allowed INT,
    p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_recent_count INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Count user actions in window
    SELECT COUNT(*) INTO v_recent_count
    FROM public.rate_limits
    WHERE user_id = auth.uid()
      AND action_type = p_action_type
      AND created_at > (timezone('utc'::text, now()) - (p_window_seconds || ' seconds')::INTERVAL);

    IF v_recent_count >= p_max_allowed THEN
        RAISE EXCEPTION 'Rate limit exceeded for action: %. Try again in a minute.', p_action_type;
    END IF;

    -- Record action
    INSERT INTO public.rate_limits (user_id, action_type, created_at)
    VALUES (auth.uid(), p_action_type, timezone('utc'::text, now()));

    -- Auto cleanup old rate limits older than 1 hour to keep storage minimal (0 AZN budget)
    DELETE FROM public.rate_limits
    WHERE created_at < (timezone('utc'::text, now()) - INTERVAL '1 hour');

    RETURN TRUE;
END;
$$;
