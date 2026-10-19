import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment or runtime config
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Allow runtime override via localStorage for demo / test setups
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('azgram_supabase_url') : null;
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('azgram_supabase_anon_key') : null;

export const supabaseUrl = storedUrl || envUrl || 'https://zsrkijbvsfczaspxppkj.supabase.co';
export const supabaseAnonKey = storedKey || envKey || '';

export const isSupabaseConfigured = () => {
  return (
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 20
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey || 'anon-key-placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
