import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { Feed } from './components/Feed';
import { ReelsView } from './components/ReelsView';
import { DirectMessagesView } from './components/DirectMessagesView';
import { SavedPostsView } from './components/SavedPostsView';
import { ProfileView } from './components/ProfileView';
import { NotificationsView } from './components/NotificationsPopover';
import { AdminPanel } from './components/AdminPanel';
import { CreatePostModal } from './components/CreatePostModal';
import { CreateReelModal } from './components/CreateReelModal';
import { SearchModal } from './components/SearchModal';
import { AuthModal } from './components/AuthModal';
import { ReportModal } from './components/ReportModal';
import { SettingsModal } from './components/SettingsModal';
import { Post } from './types/database';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [currentTab, setCurrentTab] = useState<string>('feed');
  const [viewProfileId, setViewProfileId] = useState<string | undefined>(undefined);
  const [directChatUserId, setDirectChatUserId] = useState<string | undefined>(undefined);

  // Modals state
  const [isCreatePostOpen, setIsCreatePostOpen] = useState<boolean>(false);
  const [isCreateReelOpen, setIsCreateReelOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [reportTargetPost, setReportTargetPost] = useState<Post | null>(null);

  const handleViewProfile = (userId: string) => {
    setViewProfileId(userId);
    setCurrentTab('profile');
  };

  const handleNavProfile = () => {
    setViewProfileId(undefined);
    setCurrentTab('profile');
  };

  const handleOpenDirectChat = (userId: string) => {
    setDirectChatUserId(userId);
    setCurrentTab('messages');
  };

  const handleHashtagSearch = (tag: string) => {
    setIsSearchOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0d0b14] text-gray-100 flex flex-col md:flex-row selection:bg-purple-600 selection:text-white">
      {/* Navigation (Sidebar on Desktop, Top & Bottom on Mobile) */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab === 'profile') {
            handleNavProfile();
          } else {
            setCurrentTab(tab);
          }
        }}
        openCreateModal={() => {
          if (!user) {
            setIsAuthOpen(true);
          } else {
            setIsCreatePostOpen(true);
          }
        }}
        openSearchModal={() => setIsSearchOpen(true)}
        openAuthModal={() => setIsAuthOpen(true)}
        openSettingsModal={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area (Offset for Desktop Sidebar) */}
      <main className="flex-1 md:pl-64 pb-16 md:pb-8 pt-0 min-h-screen">
        {currentTab === 'feed' && (
          <Feed
            onOpenReport={(post) => setReportTargetPost(post)}
            onViewProfile={handleViewProfile}
            onHashtagClick={handleHashtagSearch}
            openAuthModal={() => setIsAuthOpen(true)}
          />
        )}

        {currentTab === 'reels' && (
          <ReelsView
            onOpenCreateReel={() => {
              if (!user) setIsAuthOpen(true);
              else setIsCreateReelOpen(true);
            }}
            onViewProfile={handleViewProfile}
          />
        )}

        {currentTab === 'messages' && (
          <DirectMessagesView
            initialChatUserId={directChatUserId}
            onViewProfile={handleViewProfile}
          />
        )}

        {currentTab === 'saved' && (
          <SavedPostsView
            onSelectPost={(post) => {
              // Can open post details or view in feed
              handleViewProfile(post.user_id);
            }}
            onViewProfile={handleViewProfile}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileView
            userId={viewProfileId}
            onOpenDirectChat={handleOpenDirectChat}
          />
        )}

        {currentTab === 'notifications' && (
          <NotificationsView onSelectUser={handleViewProfile} />
        )}

        {currentTab === 'admin' && (
          <AdminPanel />
        )}
      </main>

      {/* Modals */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={() => {
          setCurrentTab('feed');
        }}
      />

      <CreateReelModal
        isOpen={isCreateReelOpen}
        onClose={() => setIsCreateReelOpen(false)}
        onReelCreated={() => {
          setCurrentTab('reels');
        }}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectUser={handleViewProfile}
        onSelectHashtag={(tag) => {
          setIsSearchOpen(false);
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <ReportModal
        post={reportTargetPost}
        isOpen={!!reportTargetPost}
        onClose={() => setReportTargetPost(null)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
