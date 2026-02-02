import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

console.log('[Supabase] ====== INIT DEBUG ======');
console.log('[Supabase] URL value:', JSON.stringify(supabaseUrl));
console.log('[Supabase] URL length:', supabaseUrl.length);
console.log('[Supabase] Key length:', supabaseAnonKey.length);
console.log('[Supabase] Key starts with:', supabaseAnonKey.substring(0, 20));

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] ERROR: Missing environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test connection on init
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('[Supabase] Connection test FAILED:', error.message);
  } else {
    console.log('[Supabase] Connection test SUCCESS');
  }
}).catch(err => {
  console.error('[Supabase] Connection test ERROR:', err);
});
