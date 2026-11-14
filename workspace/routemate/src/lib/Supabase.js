import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client.
 *
 * Only the PUBLIC anon (a.k.a. "publishable") key belongs in the browser —
 * Row Level Security in supabase/schema.sql is what protects the data.
 * NEVER put the service_role key in a VITE_ variable: everything VITE_ is
 * shipped to every visitor.
 *
 * If the env vars are missing the app keeps running on the local mock data
 * layer (services/api.js), so it still installs and runs with no setup.
 */
const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase = isSupabaseConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

  if (!isSupabaseConfigured) {
    console.warn('Supabase env vars not found. Running in DEMO mode (localStorage, fake logins).');
  }