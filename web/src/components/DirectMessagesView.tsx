import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Search, 
  MessageSquare, 
  ArrowLeft, 
  User as UserIcon, 
  Loader2, 
  Plus
} from 'lucide-react';
import { Conversation, Message, Profile } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface DirectMessagesViewProps {
  initialChatUserId?: string;
  onViewProfile: (userId: string) => void;
}

export const DirectMessagesView: React.FC<DirectMessagesViewProps> = ({
  initialChatUserId,
  onViewProfile,
}) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [loadingConv, setLoadingConv] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  // New chat modal
  const [showNewChatModal, setShowNewChatModal] = useState<boolean>(false);
  const [searchUserQuery, setSearchUserQuery] = useState<string>('');
  const [searchedUsers, setSearchedUsers] = useState<Profile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch all conversations for current user
  const fetchConversations = async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoadingConv(false);
      return;
    }

    try {
      // 1. Get conversation IDs where user is member
      const { data: memberRows, error: memberErr } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (memberErr) throw memberErr;
      const convIds = (memberRows || []).map((m) => m.conversation_id);

      if (convIds.length === 0) {
        setConversations([]);
        setLoadingConv(false);
        return;
      }

      // 2. Get members of these conversations
      const { data: allMembers, error: allMemErr } = await supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          user_id,
          profiles (id, username, display_name, avatar_url)
        `)
        .in('conversation_id', convIds);

      if (allMemErr) throw allMemErr;

      // Group partners by conversation
      const convList: Conversation[] = convIds.map((cId) => {
        const partners = (allMembers || [])
          .filter((m) => m.conversation_id === cId && m.user_id !== user.id)
          .map((m) => m.profiles as unknown as Profile)
          .filter(Boolean);

        return {
          id: cId,
          created_at: '',
          updated_at: '',
          members: partners,
        };
      });

      setConversations(convList);

      // Auto-open first conversation or initialChatUserId
      if (!selectedConv && convList.length > 0) {
        setSelectedConv(convList[0]);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingConv(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  // Load messages for selected conversation
  const loadMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          media_url,
          is_read,
          created_at,
          profiles!messages_sender_id_fkey (id, username, display_name, avatar_url)
        `)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as unknown as Message[]) || []);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);

      // Realtime subscription for incoming messages
      const channel = supabase
        .channel(`messages_${selectedConv.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConv.id}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => [...prev, newMsg]);
            setTimeout(scrollToBottom, 100);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConv]);

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConv || !newMessage.trim() || sending) return;

    setSending(true);
    const contentToSend = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConv.id,
        sender_id: user.id,
        content: contentToSend,
      });

      if (error) throw error;
    } catch (err: any) {
      alert(err.message || 'Mesaj göndərilmədi');
    } finally {
      setSending(false);
    }
  };

  // Search users for new conversation
  const handleSearchUsers = async (q: string) => {
    setSearchUserQuery(q);
    if (!q.trim() || !user) {
      setSearchedUsers([]);
      return;
    }

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(10);

      setSearchedUsers((data as Profile[]) || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Start chat with user
  const startConversationWithUser = async (targetUser: Profile) => {
    if (!user) return;
    try {
      // 1. Create conversation record
      const { data: convData, error: convErr } = await supabase
        .from('conversations')
        .insert({})
        .select('id')
        .single();

      if (convErr) throw convErr;

      // 2. Add members
      await supabase.from('conversation_members').insert([
        { conversation_id: convData.id, user_id: user.id },
        { conversation_id: convData.id, user_id: targetUser.id },
      ]);

      const newC: Conversation = {
        id: convData.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        members: [targetUser],
      };

      setConversations([newC, ...conversations]);
      setSelectedConv(newC);
      setShowNewChatModal(false);
    } catch (err: any) {
      alert(err.message || 'Söhbət başladılmadı');
    }
  };

  const partner = selectedConv?.members?.[0];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="bg-[#161224] border border-purple-900/30 rounded-3xl overflow-hidden shadow-2xl h-[78vh] flex">
        {/* Left Side: Conversations List */}
        <div
          className={`w-full sm:w-80 border-r border-purple-900/30 flex flex-col ${
            selectedConv ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-purple-900/30 flex items-center justify-between">
            <h3 className="font-bold text-gray-100 flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-purple-400" /> {t('direct_title')}
            </h3>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800 text-purple-200"
              title="Yeni söhbət"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingConv ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-400 px-4">
                {t('no_messages_yet')}
              </div>
            ) : (
              conversations.map((c) => {
                const chatPartner = c.members?.[0];
                const isSelected = selectedConv?.id === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConv(c)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-600/20 border border-purple-600/40'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {chatPartner?.avatar_url ? (
                      <img
                        src={chatPartner.avatar_url}
                        alt="Avatar"
                        className="w-11 h-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-purple-800 text-white font-bold flex items-center justify-center text-xs">
                        {chatPartner?.username ? chatPartner.username.substring(0, 2).toUpperCase() : 'AZ'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-gray-100 truncate">
                        {chatPartner?.display_name || chatPartner?.username || 'İstifadəçi'}
                      </h4>
                      <p className="text-[11px] text-gray-400 truncate">
                        @{chatPartner?.username || 'azgram'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Chat Window */}
        <div
          className={`flex-1 flex flex-col bg-[#100d1c] ${
            !selectedConv ? 'hidden sm:flex items-center justify-center' : 'flex'
          }`}
        >
          {selectedConv && partner ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 border-b border-purple-900/30 flex items-center justify-between bg-[#161224]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConv(null)}
                    className="sm:hidden p-1 text-gray-400 hover:text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div
                    onClick={() => onViewProfile(partner.id)}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    {partner.avatar_url ? (
                      <img
                        src={partner.avatar_url}
                        alt="Avatar"
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center text-xs">
                        {partner.username.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-gray-100 group-hover:text-purple-300 transition-colors">
                        {partner.display_name}
                      </h4>
                      <p className="text-[10px] text-gray-400">@{partner.username}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-500">
                    Söhbətə ilk mesajı yazın 👋
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-md leading-relaxed ${
                            isMe
                              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-br-none'
                              : 'bg-[#1e1833] text-gray-200 border border-purple-900/40 rounded-bl-none'
                          }`}
                        >
                          <p>{m.content}</p>
                          <span
                            className={`block text-[9px] mt-1 text-right ${
                              isMe ? 'text-purple-200' : 'text-gray-400'
                            }`}
                          >
                            {new Date(m.created_at).toLocaleTimeString('az-AZ', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-purple-900/30 flex items-center gap-2 bg-[#161224]">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('write_message')}
                  className="flex-1 bg-[#100d1c] border border-purple-800/40 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition-colors shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="text-center p-8 text-gray-400">
              <MessageSquare className="w-12 h-12 text-purple-400/40 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-gray-200 mb-1">Mesaj seçin</h4>
              <p className="text-xs text-gray-500">
                Sol tərəfdən söhbət seçin və ya yeni söhbətə başlayın.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161224] border border-purple-800/40 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <h4 className="font-bold text-gray-100 text-sm">Yeni Söhbət Başlat</h4>
              <button onClick={() => setShowNewChatModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchUserQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder="İstifadəçi axtarın..."
                autoFocus
                className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchedUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => startConversationWithUser(u)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center text-xs">
                      {u.username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-100">{u.display_name}</p>
                    <span className="text-[10px] text-gray-400">@{u.username}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
