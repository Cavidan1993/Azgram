import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Search, 
  PlusSquare, 
  Heart, 
  User as UserIcon, 
  ShieldAlert, 
  LogOut, 
  Settings,
  Sparkles,
  Clapperboard,
  Send,
  Bookmark
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabaseClient';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openCreateModal: () => void;
  openSearchModal: () => void;
  openAuthModal: () => void;
  openSettingsModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  openCreateModal,
  openSearchModal,
  openAuthModal,
  openSettingsModal,
}) => {
  const { user, profile, isAdmin, isConfigured, signOut } = useAuth();
  const { t } = useLanguage();
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);

  useEffect(() => {
    if (!user || !isConfigured) return;

    // Fetch unread notifications
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
      setUnreadNotifications(count || 0);
    };

    fetchUnread();

    const notifChannel = supabase
      .channel('navbar_notifs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          setUnreadNotifications((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [user, isConfigured]);

  const navItems = [
    { id: 'feed', label: t('feed'), icon: Home },
    { id: 'explore', label: t('explore'), icon: Search, action: openSearchModal },
    { id: 'reels', label: t('reels'), icon: Clapperboard },
    { id: 'messages', label: t('messages'), icon: Send, badge: unreadMessages },
    { id: 'notifications', label: t('notifications'), icon: Heart, badge: unreadNotifications },
    { id: 'create', label: t('create'), icon: PlusSquare, action: openCreateModal },
    { id: 'saved', label: t('saved'), icon: Bookmark },
  ];

  return (
    <>
      {/* ----------------- MOBILE TOP BAR ----------------- */}
      <header className="md:hidden sticky top-0 z-40 bg-[#120D24]/90 backdrop-blur-md border-b border-purple-900/40">
        <div className="px-4 h-14 flex items-center justify-between">
          {/* Brand */}
          <div
            onClick={() => setCurrentTab('feed')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 p-[1.5px] shadow-lg shadow-purple-900/50">
              <div className="w-full h-full bg-[#120D24] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <span className="text-lg font-black bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 bg-clip-text text-transparent">
              AzGram
            </span>
          </div>

          {/* Right Action Icons on Mobile */}
          <div className="flex items-center gap-1">
            {user ? (
              <>
                <button
                  onClick={() => setCurrentTab('notifications')}
                  className="p-2 rounded-xl text-gray-300 hover:text-white relative"
                >
                  <Heart className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-pink-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setCurrentTab('messages')}
                  className="p-2 rounded-xl text-gray-300 hover:text-white"
                >
                  <Send className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold"
              >
                {t('login')}
              </button>
            )}

            <button
              onClick={openSettingsModal}
              className="p-2 rounded-xl text-gray-400 hover:text-white"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ----------------- MOBILE BOTTOM NAV ----------------- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#120D24]/95 backdrop-blur-md border-t border-purple-900/40 h-14 flex items-center justify-around px-2">
        <button
          onClick={() => setCurrentTab('feed')}
          className={`p-2 rounded-xl ${
            currentTab === 'feed' ? 'text-purple-400' : 'text-gray-400'
          }`}
        >
          <Home className="w-5 h-5" />
        </button>

        <button
          onClick={openSearchModal}
          className="p-2 rounded-xl text-gray-400"
        >
          <Search className="w-5 h-5" />
        </button>

        {user && (
          <button
            onClick={openCreateModal}
            className="p-2 rounded-xl text-purple-400"
          >
            <PlusSquare className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={() => setCurrentTab('reels')}
          className={`p-2 rounded-xl ${
            currentTab === 'reels' ? 'text-purple-400' : 'text-gray-400'
          }`}
        >
          <Clapperboard className="w-5 h-5" />
        </button>

        {user ? (
          <button
            onClick={() => setCurrentTab('profile')}
            className={`p-1 rounded-full ${
              currentTab === 'profile' ? 'ring-2 ring-purple-500' : ''
            }`}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center text-[10px]">
                {profile?.username ? profile.username.substring(0, 2).toUpperCase() : 'AZ'}
              </div>
            )}
          </button>
        ) : (
          <button onClick={openAuthModal} className="p-2 text-gray-400">
            <UserIcon className="w-5 h-5" />
          </button>
        )}
      </nav>

      {/* ----------------- DESKTOP SIDEBAR NAV ----------------- */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-40 bg-[#120D24] border-r border-purple-900/40 p-4">
        {/* Brand */}
        <div
          onClick={() => setCurrentTab('feed')}
          className="flex items-center gap-3 cursor-pointer px-3 py-4 mb-6 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 p-[2px] shadow-lg shadow-purple-900/50 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#120D24] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 bg-clip-text text-transparent">
              AzGram
            </h1>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
              0 AZN SOCIAL
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isSelected = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else {
                    setCurrentTab(item.id);
                  }
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all relative ${
                  isSelected
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-600/40'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <IconComponent className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="ml-auto px-1.5 py-0.5 bg-pink-500 text-white text-[9px] font-bold rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          {isAdmin && (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'admin'
                  ? 'bg-red-600/20 text-red-300 border border-red-600/40'
                  : 'text-gray-400 hover:text-red-400 hover:bg-white/5'
              }`}
            >
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <span>{t('admin')}</span>
            </button>
          )}

          <button
            onClick={openSettingsModal}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <Settings className="w-5 h-5" />
            <span>{t('settings')}</span>
          </button>
        </div>

        {/* User Footer on Sidebar */}
        <div className="pt-4 border-t border-purple-900/30">
          {user ? (
            <div className="flex items-center justify-between p-2 rounded-2xl bg-[#161224] border border-purple-900/30">
              <div
                onClick={() => setCurrentTab('profile')}
                className="flex items-center gap-2.5 cursor-pointer min-w-0"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center text-xs">
                    {profile?.username ? profile.username.substring(0, 2).toUpperCase() : 'AZ'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-100 truncate">
                    {profile?.display_name || profile?.username}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">@{profile?.username}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg"
                title={t('logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40"
            >
              {t('login')}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
