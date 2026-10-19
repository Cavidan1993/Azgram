import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { Story, Profile } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface StoriesBarProps {
  onOpenStoryViewer: (stories: Story[], startIndex: number) => void;
  onOpenCreateStory: () => void;
}

interface GroupedStories {
  user: Profile;
  stories: Story[];
  hasUnseen: boolean;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  onOpenStoryViewer,
  onOpenCreateStory,
}) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [groupedList, setGroupedList] = useState<GroupedStories[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchActiveStories = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          media_url,
          media_type,
          caption,
          expires_at,
          created_at,
          profiles (id, username, display_name, avatar_url)
        `)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const stories = (data as unknown as Story[]) || [];
      const userMap = new Map<string, GroupedStories>();

      stories.forEach((story) => {
        const author = story.profiles || {
          id: story.user_id,
          username: 'user',
          display_name: 'User',
          avatar_url: null,
          is_banned: false,
          created_at: '',
          updated_at: '',
        };

        if (!userMap.has(story.user_id)) {
          userMap.set(story.user_id, {
            user: author,
            stories: [],
            hasUnseen: true,
          });
        }
        userMap.get(story.user_id)!.stories.push(story);
      });

      setGroupedList(Array.from(userMap.values()));
    } catch (err) {
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveStories();
  }, [user]);

  const userOwnStories = groupedList.find((g) => g.user.id === user?.id);
  const otherStories = groupedList.filter((g) => g.user.id !== user?.id);

  return (
    <div className="bg-[#120d24] border border-purple-900/30 rounded-2xl p-4 mb-6 shadow-xl shadow-black/20 overflow-hidden">
      <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-none">
        {/* Current User Story Item */}
        <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
          <div className="relative">
            <div
              onClick={() => {
                if (userOwnStories && userOwnStories.stories.length > 0) {
                  onOpenStoryViewer(userOwnStories.stories, 0);
                } else {
                  onOpenCreateStory();
                }
              }}
              className={`w-16 h-16 rounded-full p-[2.5px] transition-transform group-hover:scale-105 ${
                userOwnStories && userOwnStories.stories.length > 0
                  ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'
                  : 'bg-purple-900/40'
              }`}
            >
              <div className="w-full h-full rounded-full bg-[#161224] p-[2px] overflow-hidden">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-purple-800 to-pink-600 text-white font-bold flex items-center justify-center text-sm">
                    {profile?.username ? profile.username.substring(0, 2).toUpperCase() : 'AZ'}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenCreateStory();
              }}
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-purple-600 hover:bg-purple-500 border-2 border-[#120d24] text-white flex items-center justify-center shadow"
              title={t('add_story')}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[11px] text-gray-300 font-medium mt-1 max-w-[64px] truncate text-center">
            {t('your_story')}
          </span>
        </div>

        {/* Other Users Stories */}
        {loading ? (
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center flex-shrink-0 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-purple-950/60" />
                <div className="w-10 h-2 bg-purple-950 rounded mt-2" />
              </div>
            ))}
          </div>
        ) : (
          otherStories.map((grouped, idx) => (
            <div
              key={grouped.user.id}
              onClick={() => onOpenStoryViewer(grouped.stories, 0)}
              className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 transition-transform group-hover:scale-105">
                <div className="w-full h-full rounded-full bg-[#161224] p-[2px] overflow-hidden">
                  {grouped.user.avatar_url ? (
                    <img
                      src={grouped.user.avatar_url}
                      alt={grouped.user.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-purple-800 to-pink-600 text-white font-bold flex items-center justify-center text-sm">
                      {grouped.user.username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-gray-300 font-medium mt-1 max-w-[64px] truncate text-center">
                {grouped.user.username}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
