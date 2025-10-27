import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';

interface MiddlewareClientConfig {
  req: NextRequest;
  res: NextResponse;
}

function assertSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return { url, anonKey };
}

export function createMiddlewareClient<Database = unknown>(
  config: MiddlewareClientConfig,
): SupabaseClient<Database> {
  const { req, res } = config;
  const { url, anonKey } = assertSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options?: CookieOptions) {
        res.cookies.set(name, value, options);
      },
      remove(name: string) {
        res.cookies.delete(name);
      },
    },
  });
}
