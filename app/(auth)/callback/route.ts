import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const code = searchParams.get('code');
  if (!code) {
    console.error('Supabase OAuth callback missing code parameter.');

    const errorUrl = new URL('/auth/error', url.origin);
    errorUrl.searchParams.set('message', 'missing_code');

    return NextResponse.redirect(errorUrl);
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Failed to exchange OAuth code for Supabase session.', error);

      const errorUrl = new URL('/auth/error', url.origin);
      errorUrl.searchParams.set('message', error.message ?? 'exchange_failed');

      return NextResponse.redirect(errorUrl);
    }

    const nextParam = searchParams.get('next');
    let redirectPath = '/dashboard';

    if (nextParam) {
      try {
        const nextUrl = new URL(nextParam, url.origin);

        if (nextUrl.origin === url.origin) {
          redirectPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
        } else {
          console.warn('Blocked OAuth redirect to different origin.', {
            requested: nextParam,
            resolvedOrigin: nextUrl.origin,
          });
        }
      } catch (parseError) {
        console.warn('Invalid next parameter in Supabase OAuth callback.', {
          requested: nextParam,
          error: parseError,
        });
      }
    }

    const destinationUrl = new URL(redirectPath, url.origin);

    return NextResponse.redirect(destinationUrl);
  } catch (error) {
    console.error('Unexpected error during Supabase OAuth callback handling.', error);

    const errorUrl = new URL('/auth/error', url.origin);
    const message = error instanceof Error ? error.message : 'unknown_error';
    errorUrl.searchParams.set('message', message);

    return NextResponse.redirect(errorUrl);
  }
}
