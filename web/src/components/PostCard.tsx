import React, { useState } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreHorizontal, 
  AlertTriangle, 
  Trash2, 
  Send,
  ChevronLeft,
  ChevronRight,
  CornerDownRight
} from 'lucide-react';
import { Post, Comment } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabaseClient';

interface PostCardProps {
  post: Post;
  onPostUpdated: () => void;
  onOpenReport: (post: Post) => void;
  onViewProfile?: (userId: string) => void;
  onHashtagClick?: (tag: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onPostUpdated,
  onOpenReport,
  onViewProfile,
  onHashtagClick,
}) => {
  const { user, isAdmin, isConfigured } = useAuth();
  const { t } = useLanguage();

  const [liked, setLiked] = useState<boolean>(post.user_has_liked || false);
  const [likesCount, setLikesCount] = useState<number>(post.likes_count || 0);
  const [saved, setSaved] = useState<boolean>(post.user_has_saved || false);

  const [showComments, setShowComments] = useState<boolean>(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [newComment, setNewComment] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  // Multi-media carousel
  const mediaList = post.media && post.media.length > 0
    ? post.media.map((m) => m.media_url)
    : [post.image_url];
  const [currentMediaIdx, setCurrentMediaIdx] = useState<number>(0);

  const toggleLike = async () => {
    if (!user) {
      alert(t('login'));
      return;
    }
    if (!isConfigured) return;

    const prevLiked = liked;
    const prevCount = likesCount;

    setLiked(!prevLiked);
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      if (prevLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: user.id });
      }
    } catch (err) {
      setLiked(prevLiked);
      setLikesCount(prevCount);
      console.error('Like error:', err);
    }
  };

  const toggleSave = async () => {
    if (!user) {
      alert(t('login'));
      return;
    }
    const prevSaved = saved;
    setSaved(!prevSaved);

    try {
      if (prevSaved) {
        await supabase
          .from('saved_posts')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('saved_posts')
          .insert({ post_id: post.id, user_id: user.id });
      }
    } catch (err) {
      setSaved(prevSaved);
      console.error('Save error:', err);
    }
  };

  const loadComments = async () => {
    if (!isConfigured) return;
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          post_id,
          user_id,
          parent_comment_id,
          content,
          created_at,
          profiles (id, username, display_name, avatar_url)
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data as unknown as Comment[]) || []);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment.trim(),
          parent_comment_id: replyingTo ? replyingTo.id : null,
        })
        .select(`
          id,
          post_id,
          user_id,
          parent_comment_id,
          content,
          created_at,
          profiles (id, username, display_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      setComments([...comments, data as unknown as Comment]);
      setNewComment('');
      setReplyingTo(null);
      post.comments_count += 1;
    } catch (err: any) {
      alert(err.message || 'Xəta');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Bu paylaşımı silmək istədiyinizə əminsiniz?')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;
      onPostUpdated();
    } catch (err: any) {
      alert(err.message || 'Xəta');
    }
  };

  // Helper to parse hashtags and mentions
  const renderFormattedCaption = (text: string) => {
    const parts = text.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_.]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        const tag = part.substring(1).toLowerCase();
        return (
          <span
            key={i}
            onClick={() => onHashtagClick && onHashtagClick(tag)}
            className="text-purple-400 font-semibold cursor-pointer hover:underline"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-pink-400 font-semibold cursor-pointer hover:underline">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const isOwner = user?.id === post.user_id;

  return (
    <article className="bg-[#161224] rounded-3xl border border-purple-900/30 overflow-hidden shadow-2xl mb-6 transition-all hover:border-purple-800/40">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div
          onClick={() => onViewProfile && onViewProfile(post.user_id)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {post.profiles?.avatar_url ? (
            <img
              src={post.profiles.avatar_url}
              alt={post.profiles.username}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-600/40 group-hover:ring-purple-400 transition-all"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-700 to-pink-600 text-white font-bold flex items-center justify-center text-sm shadow">
              {post.profiles?.username ? post.profiles.username.substring(0, 2).toUpperCase() : 'AZ'}
            </div>
          )}
          <div>
            <h4 className="font-bold text-sm text-gray-100 group-hover:text-purple-300 transition-colors">
              {post.profiles?.display_name || post.profiles?.username || 'İstifadəçi'}
            </h4>
            <p className="text-[11px] text-gray-400">
              @{post.profiles?.username || 'azgram'} •{' '}
              {new Date(post.created_at).toLocaleDateString('az-AZ', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 w-48 bg-[#1f1933] border border-purple-800/50 rounded-2xl shadow-2xl py-1.5 z-30">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenReport(post);
                }}
                className="w-full px-4 py-2.5 text-left text-xs text-yellow-400 hover:bg-white/5 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" /> {t('report')}
              </button>
              {(isOwner || isAdmin) && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleDeletePost();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-white/5 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> {t('delete')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Media Carousel / Single Image */}
      <div className="relative bg-black aspect-square max-h-[540px] flex items-center justify-center overflow-hidden">
        <img
          src={mediaList[currentMediaIdx]}
          alt={post.caption || 'Post image'}
          className="w-full h-full object-cover select-none"
          loading="lazy"
        />

        {/* Carousel Arrows if multiple images */}
        {mediaList.length > 1 && (
          <>
            {currentMediaIdx > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentMediaIdx(currentMediaIdx - 1);
                }}
                className="absolute left-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {currentMediaIdx < mediaList.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentMediaIdx(currentMediaIdx + 1);
                }}
                className="absolute right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Dots */}
            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10">
              {mediaList.map((_, dotIdx) => (
                <div
                  key={dotIdx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    dotIdx === currentMediaIdx
                      ? 'w-4 bg-purple-500'
                      : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Action Bar */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLike}
              className={`flex items-center gap-1.5 transition-transform active:scale-125 ${
                liked ? 'text-pink-500' : 'text-gray-300 hover:text-pink-400'
              }`}
            >
              <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
              <span className="text-xs font-bold">{likesCount}</span>
            </button>

            <button
              onClick={() => {
                if (!showComments) loadComments();
                setShowComments(!showComments);
              }}
              className="flex items-center gap-1.5 text-gray-300 hover:text-purple-400 transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs font-bold">{post.comments_count}</span>
            </button>

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'AzGram Paylaşımı',
                    text: post.caption || '',
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link kopyalandı!');
                }
              }}
              className="text-gray-300 hover:text-blue-400 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={toggleSave}
            className={`p-1.5 transition-colors ${
              saved ? 'text-purple-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bookmark className={`w-6 h-6 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="text-xs text-gray-200 mb-2 leading-relaxed">
            <span
              onClick={() => onViewProfile && onViewProfile(post.user_id)}
              className="font-bold text-purple-300 mr-2 cursor-pointer hover:underline"
            >
              @{post.profiles?.username || 'user'}
            </span>
            <span>{renderFormattedCaption(post.caption)}</span>
          </div>
        )}

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-purple-900/30">
            {loadingComments ? (
              <p className="text-xs text-gray-400 py-2">Şərhlər yüklənir...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">Hələ şərh yazılmayıb. İlk şərhi siz yazın!</p>
            ) : (
              <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className={`text-xs ${c.parent_comment_id ? 'ml-6 pl-2 border-l border-purple-800/40' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-purple-400 mr-1.5">
                          @{c.profiles?.username || 'user'}:
                        </span>
                        <span className="text-gray-300">{c.content}</span>
                      </div>
                      <button
                        onClick={() => {
                          setReplyingTo(c);
                          setNewComment(`@${c.profiles?.username} `);
                        }}
                        className="text-[10px] text-gray-500 hover:text-purple-300 flex-shrink-0"
                      >
                        {t('reply')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment Form */}
            {user ? (
              <form onSubmit={submitComment} className="mt-3">
                {replyingTo && (
                  <div className="flex items-center justify-between text-[11px] text-purple-300 mb-1 px-1">
                    <span>@{replyingTo.profiles?.username} istifadəçisinə cavab verilir</span>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={t('comment')}
                    className="flex-1 bg-[#100d1c] border border-purple-800/40 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              <p className="mt-2 text-[11px] text-gray-500">
                Şərh yazmaq üçün daxil olun.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
