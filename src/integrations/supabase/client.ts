import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Shared Supabase project CULTURA-GH. All tables of this app use the neo_ prefix.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ktqmwpbzcnzkhjskqisy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q';

export const STORAGE_BUCKET = 'neo-gallery-images';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
