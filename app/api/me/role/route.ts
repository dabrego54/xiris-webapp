import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

type ProfileRole = 'client' | 'technician' | 'admin';

type RolePayload = {
  role: ProfileRole | null;
};

function buildResponse(payload: RolePayload, init?: ResponseInit): NextResponse<RolePayload> {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 's-maxage=60');

  return NextResponse.json(payload, {
    ...init,
    headers,
  });
}

export async function GET(): Promise<NextResponse<RolePayload>> {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Unable to read session for /api/me/role.', sessionError);
  }

  if (!session) {
    return buildResponse({ role: null }, { status: 401 });
  }

  type ProfileRoleRow = { role: ProfileRole | null };

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .returns<ProfileRoleRow>()
    .maybeSingle();

  if (error) {
    console.error('Unable to fetch role from profiles table.', error);
    return buildResponse({ role: null }, { status: 500 });
  }

  return buildResponse({ role: data?.role ?? null });
}
