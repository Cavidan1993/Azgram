import React, { useState, useEffect } from 'react';
import { X, Search, Users, Image as ImageIcon, Hash, Clock, Trash2, Loader2 } from 'lucide-react';
import { Profile, Post, Hashtag } from '../types/database';
import { useLanguage } from '../context/LanguageContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  onSelectHashtag: (tag: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  onSelectHashtag,
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'tags'>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('azgram_recent_searches');
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    }
  }, [isOpen]);

  const saveRecentSearch = (term: string) => {
    const updated = Array.from(new Set([term, ...recentSearches])).slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem('azgram_recent_searches', JSON.stringify(updated));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('azgram_recent_searches');
  };

  useEffect(() => {
    if (!searchTerm.trim() || !isSupabaseConfigured()) {
      setUsers([]);
      setPosts([]);
      setHashtags([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (activeTab === 'users') {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
            .limit(15);
          setUsers((data as Profile[]) || []);
        } else if (activeTab === 'tags') {
          const cleanTag = searchTerm.replace(/^#/, '').toLowerCase();
          const { data } = await supabase
            .from('hashtags')
            .select('*')
            .ilike('tag', `%${cleanTag}%`)
            .limit(15);
          setHashtags((data as Hashtag[]) || []);
        } else {
          const { data } = await supabase
            .from('posts')
            .select(`
              id,
              user_id,
              image_url,
              caption,
              likes_count,
              comments_count,
              created_at,
              profiles (id, username, display_name, avatar_url)
            `)
            .eq('is_hidden', false)
            .ilike('caption', `%${searchTerm}%`)
            .limit(15);
          setPosts((data as unknown as Post[]) || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-16 sm:pt-24">
      <div className="bg-[#161224] border border-purple-800/40 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Search Bar */}
        <div className="p-4 border-b border-purple-900/40 flex items-center gap-3">
          <Search className="w-5 h-5 text-purple-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search_placeholder')}
            autoFocus
            className="flex-1 bg-transparent text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-full text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 ml-1"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-purple-900/40">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'users'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> İstifadəçilər
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'tags'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" /> Heşteqlər
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'posts'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Paylaşımlar
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-96 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : !searchTerm.trim() ? (
            recentSearches.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {t('recent_searches')}
                  </span>
                  <button
                    onClick={clearAllRecent}
                    className="text-purple-400 hover:underline text-[11px]"
                  >
                    {t('clear_all')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearchTerm(s)}
                      className="px-3 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 text-purple-200 text-xs"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center py-10 text-xs text-gray-500">
                Axtarış üçün söz yazın...
              </p>
            )
          ) : activeTab === 'users' ? (
            users.length === 0 ? (
              <p className="text-center py-10 text-xs text-gray-500">{t('no_results')}</p>
            ) : (
              <div className="space-y-2.5">
                {users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      saveRecentSearch(u.username);
                      onSelectUser(u.id);
                      onClose();
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-800 text-white font-bold flex items-center justify-center text-xs">
                        {u.username.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-gray-200">{u.display_name}</h4>
                      <p className="text-[11px] text-gray-400">@{u.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'tags' ? (
            hashtags.length === 0 ? (
              <p className="text-center py-10 text-xs text-gray-500">{t('no_results')}</p>
            ) : (
              <div className="space-y-2">
                {hashtags.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => {
                      saveRecentSearch(`#${h.tag}`);
                      onSelectHashtag(h.tag);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400 font-bold">
                        #
                      </div>
                      <span className="text-xs font-bold text-gray-200">#{h.tag}</span>
                    </div>
                    <span className="text-[11px] text-gray-400">{h.posts_count} paylaşım</span>
                  </div>
                ))}
              </div>
            )
          ) : posts.length === 0 ? (
            <p className="text-center py-10 text-xs text-gray-500">{t('no_results')}</p>
          ) : (
            <div className="space-y-2.5">
              {posts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    saveRecentSearch(p.caption || 'post');
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <img src={p.image_url} alt="Post" className="w-14 h-14 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-200 truncate">{p.caption || 'Təsvirsiz'}</p>
                    <span className="text-[11px] text-purple-400">
                      @{p.profiles?.username} • ❤️ {p.likes_count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
