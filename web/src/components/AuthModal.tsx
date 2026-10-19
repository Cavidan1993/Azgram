import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { refreshProfile } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'login') {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) throw signInErr;

        await refreshProfile();
        onClose();
      } else if (mode === 'signup') {
        if (!username.trim() || username.length < 3) {
          throw new Error('İstifadəçi adı minimum 3 simvol olmalıdır');
        }

        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.toLowerCase().trim(),
              display_name: displayName.trim() || username.trim(),
            },
          },
        });
        if (signUpErr) throw signUpErr;

        if (signUpData.session) {
          await refreshProfile();
          onClose();
        } else {
          setSuccessMessage(
            'Qeydiyyat uğurla tamamlandı! E-poçt ünvanınıza təsdiq linki göndərildi. Zəhmət olmasa poçtunuzu yoxlayın.'
          );
        }
      } else if (mode === 'forgot') {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (resetErr) throw resetErr;

        setSuccessMessage('Şifrəni bərpa etmək üçün təlimatlar e-poçt ünvanınıza göndərildi.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161224] border border-purple-800/40 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-purple-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 p-[1.5px]">
              <div className="w-full h-full bg-[#161224] rounded-[6px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <h3 className="font-bold text-gray-100">
              {mode === 'login' && 'AzGram-a Giriş'}
              {mode === 'signup' && 'AzGram-da Qeydiyyat'}
              {mode === 'forgot' && 'Şifrənin Bərpası'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-green-950/60 border border-green-800 text-xs text-green-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-400 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  İstifadəçi adı (Username)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                    placeholder="orxan_99"
                    required
                    className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Ad və Soyad (Display Name)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Orxan Məmmədov"
                  className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              E-poçt ünvanı
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adiniz@example.com"
                required
                className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-300">
                  Şifrə
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300"
                  >
                    Şifrəni unutmusunuz?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' && 'Daxil ol'}
            {mode === 'signup' && 'Hesab yarat'}
            {mode === 'forgot' && 'Bərpa linki göndər'}
          </button>

          {/* Mode Switchers */}
          <div className="text-center pt-2 text-xs text-gray-400">
            {mode === 'login' ? (
              <p>
                Hesabınız yoxdur?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-purple-400 font-semibold hover:underline"
                >
                  Qeydiyyatdan keçin
                </button>
              </p>
            ) : (
              <p>
                Artıq hesabınız var?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-purple-400 font-semibold hover:underline"
                >
                  Daxil olun
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
