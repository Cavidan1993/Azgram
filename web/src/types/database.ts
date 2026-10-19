export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  website?: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  is_private?: boolean;
  created_at: string;
  updated_at: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_following?: boolean;
  follow_status?: 'accepted' | 'pending' | 'none';
}

export interface UserRole {
  user_id: string;
  role: 'user' | 'moderator' | 'admin';
  created_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  sort_order: number;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  user_has_liked?: boolean;
  user_has_saved?: boolean;
  media?: PostMedia[];
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id?: string | null;
  content: string;
  created_at: string;
  profiles?: Profile;
  replies?: Comment[];
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  status: 'accepted' | 'pending';
  created_at: string;
  profile?: Profile;
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  expires_at: string;
  created_at: string;
  profiles?: Profile;
  views_count?: number;
  has_viewed?: boolean;
}

export interface StoryView {
  id: string;
  story_id: string;
  viewer_id: string;
  created_at: string;
  viewer?: Profile;
}

export interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  caption: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  is_hidden: boolean;
  created_at: string;
  profiles?: Profile;
  user_has_liked?: boolean;
  user_has_saved?: boolean;
}

export interface SavedPost {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
  post?: Post;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message?: Message;
  members?: Profile[];
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url?: string | null;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
}

export interface Hashtag {
  id: string;
  tag: string;
  posts_count: number;
  created_at: string;
}

export interface UserBlock {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked_user?: Profile;
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message';
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
  post?: Post;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_post_id: string | null;
  reported_user_id: string | null;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  reporter?: Profile;
  post?: Post;
  user?: Profile;
}

export interface ModerationLog {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
  created_at: string;
  admin?: Profile;
}
