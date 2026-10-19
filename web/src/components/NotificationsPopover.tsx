import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, UserPlus, Bell, Check, Loader2 } from 'lucide-react';
import { Notification } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface NotificationsViewProps {
  onSelectUser: (userId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onSelectUser }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          recipient_id,
          sender_id,
          type,
          post_id,
          comment_id,
          is_read,
          created_at,
          sender:profiles!notifications_sender_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setNotifications((data as any) || []);

      // Auto mark unread as read in database
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!user || !isSupabaseConfigured()) return;

    // Realtime channel
    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const renderIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-pink-500 fill-current" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-400 fill-current" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionText = (type: string) => {
    switch (type) {
      case 'like':
        return 'paylaşımınızı bəyəndi';
      case 'comment':
        return 'paylaşımınıza şərh yazdı';
      case 'follow':
        return 'sizi izləməyə başladı';
      default:
        return 'yeni hərəkət etdi';
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-400" /> Bildirişlər
          </h2>
          <p className="text-xs text-gray-400">Son bəyənmələr, şərhlər və izləyicilər</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 bg-[#161224] rounded-2xl border border-purple-900/30 p-8">
          <Bell className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-200">Hələ heç bir bildiriş yoxdur</p>
          <p className="text-xs text-gray-500 mt-1">
            Biri paylaşımınızı bəyəndikdə və ya sizi izlədikdə burada görünəcək.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const sender = n.sender as any;
            return (
              <div
                key={n.id}
                onClick={() => sender?.id && onSelectUser(sender.id)}
                className={`p-3.5 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-all hover:border-purple-700/60 ${
                  !n.is_read
                    ? 'bg-purple-950/30 border-purple-700/50'
                    : 'bg-[#161224] border-purple-900/30'
                }`}
              >
                <div className="relative">
                  {sender?.avatar_url ? (
                    <img
                      src={sender.avatar_url}
                      alt={sender.username}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-purple-800 text-white font-bold flex items-center justify-center text-xs">
                      {sender?.username ? sender.username.substring(0, 2).toUpperCase() : 'AZ'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 p-1 bg-[#161224] rounded-full">
                    {renderIcon(n.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-200">
                    <span className="font-semibold text-purple-300 mr-1">
                      @{sender?.username || 'user'}
                    </span>
                    {getActionText(n.type)}
                  </p>
                  <span className="text-[10px] text-gray-500">
                    {new Date(n.created_at).toLocaleDateString('az-AZ', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
