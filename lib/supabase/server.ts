import { createServerClient, type CookieOptions } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import type { SupabaseDatabase } from './types';

/**
 * Creates a Supabase client scoped to the current request cycle for server
 * components, route handlers and server actions.
 */
export async function createClient(): Promise<SupabaseClient<SupabaseDatabase>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase environment variables are not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  const cookieStore = await cookies();
  const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL?.replace(/\/$/, "");

  return createServerClient<SupabaseDatabase>(supabaseUrl, supabaseAnonKey, {
    ...(functionsUrl ? { functions: { url: functionsUrl } } : {}),
    cookies: {
      getAll() {
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
      },
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // In certain environments (e.g. Edge during static rendering) the
          // cookies interface can be read-only. We swallow the error so that
          // rendering can continue without breaking the request lifecycle.
          console.warn('Unable to set Supabase auth cookie on the server.', error);
        }
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.warn('Unable to batch set Supabase auth cookies on the server.', error);
          }
        });
      },
      remove(name: string, options?: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        } catch (error) {
          console.warn('Unable to remove Supabase auth cookie on the server.', error);
        }
      },
    },
  });
}
