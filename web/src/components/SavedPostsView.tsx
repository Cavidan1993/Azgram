import React, { useState, useEffect } from 'react';
import { Bookmark, Loader2, Grid } from 'lucide-react';
import { Post } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabaseClient';

interface SavedPostsViewProps {
  onSelectPost: (post: Post) => void;
  onViewProfile: (userId: string) => void;
}

export const SavedPostsView: React.FC<SavedPostsViewProps> = ({ onSelectPost }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSavedPosts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('saved_posts')
        .select(`
          post_id,
          created_at,
          posts (
            id,
            user_id,
            image_url,
            caption,
            likes_count,
            comments_count,
            created_at,
            profiles (id, username, display_name, avatar_url)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const posts = (data || [])
        .map((item: any) => item.posts as Post)
        .filter(Boolean);

      setSavedPosts(posts);
    } catch (err) {
      console.error('Error fetching saved posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedPosts();
  }, [user]);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-6 border-b border-purple-900/30 pb-4">
        <Bookmark className="w-5 h-5 text-purple-400" />
        <div>
          <h2 className="text-xl font-bold text-gray-100">{t('saved')}</h2>
          <p className="text-xs text-gray-400">Yalnız sizin görə biləcəyiniz gizli arxiv</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : savedPosts.length === 0 ? (
        <div className="text-center py-16 bg-[#161224] rounded-3xl border border-purple-900/30 p-8">
          <Bookmark className="w-10 h-10 text-gray-500 mx-auto mb-2" />
          <h4 className="font-semibold text-gray-200 text-sm mb-1">Hələ heç bir paylaşım saxlanılmayıb</h4>
          <p className="text-xs text-gray-500">
            Lentdə bəyəndiyiniz paylaşımların altındakı saxlama işarəsinə klikləyərək buraya əlavə edin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {savedPosts.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectPost(p)}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-black shadow-md border border-purple-900/20 cursor-pointer"
            >
              <img
                src={p.image_url}
                alt={p.caption || 'Saved Post'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs font-bold">
                <span>❤️ {p.likes_count}</span>
                <span>💬 {p.comments_count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
