import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  RefreshCw, 
  Languages, 
  Lock, 
  ShieldCheck, 
  Ban, 
  Info,
  LogOut
} from 'lucide-react';
import { supabaseUrl, supabaseAnonKey, supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../lib/i18n';
import { UserBlock } from '../types/database';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'blocked' | 'supabase'>('general');

  // Supabase Config State
  const [url, setUrl] = useState<string>(supabaseUrl);
  const [anonKey, setAnonKey] = useState<string>(supabaseAnonKey);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Password Change State
  const [newPassword, setNewPassword] = useState<string>('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<UserBlock[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab === 'blocked' && user) {
      loadBlockedUsers();
    }
  }, [activeTab, user]);

  const loadBlockedUsers = async () => {
    if (!user) return;
    setLoadingBlocked(true);
    try {
      const { data } = await supabase
        .from('user_blocks')
        .select(`
          blocker_id,
          blocked_id,
          created_at,
          blocked_user:profiles!user_blocks_blocked_id_fkey (*)
        `)
        .eq('blocker_id', user.id);

      setBlockedUsers((data as unknown as UserBlock[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId);

      setBlockedUsers(blockedUsers.filter((b) => b.blocked_id !== blockedId));
    } catch (err: any) {
      alert(err.message || 'Xəta');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword.length < 6) {
      setPasswordError('Şifrə minimum 6 simvol olmalıdır');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess('Şifrəniz uğurla yeniləndi!');
      setNewPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Xəta baş verdi');
    }
  };

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    localStorage.setItem('azgram_supabase_url', url.trim());
    localStorage.setItem('azgram_supabase_anon_key', anonKey.trim());
    window.location.reload();
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw error;
      setTestResult({
        success: true,
        message: 'PostgreSQL və Supabase RLS ilə uğurlu bağlantı quruldu!',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Supabase ilə əlaqə qurulmadı. URL və Açarı yoxlayın.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161224] border border-purple-800/40 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-purple-900/40 flex items-center justify-between">
          <h3 className="font-bold text-gray-100 flex items-center gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-purple-400" /> {t('settings')}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-purple-900/40 text-xs font-semibold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Languages className="w-3.5 h-3.5" /> {t('language')}
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Şifrə
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-4 py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'blocked'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Ban className="w-3.5 h-3.5" /> {t('blocked_users')}
          </button>
          <button
            onClick={() => setActiveTab('supabase')}
            className={`px-4 py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'supabase'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> Supabase
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* GENERAL: 7 LANGUAGES */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-200 mb-2">{t('language')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { code: 'az', label: '🇦🇿 Azərbaycanca' },
                    { code: 'ru', label: '🇷🇺 Русский' },
                    { code: 'tr', label: '🇹🇷 Türkçe' },
                    { code: 'en', label: '🇬🇧 English' },
                    { code: 'zh', label: '🇨🇳 中文' },
                    { code: 'ja', label: '🇯🇵 日本語' },
                    { code: 'uk', label: '🇺🇦 Українська' },
                  ].map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code as Language)}
                      className={`p-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                        language === l.code
                          ? 'bg-purple-950/60 border-purple-500 text-purple-300 shadow'
                          : 'bg-[#100d1c] border-purple-900/30 text-gray-300 hover:border-purple-700'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {user && (
                <div className="pt-4 border-t border-purple-900/30">
                  <button
                    onClick={() => {
                      signOut();
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> {t('logout')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PRIVACY & PASSWORD */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <form onSubmit={handleChangePassword} className="space-y-3">
                <h4 className="text-xs font-bold text-gray-200">Şifrəni Dəyiş</h4>
                {passwordSuccess && (
                  <div className="p-3 bg-green-950/60 border border-green-800 text-green-300 text-xs rounded-xl">
                    {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl">
                    {passwordError}
                  </div>
                )}
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yeni güclü şifrə daxil edin..."
                  className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl"
                >
                  Şifrəni Yenilə
                </button>
              </form>
            </div>
          )}

          {/* BLOCKED USERS */}
          {activeTab === 'blocked' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-200">{t('blocked_users')}</h4>
              {loadingBlocked ? (
                <div className="flex justify-center py-6">
                  <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
                </div>
              ) : blockedUsers.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">{t('no_blocked_users')}</p>
              ) : (
                blockedUsers.map((b) => (
                  <div
                    key={b.blocked_id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#100d1c] border border-purple-900/30"
                  >
                    <span className="text-xs text-gray-200 font-semibold">
                      @{b.blocked_user?.username || 'istifadəçi'}
                    </span>
                    <button
                      onClick={() => handleUnblock(b.blocked_id)}
                      className="px-3 py-1 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 text-xs rounded-lg"
                    >
                      {t('unblock')}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SUPABASE CONFIG */}
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              <div className="bg-purple-950/40 border border-purple-700/40 rounded-2xl p-3 text-xs text-purple-200">
                <span className="font-bold text-purple-300 block mb-1">
                  Mövcud Supabase Proyekti:
                </span>
                <span className="font-mono text-[11px] block text-green-300">
                  https://zsrkijbvsfczaspxppkj.supabase.co
                </span>
                <p className="text-[10px] text-gray-400 mt-1">
                  Bütün məlumatlar PostgreSQL bazasında qorunur.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Supabase URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Supabase Anon Key
                </label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                    testResult.success
                      ? 'bg-green-950/50 border-green-800 text-green-300'
                      : 'bg-red-950/50 border-red-800 text-red-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testing}
                  className="px-3.5 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 text-purple-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Yoxlanılır...' : 'Əlaqəni Test Et'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                >
                  Yadda saxla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
