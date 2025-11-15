import { NextResponse } from 'next/server';

import { matchRequest } from '@/lib/matchmaking/matchRequest';
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
      console.error('No se pudo cargar la solicitud para rechazar el técnico.', serviceRequestError);
      return NextResponse.json({ error: 'No se pudo actualizar la solicitud.' }, { status: 500 });
    }

    if (!serviceRequest || serviceRequest.client_id !== user.id) {
      return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
    }

    const { data: latestOffer, error: offerError } = await serviceRoleClient
      .from('service_request_offers')
      .select('id, technician_id, status')
      .eq('service_request_id', payload.serviceRequestId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (offerError) {
      console.error('No se pudo consultar la oferta activa.', offerError);
      return NextResponse.json({ error: 'No se encontró una oferta de técnico.' }, { status: 500 });
    }

    if (!latestOffer) {
      return NextResponse.json({ error: 'No hay un técnico pendiente de rechazar.' }, { status: 400 });
    }

    const { error: rejectError } = await serviceRoleClient
      .from('service_request_offers')
      .update({ status: 'rejected' })
      .eq('id', latestOffer.id);

    if (rejectError) {
      console.error('No se pudo rechazar la oferta del técnico.', rejectError);
      return NextResponse.json({ error: 'No se pudo rechazar al técnico.' }, { status: 500 });
    }

    if (latestOffer.status === 'accepted') {
      const [{ error: requestResetError }, { error: technicianStatusError }] = await Promise.all([
        serviceRoleClient
          .from('service_requests')
          .update({ status: 'searching', assigned_technician_id: null })
          .eq('id', payload.serviceRequestId)
          .eq('status', 'candidate_ready'),
        serviceRoleClient
          .from('technician_status')
          .update({ current_status: 'available' })
          .eq('technician_id', latestOffer.technician_id),
      ]);

      if (requestResetError) {
        console.error('No se pudo reiniciar la solicitud tras el rechazo del cliente.', requestResetError);
        return NextResponse.json({ error: 'No se pudo continuar con la búsqueda.' }, { status: 500 });
      }

      if (technicianStatusError) {
        console.error('No se pudo actualizar el estado del técnico rechazado.', technicianStatusError);
        return NextResponse.json({ error: 'No se pudo actualizar el estado del técnico.' }, { status: 500 });
      }
    }

    const { data: offerHistory, error: historyError } = await serviceRoleClient
      .from('service_request_offers')
      .select('technician_id')
      .eq('service_request_id', payload.serviceRequestId);

    if (historyError) {
      console.error('No se pudo consultar el historial de ofertas.', historyError);
      return NextResponse.json({ error: 'No se pudo continuar con la búsqueda.' }, { status: 500 });
    }

    const excludeTechnicians = offerHistory?.map((offer) => offer.technician_id) ?? [];

    await matchRequest(serviceRoleClient, payload.serviceRequestId, { excludeTechnicians });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error inesperado al rechazar al técnico.', error);
    return NextResponse.json({ error: 'No se pudo rechazar al técnico.' }, { status: 500 });
  }
}
