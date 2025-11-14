import { NextResponse } from 'next/server';

import { matchRequest } from '@/lib/matchmaking/matchRequest';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('No se pudo leer el usuario en create-request.', userError);
    }

    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const payload = await request.json().catch(() => null);

    if (!payload || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
      return NextResponse.json({ error: 'La ubicación del cliente es obligatoria.' }, { status: 400 });
    }

    const problemDescription =
      typeof payload.problemDescription === 'string'
        ? payload.problemDescription
        : 'Problema reportado desde el dashboard';

    const { data, error } = await supabase
      .from('service_requests')
      .insert({
        client_id: user.id,
        problem_description: problemDescription,
        location_lat: payload.lat,
        location_lng: payload.lng,
        status: 'requested',
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('No se pudo crear la solicitud de servicio.', error);
      return NextResponse.json({ error: 'No se pudo crear la solicitud.' }, { status: 500 });
    }

    await matchRequest(supabase, data.id);

    return NextResponse.json({ ok: true, serviceRequestId: data.id });
  } catch (error) {
    console.error('Error inesperado en create-request.', error);
    return NextResponse.json({ error: 'Ocurrió un error al crear la solicitud.' }, { status: 500 });
  }
}
