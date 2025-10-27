import { createServerClient, type CookieOptions } from '@supabase/auth-helpers-nextjs';
import type { Session } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import type { SupabaseDatabase } from './types';

export type UpdateSessionResult = {
  response: NextResponse;
  session: Session | null;
};

/**
 * Synchronises the Supabase session during middleware execution to keep
 * authentication cookies fresh on the client.
 */
export async function updateSession(request: NextRequest): Promise<UpdateSessionResult> {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'Supabase environment variables are not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
    return { response, session: null };
  }

  const supabase = createServerClient<SupabaseDatabase>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options?: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        });
      },
      remove(name: string, options?: CookieOptions) {
        request.cookies.delete(name);
        response.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Unable to retrieve Supabase session in middleware.', error);
      return { response, session: null };
    }

    return { response, session };
  } catch (error) {
    console.error('Unexpected error while refreshing the Supabase session.', error);
    return { response, session: null };
  }
}
