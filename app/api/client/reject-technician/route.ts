import { NextResponse } from 'next/server';

import { matchRequest } from '@/lib/matchmaking/matchRequest';
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

    const { data: serviceRequest, error: serviceRequestError } = await supabase
      .from('service_requests')
      .select('id, client_id')
      .eq('id', payload.serviceRequestId)
      .maybeSingle();

    if (serviceRequestError) {
      console.error('No se pudo cargar la solicitud para rechazar el técnico.', serviceRequestError);
      return NextResponse.json({ error: 'No se pudo actualizar la solicitud.' }, { status: 500 });
    }

    if (!serviceRequest || serviceRequest.client_id !== user.id) {
      return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
    }

    const { data: pendingOffer, error: offerError } = await supabase
      .from('service_request_offers')
      .select('id, technician_id')
      .eq('service_request_id', payload.serviceRequestId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (offerError) {
      console.error('No se pudo consultar la oferta pendiente.', offerError);
      return NextResponse.json({ error: 'No se encontró una oferta de técnico.' }, { status: 500 });
    }

    if (!pendingOffer) {
      return NextResponse.json({ error: 'No hay un técnico pendiente de rechazar.' }, { status: 400 });
    }

    const { error: rejectError } = await supabase
      .from('service_request_offers')
      .update({ status: 'rejected' })
      .eq('id', pendingOffer.id);

    if (rejectError) {
      console.error('No se pudo rechazar la oferta del técnico.', rejectError);
      return NextResponse.json({ error: 'No se pudo rechazar al técnico.' }, { status: 500 });
    }

    const { data: offerHistory, error: historyError } = await supabase
      .from('service_request_offers')
      .select('technician_id')
      .eq('service_request_id', payload.serviceRequestId);

    if (historyError) {
      console.error('No se pudo consultar el historial de ofertas.', historyError);
      return NextResponse.json({ error: 'No se pudo continuar con la búsqueda.' }, { status: 500 });
    }

    const excludeTechnicians = offerHistory?.map((offer) => offer.technician_id) ?? [];

    await matchRequest(supabase, payload.serviceRequestId, { excludeTechnicians });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error inesperado al rechazar al técnico.', error);
    return NextResponse.json({ error: 'No se pudo rechazar al técnico.' }, { status: 500 });
  }
}
