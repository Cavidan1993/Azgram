import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, Ban, EyeOff, Eye, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Report } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export const AdminPanel: React.FC = () => {
  const { isAdmin } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!isAdmin || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          reporter_id,
          reported_post_id,
          reported_user_id,
          reason,
          status,
          created_at,
          reporter:profiles!reports_reporter_id_fkey (id, username, display_name),
          post:posts (id, image_url, caption, is_hidden, user_id),
          user:profiles!reports_reported_user_id_fkey (id, username, display_name, is_banned)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports((data as any) || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [isAdmin]);

  const handleTogglePostHidden = async (postId: string, currentHidden: boolean) => {
    setActionLoading(`hide_${postId}`);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_hidden: !currentHidden, updated_at: new Date().toISOString() })
        .eq('id', postId);

      if (error) throw error;
      await fetchReports();
    } catch (err: any) {
      alert(err.message || 'Xəta baş verdi');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleUserBan = async (userId: string, currentBanned: boolean) => {
    setActionLoading(`ban_${userId}`);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !currentBanned, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      await fetchReports();
    } catch (err: any) {
      alert(err.message || 'Xəta baş verdi');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: 'resolved' | 'dismissed') => {
    setActionLoading(`status_${reportId}`);
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status })
        .eq('id', reportId);

      if (error) throw error;
      await fetchReports();
    } catch (err: any) {
      alert(err.message || 'Xəta baş verdi');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Giriş qadağandır</h2>
        <p className="text-xs text-gray-400">
          Bu səhifə yalnız AzGram adminləri və moderatorları üçündür.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-400" /> Moderator & Admin Paneli
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            İstifadəçi şikayətləri, spam silinməsi və bloklamalar
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="p-2.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 transition-colors"
          title="Yenilə"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-[#161224] rounded-3xl border border-purple-900/30 p-8">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-200">Aktiv şikayət yoxdur</h3>
          <p className="text-xs text-gray-500 mt-1">Bütün şikayətlər nəzərdən keçirilib və ya hələ daxil olmayıb.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => {
            const reporter = r.reporter as any;
            const post = r.post as any;
            const targetUser = r.user as any;

            return (
              <div
                key={r.id}
                className="bg-[#161224] rounded-2xl border border-purple-900/30 p-5 shadow-lg space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-900/30 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                        r.status === 'pending'
                          ? 'bg-yellow-950 text-yellow-400 border border-yellow-800'
                          : r.status === 'resolved'
                          ? 'bg-green-950 text-green-400 border border-green-800'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {r.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      Şikayət edən: <strong className="text-purple-300">@{reporter?.username || 'naməlum'}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500">
                    {new Date(r.created_at).toLocaleString('az-AZ')}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Səbəb
                  </h4>
                  <p className="text-sm text-gray-200 bg-[#100d1c] p-3 rounded-xl border border-purple-900/20">
                    {r.reason}
                  </p>
                </div>

                {/* Target Post details if applicable */}
                {post && (
                  <div className="flex items-center gap-4 bg-[#100d1c] p-3 rounded-xl border border-purple-900/30">
                    <img
                      src={post.image_url}
                      alt="Reported Post"
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">
                        {post.caption || 'Təsvir yoxdur'}
                      </p>
                      <span className="text-[11px] text-gray-500">
                        Status: {post.is_hidden ? 'Gizlədilib (Spam)' : 'Görünür'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleTogglePostHidden(post.id, post.is_hidden)}
                      disabled={actionLoading === `hide_${post.id}`}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                        post.is_hidden
                          ? 'bg-green-900/40 text-green-300 border border-green-700 hover:bg-green-800/40'
                          : 'bg-red-900/40 text-red-300 border border-red-700 hover:bg-red-800/40'
                      }`}
                    >
                      {post.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {post.is_hidden ? 'Göstər' : 'Gizlət'}
                    </button>
                  </div>
                )}

                {/* Target User details if applicable */}
                {targetUser && (
                  <div className="flex items-center justify-between bg-[#100d1c] p-3 rounded-xl border border-purple-900/30">
                    <div>
                      <span className="text-xs text-gray-300 font-semibold">
                        İstifadəçi: @{targetUser.username}
                      </span>
                      <p className="text-[11px] text-gray-500">
                        Status: {targetUser.is_banned ? 'Bloklanıb' : 'Aktiv'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleUserBan(targetUser.id, targetUser.is_banned)}
                      disabled={actionLoading === `ban_${targetUser.id}`}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                        targetUser.is_banned
                          ? 'bg-green-900/40 text-green-300 border border-green-700'
                          : 'bg-red-900/40 text-red-300 border border-red-700'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {targetUser.is_banned ? 'Bloku aç' : 'İstifadəçini blokla'}
                    </button>
                  </div>
                )}

                {/* Moderation actions on report itself */}
                <div className="flex justify-end gap-2 pt-2 border-t border-purple-900/30">
                  <button
                    onClick={() => handleUpdateReportStatus(r.id, 'dismissed')}
                    disabled={r.status === 'dismissed' || actionLoading === `status_${r.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold"
                  >
                    Rədd et
                  </button>
                  <button
                    onClick={() => handleUpdateReportStatus(r.id, 'resolved')}
                    disabled={r.status === 'resolved' || actionLoading === `status_${r.id}`}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Həll olundu
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
