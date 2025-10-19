import { createServerClient, type SupabaseClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { SupabaseDatabase } from './types';

/**
 * Creates a Supabase client scoped to the current request cycle for server
 * components, route handlers and server actions.
 */
export function createClient(): SupabaseClient<SupabaseDatabase> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase environment variables are not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  const cookieStore = cookies();

  return createServerClient<SupabaseDatabase>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((cookie) => {
          try {
            cookieStore.set(cookie);
          } catch (error) {
            // In certain environments (e.g. Edge during static rendering) the
            // cookies interface can be read-only. We swallow the error so that
            // rendering can continue without breaking the request lifecycle.
            console.warn('Unable to set Supabase auth cookie on the server.', error);
          }
        });
      },
    },
  });
}
