import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import type { Session } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import type { SupabaseDatabase } from '@/lib/supabase/types';

type RoleRule = {
  pattern: RegExp;
  role: 'admin' | 'technician';
};

const publicRoutes: RegExp[] = [
  /^\/$/,
  /^\/login(?:\/.*)?$/,
  /^\/registro(?:\/.*)?$/,
  /^\/public(?:\/.*)?$/,
  /^\/assets(?:\/.*)?$/,
  /^\/api\/public(?:\/.*)?$/,
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
];

const protectedRoutes: RegExp[] = [/^\/apply\/technician(?:\/.*)?$/];

export const roleRules: RoleRule[] = [
  { pattern: /^\/admin(\/.*)?$/, role: 'admin' },
  { pattern: /^\/api\/admin(\/.*)?$/, role: 'admin' },
  { pattern: /^\/tech(\/.*)?$/, role: 'technician' },
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((pattern) => pattern.test(pathname));
}

function requiresSession(pathname: string): boolean {
  return protectedRoutes.some((pattern) => pattern.test(pathname));
}

function matchRoleRule(pathname: string): RoleRule | null {
  return roleRules.find((rule) => rule.pattern.test(pathname)) ?? null;
}

function applyAuthCookies(source: NextResponse, target: NextResponse): void {
  source.cookies.getAll().forEach(({ name, value }) => {
    target.cookies.set(name, value);
  });
}

async function resolveUserRole(request: NextRequest, session: Session | null): Promise<string | null> {
  const metadataRole = session?.user?.app_metadata?.role;

  if (typeof metadataRole === 'string' && metadataRole.length > 0) {
    return metadataRole;
  }

  try {
    const roleResponse = await fetch(new URL('/api/me/role', request.url), {
      headers: {
        cookie: request.headers.get('cookie') ?? '',
      },
      credentials: 'include',
    });

    if (!roleResponse.ok) {
      return null;
    }

    const payload = (await roleResponse.json()) as { role?: string | null };
    return typeof payload.role === 'string' ? payload.role : null;
  } catch (error) {
    console.error('Unable to fetch user role from /api/me/role.', error);
    return null;
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient<SupabaseDatabase>({ req: request, res: response });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  if (isPublicRoute(pathname)) {
    return response;
  }

  const roleRule = matchRoleRule(pathname);
  const needsAuthentication = requiresSession(pathname) || roleRule !== null;

  if (!session && needsAuthentication) {
    const loginUrl = new URL('/login', request.url);
    const nextPath = `${pathname}${request.nextUrl.search}` || '/';
    loginUrl.searchParams.set('next', nextPath);

    const redirectResponse = NextResponse.redirect(loginUrl);
    applyAuthCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (!session) {
    return response;
  }

  if (roleRule) {
    const role = await resolveUserRole(request, session);

    if (role !== roleRule.role) {
      const forbiddenUrl = new URL('/403', request.url);
      const redirectResponse = NextResponse.redirect(forbiddenUrl);
      applyAuthCookies(response, redirectResponse);
      return redirectResponse;
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
