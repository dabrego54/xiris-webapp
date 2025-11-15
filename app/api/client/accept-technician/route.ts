import { NextResponse } from 'next/server';

import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const payload = await request.json().catch(() => null);

    if (!payload || typeof payload.serviceRequestId !== 'string') {
      return NextResponse.json({ error: 'Se requiere el ID de la solicitud.' }, { status: 400 });
    }

    const serviceRoleClient = getSupabaseServiceRoleClient();

    const { data: serviceRequest, error: serviceRequestError } = await serviceRoleClient
      .from('service_requests')
      .select('id, client_id, status, assigned_technician_id')
      .eq('id', payload.serviceRequestId)
      .maybeSingle();

    if (serviceRequestError) {
      console.error('No se pudo cargar la solicitud para aceptar el técnico.', serviceRequestError);
      return NextResponse.json({ error: 'No se pudo actualizar la solicitud.' }, { status: 500 });
    }

    if (!serviceRequest || serviceRequest.client_id !== user.id) {
      return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
    }

    if (serviceRequest.status !== 'candidate_ready') {
      return NextResponse.json({ error: 'No hay un técnico listo para confirmar.' }, { status: 400 });
    }

    const { data: acceptedOffer, error: offerError } = await serviceRoleClient
      .from('service_request_offers')
      .select('id, technician_id, status')
      .eq('service_request_id', payload.serviceRequestId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (offerError) {
      console.error('No se pudo consultar la oferta aceptada por el técnico.', offerError);
      return NextResponse.json({ error: 'No se encontró una oferta activa.' }, { status: 500 });
    }

    if (!acceptedOffer) {
      return NextResponse.json({ error: 'No hay un técnico listo para confirmar.' }, { status: 400 });
    }

    if (
      !serviceRequest.assigned_technician_id ||
      serviceRequest.assigned_technician_id !== acceptedOffer.technician_id
    ) {
      return NextResponse.json({ error: 'El técnico ya no está disponible.' }, { status: 400 });
    }

    const { error: updateRequestError } = await serviceRoleClient
      .from('service_requests')
      .update({ status: 'accepted' })
      .eq('id', payload.serviceRequestId)
      .eq('status', 'candidate_ready');

    if (updateRequestError) {
      console.error('No se pudo marcar la solicitud como aceptada por el cliente.', updateRequestError);
      return NextResponse.json({ error: 'No se pudo aceptar al técnico.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error inesperado al aceptar al técnico.', error);
    return NextResponse.json({ error: 'No se pudo aceptar al técnico.' }, { status: 500 });
  }
}
