import { createBrowserClient, type SupabaseClient } from '@supabase/ssr';

import type { SupabaseDatabase } from './types';

let browserClient: SupabaseClient<SupabaseDatabase> | null = null;

/**
 * Returns a singleton instance of the Supabase browser client.
 *
 * The client lazily initializes using public environment variables to avoid
 * leaking secrets into the browser bundle. Errors are surfaced immediately to
 * highlight missing configuration during development.
 */
export function getSupabaseBrowserClient(): SupabaseClient<SupabaseDatabase> {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase environment variables are not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  browserClient = createBrowserClient<SupabaseDatabase>(supabaseUrl, supabaseAnonKey);

  return browserClient;
}
