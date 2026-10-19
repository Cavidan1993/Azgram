import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, AlertCircle, Compass, Users } from 'lucide-react';
import { Post, Story } from '../types/database';
import { PostCard } from './PostCard';
import { StoriesBar } from './StoriesBar';
import { StoryViewerModal } from './StoryViewerModal';
import { CreateStoryModal } from './CreateStoryModal';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const PAGE_SIZE = 10;

interface FeedProps {
  onOpenReport: (post: Post) => void;
  onViewProfile: (userId: string) => void;
  onHashtagClick: (tag: string) => void;
  openAuthModal: () => void;
}

export const Feed: React.FC<FeedProps> = ({
  onOpenReport,
  onViewProfile,
  onHashtagClick,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [feedMode, setFeedMode] = useState<'following' | 'all'>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Stories viewer state
  const [storyViewerData, setStoryViewerData] = useState<{
    stories: Story[];
    index: number;
  } | null>(null);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState<boolean>(false);

  const nextCursor = useRef<{ created_at: string; id: string } | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const fetchFeedPage = async (cursor: { created_at: string; id: string } | null = null) => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('posts')
        .select(`
          id,
          user_id,
          image_url,
          caption,
          likes_count,
          comments_count,
          is_hidden,
          created_at,
          updated_at,
          profiles (id, username, display_name, avatar_url),
          media:post_media (id, media_url, media_type, sort_order)
        `)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);

      if (cursor) {
        query = query.lt('created_at', cursor.created_at);
      }

      // If in following mode and user is logged in
      if (feedMode === 'following' && user) {
        const { data: followings } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('status', 'accepted');

        const followingIds = (followings || []).map((f) => f.following_id);
        followingIds.push(user.id); // Include user's own posts
        query = query.in('user_id', followingIds);
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      const loadedPosts = (data as unknown as Post[]) || [];

      // If user is authenticated, check liked and saved status
      if (user && loadedPosts.length > 0) {
        const postIds = loadedPosts.map((p) => p.id);

        const { data: userLikes } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);

        const { data: userSaved } = await supabase
          .from('saved_posts')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);

        const likedSet = new Set((userLikes || []).map((l) => l.post_id));
        const savedSet = new Set((userSaved || []).map((s) => s.post_id));

        loadedPosts.forEach((p) => {
          p.user_has_liked = likedSet.has(p.id);
          p.user_has_saved = savedSet.has(p.id);
        });
      }

      if (cursor === null) {
        setPosts(loadedPosts);
      } else {
        setPosts((prev) => [...prev, ...loadedPosts]);
      }

      if (loadedPosts.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        const last = loadedPosts[loadedPosts.length - 1];
        nextCursor.current = { created_at: last.created_at, id: last.id };
        setHasMore(true);
      }
    } catch (err: any) {
      console.error('Feed error:', err);
      setError(err.message || 'Xəta baş verdi');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setHasMore(true);
    nextCursor.current = null;
    fetchFeedPage(null);
  }, [user, feedMode]);

  const lastPostElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setLoadingMore(true);
          fetchFeedPage(nextCursor.current);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, hasMore]
  );

  const refreshFeed = () => {
    setLoading(true);
    setHasMore(true);
    nextCursor.current = null;
    fetchFeedPage(null);
  };

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      {/* Stories Tray */}
      <StoriesBar
        onOpenStoryViewer={(stories, index) => setStoryViewerData({ stories, index })}
        onOpenCreateStory={() => setIsCreateStoryOpen(true)}
      />

      {/* Feed Filter Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 bg-[#161224] p-1 rounded-2xl border border-purple-900/30">
          <button
            onClick={() => setFeedMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              feedMode === 'all'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> Bütün Paylaşımlar
          </button>
          {user && (
            <button
              onClick={() => setFeedMode('following')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                feedMode === 'following'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> İzlənilənlər
            </button>
          )}
        </div>

        <button
          onClick={refreshFeed}
          disabled={loading}
          className="p-2.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 transition-colors"
          title="Yenilə"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-[#161224] rounded-3xl p-4 border border-purple-900/20 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-950" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-purple-950 rounded w-1/3" />
                  <div className="h-3 bg-purple-950/60 rounded w-1/4" />
                </div>
              </div>
              <div className="aspect-square bg-purple-950/40 rounded-2xl mb-4" />
              <div className="h-4 bg-purple-950 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-[#161224] rounded-3xl border border-purple-900/30 p-8">
          <p className="text-base font-semibold text-gray-200 mb-1">{t('empty_feed_title')}</p>
          <p className="text-xs text-gray-400 mb-6">{t('empty_feed_desc')}</p>
        </div>
      ) : (
        <div>
          {posts.map((post, idx) => {
            if (idx === posts.length - 1) {
              return (
                <div ref={lastPostElementRef} key={post.id}>
                  <PostCard
                    post={post}
                    onPostUpdated={refreshFeed}
                    onOpenReport={onOpenReport}
                    onViewProfile={onViewProfile}
                    onHashtagClick={onHashtagClick}
                  />
                </div>
              );
            }
            return (
              <PostCard
                key={post.id}
                post={post}
                onPostUpdated={refreshFeed}
                onOpenReport={onOpenReport}
                onViewProfile={onViewProfile}
                onHashtagClick={onHashtagClick}
              />
            );
          })}

          {loadingMore && (
            <div className="flex justify-center py-6">
              <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <p className="text-center text-xs text-gray-500 py-6">
              Bütün paylaşımlar göstərildi 🎉
            </p>
          )}
        </div>
      )}

      {/* Story Viewer Modal */}
      {storyViewerData && (
        <StoryViewerModal
          stories={storyViewerData.stories}
          initialIndex={storyViewerData.index}
          isOpen={!!storyViewerData}
          onClose={() => setStoryViewerData(null)}
          onStoryDeleted={refreshFeed}
        />
      )}

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onStoryCreated={refreshFeed}
      />
    </div>
  );
};
