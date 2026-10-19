import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  Edit3, 
  Camera, 
  Grid, 
  Loader2, 
  UserPlus, 
  UserCheck, 
  Shield, 
  Globe, 
  Lock, 
  Bookmark, 
  Ban, 
  Check, 
  X,
  Clock
} from 'lucide-react';
import { Profile, Post } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface ProfileViewProps {
  userId?: string;
  onSelectPost?: (post: Post) => void;
  onOpenDirectChat?: (userId: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userId,
  onSelectPost,
  onOpenDirectChat,
}) => {
  const { user: currentUser, profile: currentProfile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const targetId = userId || currentUser?.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');

  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Edit form state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

  // Follow list modal (followers / following)
  const [showUsersModal, setShowUsersModal] = useState<'followers' | 'following' | null>(null);
  const [modalUsersList, setModalUsersList] = useState<Profile[]>([]);
  const [loadingModalUsers, setLoadingModalUsers] = useState<boolean>(false);

  const isOwnProfile = currentUser?.id === targetId;

  const loadProfileData = async () => {
    if (!targetId || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Profile
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();

      if (profErr) throw profErr;
      const p = prof as Profile;
      setProfile(p);
      setDisplayName(p.display_name || '');
      setBio(p.bio || '');
      setWebsite(p.website || '');
      setIsPrivate(p.is_private || false);

      // Check if blocked by current user
      if (currentUser && !isOwnProfile) {
        const { data: blockRec } = await supabase
          .from('user_blocks')
          .select('*')
          .eq('blocker_id', currentUser.id)
          .eq('blocked_id', targetId)
          .maybeSingle();

        setIsBlocked(!!blockRec);

        // Check follow status
        const { data: followRecord } = await supabase
          .from('follows')
          .select('status')
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetId)
          .maybeSingle();

        setFollowStatus(followRecord ? (followRecord.status as any) : 'none');
      }

      // 2. Fetch User's Posts (if not blocked and accessible)
      const canViewContent = isOwnProfile || !p.is_private || followStatus === 'accepted';
      if (canViewContent) {
        const { data: userPosts } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', targetId)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false });

        setPosts((userPosts as unknown as Post[]) || []);
      } else {
        setPosts([]);
      }

      // 3. Count Followers & Following
      const { count: fCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetId)
        .eq('status', 'accepted');
      setFollowersCount(fCount || 0);

      const { count: fingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetId)
        .eq('status', 'accepted');
      setFollowingCount(fingCount || 0);

      // 4. If own profile, fetch saved posts count
      if (isOwnProfile) {
        const { data: savedData } = await supabase
          .from('saved_posts')
          .select('posts (*)')
          .eq('user_id', currentUser.id);

        setSavedPosts((savedData || []).map((s: any) => s.posts).filter(Boolean));
      }
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadProfileData();
  }, [targetId, currentUser, followStatus]);

  const toggleFollow = async () => {
    if (!currentUser) {
      alert(t('login'));
      return;
    }
    if (!targetId || isOwnProfile) return;

    try {
      if (followStatus === 'accepted' || followStatus === 'pending') {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetId);

        setFollowStatus('none');
        if (followStatus === 'accepted') {
          setFollowersCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        // Follow or Request Follow (for private accounts)
        const initialStatus = profile?.is_private ? 'pending' : 'accepted';
        await supabase.from('follows').insert({
          follower_id: currentUser.id,
          following_id: targetId,
          status: initialStatus,
        });

        setFollowStatus(initialStatus);
        if (initialStatus === 'accepted') {
          setFollowersCount((prev) => prev + 1);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Xəta baş verdi');
    }
  };

  const toggleBlockUser = async () => {
    if (!currentUser || !targetId || isOwnProfile) return;
    try {
      if (isBlocked) {
        await supabase
          .from('user_blocks')
          .delete()
          .eq('blocker_id', currentUser.id)
          .eq('blocked_id', targetId);
        setIsBlocked(false);
        alert('İstifadəçi blokdan çıxarıldı');
      } else {
        if (!confirm('Bu istifadəçini bloklamaq istədiyinizə əminsiniz?')) return;
        await supabase.from('user_blocks').insert({
          blocker_id: currentUser.id,
          blocked_id: targetId,
        });
        setIsBlocked(true);
        // Also unfollow
        await supabase
          .from('follows')
          .delete()
          .or(`and(follower_id.eq.${currentUser.id},following_id.eq.${targetId}),and(follower_id.eq.${targetId},following_id.eq.${currentUser.id})`);
        setFollowStatus('none');
        alert('İstifadəçi bloklandı');
      }
    } catch (err: any) {
      alert(err.message || 'Xəta');
    }
  };

  const openFollowList = async (type: 'followers' | 'following') => {
    setShowUsersModal(type);
    setLoadingModalUsers(true);
    try {
      if (type === 'followers') {
        const { data } = await supabase
          .from('follows')
          .select('profiles!follows_follower_id_fkey (*)')
          .eq('following_id', targetId)
          .eq('status', 'accepted');

        setModalUsersList((data || []).map((d: any) => d.profiles).filter(Boolean));
      } else {
        const { data } = await supabase
          .from('follows')
          .select('profiles!follows_following_id_fkey (*)')
          .eq('follower_id', targetId)
          .eq('status', 'accepted');

        setModalUsersList((data || []).map((d: any) => d.profiles).filter(Boolean));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModalUsers(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentUser) return;
    const avatarFile = e.target.files[0];

    if (avatarFile.size > 2 * 1024 * 1024) {
      alert('Avatar maksimum 2 MB ola bilər');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = avatarFile.name.split('.').pop();
      const filePath = `${currentUser.id}/avatar_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id);

      await refreshProfile();
      await loadProfileData();
    } catch (err: any) {
      alert(err.message || 'Avatar yenilənmədi');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfileEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim(),
          website: website.trim() || null,
          is_private: isPrivate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      await refreshProfile();
      await loadProfileData();
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Xəta');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-20 text-gray-400">İstifadəçi tapılmadı.</div>;
  }

  const canViewContent = isOwnProfile || !profile.is_private || followStatus === 'accepted';

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Profile Header Card */}
      <div className="bg-[#161224] rounded-3xl p-6 border border-purple-900/30 shadow-2xl mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar with upload trigger */}
          <div className="relative group">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-purple-600/50 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-purple-800 to-pink-600 text-white font-bold text-3xl flex items-center justify-center ring-4 ring-purple-600/40">
                {profile.username.substring(0, 2).toUpperCase()}
              </div>
            )}

            {isOwnProfile && (
              <label className="absolute bottom-0 right-0 p-2 bg-purple-600 hover:bg-purple-500 rounded-full text-white cursor-pointer shadow-md transition-transform group-hover:scale-110">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">
                {profile.display_name || profile.username}
              </h2>
              <span className="text-sm text-purple-400 font-semibold">
                @{profile.username}
              </span>
              {profile.is_private && (
                <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1 self-center sm:self-auto">
                  <Lock className="w-3 h-3" /> Qapalı
                </span>
              )}
            </div>

            {profile.bio && (
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-lg">
                {profile.bio}
              </p>
            )}

            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <Globe className="w-3.5 h-3.5" /> {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}

            <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Qoşuldu:{' '}
                {new Date(profile.created_at).toLocaleDateString('az-AZ', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* Stats row with interactive modals */}
            <div className="flex items-center justify-center sm:justify-start gap-6 pt-3 border-t border-purple-900/30">
              <div className="text-center sm:text-left cursor-default">
                <span className="font-bold text-gray-100">{posts.length}</span>
                <span className="text-xs text-gray-400 ml-1">{t('posts_count')}</span>
              </div>
              <div
                onClick={() => openFollowList('followers')}
                className="text-center sm:text-left cursor-pointer hover:opacity-80"
              >
                <span className="font-bold text-purple-300">{followersCount}</span>
                <span className="text-xs text-gray-400 ml-1">{t('followers_count')}</span>
              </div>
              <div
                onClick={() => openFollowList('following')}
                className="text-center sm:text-left cursor-pointer hover:opacity-80"
              >
                <span className="font-bold text-purple-300">{followingCount}</span>
                <span className="text-xs text-gray-400 ml-1">{t('following_count')}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="self-center sm:self-start flex flex-col gap-2">
            {isOwnProfile ? (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> {t('edit_profile')}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFollow}
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                    followStatus === 'accepted'
                      ? 'bg-purple-950 border border-purple-700 text-purple-300 hover:bg-red-950 hover:text-red-300 hover:border-red-800'
                      : followStatus === 'pending'
                      ? 'bg-yellow-950/60 border border-yellow-700 text-yellow-300'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-900/40'
                  }`}
                >
                  {followStatus === 'accepted' ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" /> {t('following')}
                    </>
                  ) : followStatus === 'pending' ? (
                    <>
                      <Clock className="w-3.5 h-3.5" /> {t('follow_request_sent')}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" /> {t('follow')}
                    </>
                  )}
                </button>

                {onOpenDirectChat && (
                  <button
                    onClick={() => onOpenDirectChat(profile.id)}
                    className="px-3.5 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 text-purple-200 text-xs font-semibold"
                  >
                    Mesaj
                  </button>
                )}

                <button
                  onClick={toggleBlockUser}
                  className={`p-2 rounded-xl border transition-colors ${
                    isBlocked
                      ? 'bg-red-600 text-white border-red-500'
                      : 'border-purple-800/40 text-gray-400 hover:text-red-400 hover:bg-red-950/30'
                  }`}
                  title={isBlocked ? t('unblock') : t('block_user')}
                >
                  <Ban className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Edit profile drawer */}
        {isEditing && (
          <form onSubmit={saveProfileEdits} className="mt-6 pt-6 border-t border-purple-900/40 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('display_name')}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">{t('bio')}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl p-3 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">{t('website')}</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="accent-purple-500"
              />
              <span className="text-xs text-gray-300">{t('private_account')}</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:bg-white/5"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {savingProfile && <Loader2 className="w-3 h-3 animate-spin" />}
                Yadda saxla
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Content Privacy Gate */}
      {!canViewContent ? (
        <div className="text-center py-16 bg-[#161224] rounded-3xl border border-purple-900/30 p-8 space-y-3">
          <div className="w-14 h-14 rounded-full bg-purple-950 border border-purple-800 flex items-center justify-center mx-auto text-purple-400">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-100">{t('this_account_is_private')}</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {t('follow_to_see_posts')}
          </p>
        </div>
      ) : (
        <div>
          {/* Tabs: Posts / Saved */}
          <div className="flex items-center justify-center gap-8 border-b border-purple-900/30 mb-6">
            <button
              onClick={() => setActiveTab('posts')}
              className={`py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'posts'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Grid className="w-4 h-4" /> {t('posts_count').toUpperCase()}
            </button>

            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('saved')}
                className={`py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'saved'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Bookmark className="w-4 h-4" /> {t('saved').toUpperCase()}
              </button>
            )}
          </div>

          {activeTab === 'posts' ? (
            posts.length === 0 ? (
              <div className="text-center py-12 bg-[#161224] rounded-3xl border border-purple-900/20 p-6">
                <p className="text-xs text-gray-400">Hələ heç bir şəkil paylaşılmayıb.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {posts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onSelectPost && onSelectPost(p)}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-black shadow-md border border-purple-900/20 cursor-pointer"
                  >
                    <img
                      src={p.image_url}
                      alt={p.caption || 'Post'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs font-bold">
                      <span>❤️ {p.likes_count}</span>
                      <span>💬 {p.comments_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : savedPosts.length === 0 ? (
            <div className="text-center py-12 bg-[#161224] rounded-3xl border border-purple-900/20 p-6">
              <p className="text-xs text-gray-400">Saxlanılmış paylaşım yoxdur.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {savedPosts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPost && onSelectPost(p)}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-black shadow-md border border-purple-900/20 cursor-pointer"
                >
                  <img
                    src={p.image_url}
                    alt={p.caption || 'Saved'}
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
      )}

      {/* Followers / Following List Modal */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161224] border border-purple-800/40 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <h4 className="font-bold text-gray-100 text-sm">
                {showUsersModal === 'followers' ? t('followers_count') : t('following_count')}
              </h4>
              <button onClick={() => setShowUsersModal(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5">
              {loadingModalUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
              ) : modalUsersList.length === 0 ? (
                <p className="text-center py-8 text-xs text-gray-500">Heç kim yoxdur.</p>
              ) : (
                modalUsersList.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5">
                    <div className="flex items-center gap-2.5">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-purple-800 text-white font-bold flex items-center justify-center text-xs">
                          {u.username.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-gray-100">{u.display_name}</p>
                        <span className="text-[10px] text-gray-400">@{u.username}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
