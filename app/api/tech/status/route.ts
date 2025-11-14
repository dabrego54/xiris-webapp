import { createServerClient, type CookieOptions } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import type { SupabaseDatabase } from '@/lib/supabase/types';
import type { TechnicianPresenceStatus } from '@/types/database.types';

type StatusPayload = {
  isOnline: boolean;
  currentStatus: TechnicianPresenceStatus;
  lat: number | null;
  lng: number | null;
};

const ALLOWED_STATUSES = new Set<TechnicianPresenceStatus>(['offline', 'available', 'busy']);

function isValidCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  const cookieStore = await cookies();

  return createServerClient<SupabaseDatabase>(supabaseUrl, supabaseAnonKey, {
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

export async function POST(request: Request) {
  let payload: StatusPayload;

  try {
    payload = (await request.json()) as StatusPayload;
  } catch (error) {
    console.error('Invalid JSON body for /api/tech/status.', error);
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (typeof payload.isOnline !== 'boolean') {
    return NextResponse.json({ error: 'isOnline debe ser booleano.' }, { status: 400 });
  }

  if (!ALLOWED_STATUSES.has(payload.currentStatus)) {
    return NextResponse.json({ error: 'currentStatus no es válido.' }, { status: 400 });
  }

  if (!payload.isOnline && payload.currentStatus !== 'offline') {
    return NextResponse.json({ error: 'Si estás offline, currentStatus debe ser "offline".' }, { status: 400 });
  }

  const latIsValid = payload.lat === null || isValidCoordinate(payload.lat);
  const lngIsValid = payload.lng === null || isValidCoordinate(payload.lng);

  if (!latIsValid || !lngIsValid) {
    return NextResponse.json({ error: 'Las coordenadas no son válidas.' }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('Unable to read session for /api/tech/status.', userError);
      return NextResponse.json({ error: 'No se pudo validar la sesión.' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { error } = await supabase.from('technician_status').upsert({
      technician_id: user.id,
      is_online: payload.isOnline,
      current_status: payload.currentStatus,
      current_lat: payload.lat,
      current_lng: payload.lng,
    });

    if (error) {
      console.error('Unable to update technician_status.', error);
      return NextResponse.json({ error: 'No se pudo guardar el estado.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Unexpected error while updating technician status.', error);
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 });
  }
}
