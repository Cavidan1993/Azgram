import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { Post } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface ReportModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ post, isOpen, onClose }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>('Spam və ya arzuolunmaz reklam');
  const [customReason, setCustomReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen || !post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Şikayət etmək üçün daxil olun');
      return;
    }

    setLoading(true);
    try {
      const finalReason = reason === 'Digər' ? customReason.trim() : reason;
      if (!finalReason) {
        alert('Zəhmət olmasa səbəb qeyd edin');
        return;
      }

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_post_id: post.id,
        reported_user_id: post.user_id,
        reason: finalReason,
        status: 'pending',
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      alert(err.message || 'Şikayət göndərilmədi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161224] border border-purple-800/40 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-purple-900/40 flex items-center justify-between">
          <h3 className="font-bold text-gray-100 flex items-center gap-2 text-sm text-yellow-400">
            <AlertTriangle className="w-4 h-4" /> Paylaşım haqqında şikayət
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-950/60 text-green-400 border border-green-800 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h4 className="font-semibold text-gray-100 text-sm">Şikayətiniz qəbul edildi</h4>
            <p className="text-xs text-gray-400">
              Moderator komandamız bu paylaşımı ən qısa zamanda yoxlayacaq. Təhlükəsiz cəmiyyət yaratmaqda kömək etdiyiniz üçün təşəkkür edirik!
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold"
            >
              Oldu
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-xs text-gray-300">
              Niyə bu paylaşım haqqında şikayət edirsiniz?
            </p>

            <div className="space-y-2">
              {[
                'Spam və ya arzuolunmaz reklam',
                'Təhqir, nifrət nitqi və ya zorakılıq',
                'Müəllif hüquqlarının pozulması',
                'Yalan və ya çaşdırıcı məlumat',
                'Digər',
              ].map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                    reason === r
                      ? 'bg-purple-950/40 border-purple-600 text-purple-200'
                      : 'bg-[#100d1c] border-purple-900/30 text-gray-300 hover:border-purple-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-purple-500"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            {reason === 'Digər' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Səbəbi ətraflı izah edin..."
                rows={3}
                required
                className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl p-3 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:bg-white/5"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Şikayəti göndər
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
