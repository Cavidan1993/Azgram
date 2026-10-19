import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  Volume2, 
  VolumeX, 
  Plus, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Reel } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface ReelsViewProps {
  onOpenCreateReel: () => void;
  onViewProfile: (userId: string) => void;
}

export const ReelsView: React.FC<ReelsViewProps> = ({
  onOpenCreateReel,
  onViewProfile,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  const fetchReels = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reels')
        .select(`
          id,
          user_id,
          video_url,
          caption,
          views_count,
          likes_count,
          comments_count,
          is_hidden,
          created_at,
          profiles (id, username, display_name, avatar_url)
        `)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setReels((data as unknown as Reel[]) || []);
    } catch (err) {
      console.error('Error fetching reels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  const toggleLikeReel = async (reel: Reel) => {
    if (!user) {
      alert('Bəyənmək üçün daxil olun');
      return;
    }

    const prevLiked = reel.user_has_liked;
    const prevCount = reel.likes_count;

    setReels((prev) =>
      prev.map((r) =>
        r.id === reel.id
          ? {
              ...r,
              user_has_liked: !prevLiked,
              likes_count: prevLiked ? prevCount - 1 : prevCount + 1,
            }
          : r
      )
    );

    try {
      // Update count in database
      await supabase
        .from('reels')
        .update({
          likes_count: prevLiked ? prevCount - 1 : prevCount + 1,
        })
        .eq('id', reel.id);
    } catch (err) {
      console.error('Error toggling reel like:', err);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6 px-4">
      {/* Top action header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            AzGram Reels
          </h2>
          <p className="text-xs text-gray-400">Qısa videolar və kreativ anlar</p>
        </div>

        {user && (
          <button
            onClick={onOpenCreateReel}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-purple-900/40"
          >
            <Plus className="w-4 h-4" /> Reel Yüklə
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : reels.length === 0 ? (
        <div className="text-center py-20 bg-[#161224] rounded-3xl border border-purple-900/30 p-8">
          <p className="text-base font-semibold text-gray-200 mb-1">Hələ video paylaşılmayıb</p>
          <p className="text-xs text-gray-400 mb-6">İlk qısa videonu siz yükləyin və populyarlaşın!</p>
          {user && (
            <button
              onClick={onOpenCreateReel}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40"
            >
              İlk Reeli Yüklə
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {reels.map((reel) => (
            <div
              key={reel.id}
              className="relative aspect-[9/16] max-h-[640px] bg-black rounded-3xl overflow-hidden shadow-2xl border border-purple-900/30 group"
            >
              {/* HTML5 Video */}
              <video
                src={reel.video_url}
                autoPlay
                loop
                playsInline
                muted={isMuted}
                className="w-full h-full object-cover"
              />

              {/* Sound toggle button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-4 right-4 p-2.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white z-20 transition-transform active:scale-95"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Bottom-left Author & Caption */}
              <div className="absolute bottom-4 left-4 right-16 z-20 text-white drop-shadow space-y-2">
                <div
                  onClick={() => onViewProfile(reel.user_id)}
                  className="flex items-center gap-2.5 cursor-pointer w-max group/author"
                >
                  {reel.profiles?.avatar_url ? (
                    <img
                      src={reel.profiles.avatar_url}
                      alt={reel.profiles.username}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center text-xs">
                      {reel.profiles?.username ? reel.profiles.username.substring(0, 2).toUpperCase() : 'AZ'}
                    </div>
                  )}
                  <span className="font-bold text-sm group-hover/author:text-purple-300 transition-colors">
                    @{reel.profiles?.username || 'user'}
                  </span>
                </div>

                {reel.caption && (
                  <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed">
                    {reel.caption}
                  </p>
                )}
              </div>

              {/* Right Side Floating Action Buttons */}
              <div className="absolute bottom-6 right-3 z-20 flex flex-col items-center gap-4 text-white">
                <button
                  onClick={() => toggleLikeReel(reel)}
                  className="flex flex-col items-center gap-1 group/btn"
                >
                  <div
                    className={`p-3 rounded-full backdrop-blur-md transition-all ${
                      reel.user_has_liked
                        ? 'bg-pink-600 text-white'
                        : 'bg-black/40 hover:bg-black/60 text-white'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${reel.user_has_liked ? 'fill-current' : ''}`} />
                  </div>
                  <span className="text-[11px] font-bold">{reel.likes_count}</span>
                </button>

                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'AzGram Reel',
                        text: reel.caption || '',
                        url: reel.video_url,
                      });
                    } else {
                      navigator.clipboard.writeText(reel.video_url);
                      alert('Reel linki kopyalandı!');
                    }
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="p-3 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold">Paylaş</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
