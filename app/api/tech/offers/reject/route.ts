import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

interface RejectOfferPayload {
  offerId?: string;
}

export async function POST(request: Request) {
  let body: RejectOfferPayload;

  try {
    body = (await request.json()) as RejectOfferPayload;
  } catch (error) {
    console.error('Cuerpo inválido en /api/tech/offers/reject', error);
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
      console.error('No se pudo leer la sesión en /api/tech/offers/reject.', userError);
      return NextResponse.json({ error: 'No se pudo validar la sesión.' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { data: offer, error: offerError } = await supabase
      .from('service_request_offers')
      .select('id, technician_id, status')
      .eq('id', body.offerId)
      .maybeSingle();

    if (offerError) {
      console.error('No se pudo obtener la oferta para rechazo.', offerError);
      return NextResponse.json({ error: 'No se pudo validar la oferta.' }, { status: 500 });
    }

    if (!offer) {
      return NextResponse.json({ error: 'Oferta no encontrada.' }, { status: 404 });
    }

    if (offer.technician_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    if (offer.status === 'pending') {
      const { error: updateError } = await supabase
        .from('service_request_offers')
        .update({ status: 'rejected' })
        .eq('id', offer.id);

      if (updateError) {
        console.error('No se pudo actualizar la oferta a rechazada.', updateError);
        return NextResponse.json({ error: 'No se pudo rechazar la oferta.' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error inesperado al rechazar oferta.', error);
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 });
  }
}
