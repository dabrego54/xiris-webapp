import { createServerClient, type SupabaseClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';
import type { SupabaseDatabase } from '@/lib/supabase/types';
import type { UserType } from '@/types/database.types';

const PUBLIC_PATHS = [
  /^\/$/,
  /^\/auth(?:\/.*)?$/,
  /^\/api\/public(?:\/.*)?$/,
  /^\/_next(?:\/.*)?$/,
  /^\/favicon\.ico$/,
];

const PROTECTED_PATHS = [/^\/dashboard(?:\/.*)?$/, /^\/perfil(?:\/.*)?$/, /^\/servicios(?:\/.*)?$/];

const DASHBOARD_TECHNICIAN_PATH = /^\/dashboard\/tecnico(?:\/.*)?$/;
const DASHBOARD_CLIENT_PATH = /^\/dashboard\/cliente(?:\/.*)?$/;
const DASHBOARD_ROOT_PATH = /^\/dashboard\/?$/;

/**
 * Determines if the incoming request targets a public route.
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((pattern) => pattern.test(pathname));
}

/**
 * Checks whether the route requires an authenticated user.
 */
function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((pattern) => pattern.test(pathname));
}

/**
 * Ensures cookies set during the session refresh are preserved when
 * responding with a redirect.
 */
function applyAuthCookies(source: NextResponse, target: NextResponse): void {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

/**
 * Creates a Supabase client instance bound to the current middleware request.
 */
function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse
): SupabaseClient<SupabaseDatabase> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'Supabase environment variables are not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
    return null;
  }

  return createServerClient<SupabaseDatabase>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((cookie) => {
          request.cookies.set(cookie);
          response.cookies.set(cookie);
        });
      },
    },
  });
}

/**
 * Fetches the authenticated user's profile to determine their role.
 */
async function getUserType(
  request: NextRequest,
  response: NextResponse,
  userId: string
): Promise<UserType | null> {
  const supabase = createSupabaseMiddlewareClient(request, response);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('No se pudo obtener el tipo de usuario del perfil.', error);
    return null;
  }

  return data?.user_type ?? null;
}

/**
 * Genera una respuesta de redirección conservando los parámetros de búsqueda.
 */
function redirectWithSearch(
  request: NextRequest,
  sourceResponse: NextResponse,
  destinationPath: string
): NextResponse {
  const redirectUrl = new URL(destinationPath, request.url);
  redirectUrl.search = request.nextUrl.search;
  const redirectResponse = NextResponse.redirect(redirectUrl);
  applyAuthCookies(sourceResponse, redirectResponse);
  return redirectResponse;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { response, session } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    // Usuarios autenticados que acceden a rutas públicas de autenticación son
    // redirigidos inmediatamente a su panel principal.
    if (session && pathname.startsWith('/auth')) {
      return redirectWithSearch(request, response, '/dashboard');
    }

    return response;
  }

  const requiresAuthentication = isProtectedPath(pathname);

  if (requiresAuthentication && !session) {
    const loginUrl = new URL('/auth/login', request.url);
    const redirectPath = `${pathname}${search}`;
    loginUrl.searchParams.set('redirect', redirectPath || '/');
    const redirectResponse = NextResponse.redirect(loginUrl);
    applyAuthCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (!session) {
    return response;
  }

  const needsUserTypeValidation =
    DASHBOARD_ROOT_PATH.test(pathname) ||
    DASHBOARD_TECHNICIAN_PATH.test(pathname) ||
    DASHBOARD_CLIENT_PATH.test(pathname);

  const userType = needsUserTypeValidation
    ? await getUserType(request, response, session.user.id)
    : null;

  if (DASHBOARD_ROOT_PATH.test(pathname) && userType) {
    const targetDashboard = userType === 'tecnico' ? '/dashboard/tecnico' : '/dashboard/cliente';
    return redirectWithSearch(request, response, targetDashboard);
  }

  if (DASHBOARD_TECHNICIAN_PATH.test(pathname) && userType && userType !== 'tecnico') {
    return redirectWithSearch(request, response, '/dashboard/cliente');
  }

  if (DASHBOARD_CLIENT_PATH.test(pathname) && userType && userType !== 'cliente') {
    return redirectWithSearch(request, response, '/dashboard/tecnico');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
