import {
  createBrowserClient as createSsrBrowserClient,
  createServerClient as createSsrServerClient,
  type CookieOptions as SsrCookieOptions,
} from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';

export type CookieOptions = SsrCookieOptions;

type CookieRecord = { name: string; value: string; options?: CookieOptions };

type CookieAdapter = {
  get?: (name: string) => string | undefined;
  set?: (name: string, value: string, options?: CookieOptions) => void;
  remove?: (name: string, options?: CookieOptions) => void;
  getAll?: () => CookieRecord[];
  setAll?: (cookies: CookieRecord[]) => void;
};

function toCookieArray(adapter: CookieAdapter): CookieRecord[] {
  return adapter.getAll?.() ?? [];
}

function applyCookies(adapter: CookieAdapter, cookies: CookieRecord[]): void {
  if (adapter.setAll) {
    adapter.setAll(cookies);
    return;
  }

  cookies.forEach(({ name, value, options }) => {
    if (options?.maxAge === 0) {
      adapter.remove?.(name, options);
    } else {
      adapter.set?.(name, value, options);
    }
  });
}

export function createServerClient<Database = unknown>(
  supabaseUrl: string,
  supabaseAnonKey: string,
  config: { cookies: CookieAdapter },
): SupabaseClient<Database> {
  return createSsrServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return toCookieArray(config.cookies);
      },
      setAll(cookiesToSet) {
        applyCookies(config.cookies, cookiesToSet);
      },
    },
  });
}

export function createBrowserClient<Database = unknown>(
  supabaseUrl: string,
  supabaseAnonKey: string,
): SupabaseClient<Database> {
  return createSsrBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

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
      get(name) {
        return req.cookies.get(name)?.value;
      },
      getAll() {
        return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      set(name, value, options) {
        req.cookies.set({ name, value, ...options });
        res.cookies.set({ name, value, ...options });
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          req.cookies.set({ name, value, ...options });
          res.cookies.set({ name, value, ...options });
        });
      },
      remove(name, options) {
        req.cookies.delete(name);
        res.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });
}
