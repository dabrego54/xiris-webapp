import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

const ACTIVE_STATUSES = ['candidate_ready', 'accepted', 'on_route', 'in_progress'];

type ActiveServiceResponse = {
  serviceRequestId: string;
  status: string;
  problemDescription: string | null;
  clientLocation: { lat: number | null; lng: number | null };
  startedAt: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('No se pudo validar la sesión del técnico.', authError);
      return NextResponse.json({ error: 'No se pudo validar la sesión.' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { data: serviceRequest, error: serviceError } = await supabase
      .from('service_requests')
      .select('id, status, problem_description, location_lat, location_lng, started_at')
      .eq('assigned_technician_id', user.id)
      .in('status', ACTIVE_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (serviceError) {
      console.error('No se pudo obtener el servicio activo del técnico.', serviceError);
      return NextResponse.json({ error: 'No se pudo obtener el servicio activo.' }, { status: 500 });
    }

    if (!serviceRequest) {
      return NextResponse.json({ service: null });
    }

    const response: ActiveServiceResponse = {
      serviceRequestId: serviceRequest.id,
      status: serviceRequest.status,
      problemDescription: serviceRequest.problem_description,
      clientLocation: {
        lat: serviceRequest.location_lat,
        lng: serviceRequest.location_lng,
      },
      startedAt: serviceRequest.started_at,
    };

    return NextResponse.json({ service: response satisfies ActiveServiceResponse });
  } catch (error) {
    console.error('Error inesperado al consultar el servicio activo del técnico.', error);
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 });
  }
}
