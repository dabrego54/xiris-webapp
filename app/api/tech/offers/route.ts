import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

export interface TechnicianOfferResponse {
  offerId: string;
  serviceRequestId: string;
  createdAt: string;
  expiresAt: string | null;
  problemDescription: string | null;
  serviceRequestStatus: string | null;
  location: {
    lat: number;
    lng: number;
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('Error al obtener el usuario en /api/tech/offers', userError);
      return NextResponse.json({ error: 'No se pudo validar la sesión.' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const nowIso = new Date().toISOString();

    const { data: offers, error: offersError } = await supabase
      .from('service_request_offers')
      .select('id, service_request_id, created_at, expires_at')
      .eq('technician_id', user.id)
      .eq('status', 'pending')
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false });

    if (offersError) {
      console.error('Error al leer service_request_offers.', offersError);
      return NextResponse.json({ error: 'No se pudieron obtener las ofertas.' }, { status: 500 });
    }

    if (!offers || offers.length === 0) {
      return NextResponse.json([] satisfies TechnicianOfferResponse[]);
    }

    const serviceRequestIds = offers.map((offer) => offer.service_request_id);

    const serviceRoleClient = getSupabaseServiceRoleClient();

    const { data: serviceRequests, error: serviceRequestsError } = await serviceRoleClient
      .from('service_requests')
      .select('id, problem_description, location_lat, location_lng, status')
      .in('id', serviceRequestIds);

    if (serviceRequestsError) {
      console.error('Error al leer service_requests.', serviceRequestsError);
      return NextResponse.json({ error: 'No se pudo obtener información adicional.' }, { status: 500 });
    }

    const requestMap = new Map(serviceRequests?.map((request) => [request.id, request]));

    const payload: TechnicianOfferResponse[] = offers.map((offer) => {
      const request = requestMap.get(offer.service_request_id);

      if (!request) {
        console.warn(
          '[api/tech/offers] No se encontró service_request para la oferta',
          offer.id,
          'con service_request_id',
          offer.service_request_id
        );
      }

      return {
        offerId: offer.id,
        serviceRequestId: offer.service_request_id,
        createdAt: offer.created_at,
        expiresAt: offer.expires_at,
        problemDescription: request?.problem_description ?? null,
        serviceRequestStatus: request?.status ?? null,
        location: {
          lat: request?.location_lat ?? 0,
          lng: request?.location_lng ?? 0,
        },
      } satisfies TechnicianOfferResponse;
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Unexpected error en /api/tech/offers', error);
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 });
  }
}
