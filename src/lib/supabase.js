import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!url || !key) {
  console.warn('[supabase] Missing env vars — VITE_SUPABASE_URL:', !!url, 'VITE_SUPABASE_ANON_KEY:', !!key);
}

export const supabase = url && key ? createClient(url, key) : null;
