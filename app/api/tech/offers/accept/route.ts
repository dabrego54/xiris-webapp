import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

interface AcceptOfferPayload {
  offerId?: string;
}

function isOfferExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() <= Date.now();
}

export async function POST(request: Request) {
  let body: AcceptOfferPayload;

  try {
    body = (await request.json()) as AcceptOfferPayload;
  } catch (error) {
    console.error('Cuerpo inválido en /api/tech/offers/accept', error);
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
  }

  if (!body.offerId || typeof body.offerId !== 'string') {
    return NextResponse.json({ error: 'offerId es requerido.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('No se pudo obtener la sesión en /api/tech/offers/accept.', userError);
      return NextResponse.json({ error: 'No se pudo validar la sesión.' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const serviceRoleClient = getSupabaseServiceRoleClient();

    const { data: offer, error: offerError } = await serviceRoleClient
      .from('service_request_offers')
      .select('*')
      .eq('id', body.offerId)
      .maybeSingle();

    if (offerError) {
      console.error('Error al obtener la oferta', offerError);
      return NextResponse.json({ error: 'No se pudo validar la oferta.' }, { status: 500 });
    }

    if (!offer) {
      return NextResponse.json({ error: 'Oferta no encontrada.' }, { status: 404 });
    }

    if (offer.technician_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    if (offer.status !== 'pending') {
      return NextResponse.json({ ok: false, reason: 'offer_not_pending' });
    }

    if (isOfferExpired(offer.expires_at)) {
      await serviceRoleClient.from('service_request_offers').update({ status: 'rejected' }).eq('id', offer.id);
      return NextResponse.json({ ok: false, reason: 'offer_expired' });
    }

    const { data: serviceRequest, error: serviceRequestError } = await serviceRoleClient
      .from('service_requests')
      .select('id, assigned_technician_id, status')
      .eq('id', offer.service_request_id)
      .maybeSingle();

    if (serviceRequestError) {
      console.error('Error al leer service_request asociado.', serviceRequestError);
      return NextResponse.json({ error: 'No se pudo procesar la oferta.' }, { status: 500 });
    }

    if (!serviceRequest) {
      await serviceRoleClient.from('service_request_offers').update({ status: 'rejected' }).eq('id', offer.id);
      return NextResponse.json({ ok: false, reason: 'service_unavailable' });
    }

    const { data: updatedRequests, error: updateError } = await serviceRoleClient
      .from('service_requests')
      .update({
        assigned_technician_id: user.id,
        status: 'candidate_ready',
      })
      .eq('id', serviceRequest.id)
      .is('assigned_technician_id', null)
      .in('status', ['requested', 'searching', 'candidate_ready'])
      .select('id');

    if (updateError) {
      console.error('Error al asignar service_request.', updateError);
      return NextResponse.json({ error: 'No se pudo asignar el servicio.' }, { status: 500 });
    }

    const wasAssigned = Array.isArray(updatedRequests) && updatedRequests.length === 1;

    if (!wasAssigned) {
      await serviceRoleClient.from('service_request_offers').update({ status: 'rejected' }).eq('id', offer.id);
      return NextResponse.json({ ok: false, reason: 'service_unavailable' });
    }

    const { error: offerUpdateError } = await serviceRoleClient
      .from('service_request_offers')
      .update({ status: 'accepted' })
      .eq('id', offer.id);

    if (offerUpdateError) {
      console.error('No se pudo actualizar la oferta a aceptada.', offerUpdateError);
      return NextResponse.json({ error: 'No se pudo confirmar la oferta.' }, { status: 500 });
    }

    const { error: statusError } = await serviceRoleClient.from('technician_status').upsert({
      technician_id: user.id,
      current_status: 'busy',
      is_online: true,
    });

    if (statusError) {
      console.error('No se pudo actualizar technician_status a busy.', statusError);
      return NextResponse.json({ error: 'No se pudo actualizar el estado del técnico.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error inesperado al aceptar oferta.', error);
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 });
  }
}
