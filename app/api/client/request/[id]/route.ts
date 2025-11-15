import { NextResponse } from 'next/server';

import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { createClient } from '@/lib/supabase/server';
import type { ServiceRequestStatus } from '@/types/database.types';

type TechnicianCandidatePayload = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  rating: number | null;
  experience: string | null;
  skills: string[] | null;
  serviceAreas: string[] | null;
  totalServices: number | null;
  isVerified: boolean | null;
  availabilityStatus: string | null;
  presenceStatus: string | null;
  isOnline: boolean | null;
  distanceLabel: string | null;
};

type ServiceRequestResponse = {
  id: string;
  status: ServiceRequestStatus;
  technicianCandidate: TechnicianCandidatePayload | null;
};

function formatDistanceLabel(
  clientLat: number | null,
  clientLng: number | null,
  technicianLat: number | null,
  technicianLng: number | null
): string | null {
  if (
    typeof clientLat !== 'number' ||
    typeof clientLng !== 'number' ||
    typeof technicianLat !== 'number' ||
    typeof technicianLng !== 'number'
  ) {
    return null;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const deltaLat = toRadians(technicianLat - clientLat);
  const deltaLng = toRadians(technicianLng - clientLng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(clientLat)) *
      Math.cos(toRadians(technicianLat)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadiusKm * c;

  if (!Number.isFinite(distance)) {
    return null;
  }

  return `${distance.toFixed(1)} km`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ServiceRequestResponse | { error: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { id: serviceRequestId } = await context.params;
    const serviceRoleClient = getSupabaseServiceRoleClient();

    const { data: serviceRequest, error: serviceRequestError } = await serviceRoleClient
      .from('service_requests')
      .select('id, client_id, status, location_lat, location_lng')
      .eq('id', serviceRequestId)
      .maybeSingle();

    if (serviceRequestError) {
      console.error('No se pudo leer la solicitud del cliente.', serviceRequestError);
      return NextResponse.json({ error: 'No se pudo obtener la solicitud.' }, { status: 500 });
    }

    if (!serviceRequest || serviceRequest.client_id !== user.id) {
      return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
    }

    const { data: offer } = await serviceRoleClient
      .from('service_request_offers')
      .select('id, technician_id, status')
      .eq('service_request_id', serviceRequestId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!offer) {
      return NextResponse.json({
        id: serviceRequest.id,
        status: serviceRequest.status as ServiceRequestStatus,
        technicianCandidate: null,
      });
    }

    const [profileResponse, technicianProfileResponse, technicianStatusResponse] = await Promise.all([
      serviceRoleClient
        .from('profiles')
        .select('id, full_name, avatar_url, phone')
        .eq('id', offer.technician_id)
        .maybeSingle(),
      serviceRoleClient
        .from('technician_profiles')
        .select('specialties, rating, total_services, service_areas, is_verified, availability_status')
        .eq('id', offer.technician_id)
        .maybeSingle(),
      serviceRoleClient
        .from('technician_status')
        .select('current_lat, current_lng, current_status, is_online')
        .eq('technician_id', offer.technician_id)
        .maybeSingle(),
    ]);

    if (profileResponse.error) {
      console.error('No se pudo cargar el perfil del técnico.', profileResponse.error);
      return NextResponse.json({ error: 'Error al cargar el técnico.' }, { status: 500 });
    }

    if (technicianProfileResponse.error) {
      console.warn('No se pudo cargar el perfil extendido del técnico.', technicianProfileResponse.error);
    }

    if (technicianStatusResponse.error) {
      console.warn('No se pudo leer la ubicación del técnico.', technicianStatusResponse.error);
    }

    const technicianCandidate: TechnicianCandidatePayload | null = profileResponse.data
      ? {
          id: profileResponse.data.id,
          fullName: profileResponse.data.full_name ?? 'Técnico disponible',
          avatarUrl: profileResponse.data.avatar_url ?? null,
          phone: profileResponse.data.phone ?? null,
          rating: technicianProfileResponse.data?.rating ?? null,
          experience:
            technicianProfileResponse.data?.total_services != null
              ? `${technicianProfileResponse.data.total_services} servicios completados`
              : null,
          skills: technicianProfileResponse.data?.specialties ?? null,
          serviceAreas: technicianProfileResponse.data?.service_areas ?? null,
          totalServices: technicianProfileResponse.data?.total_services ?? null,
          isVerified:
            typeof technicianProfileResponse.data?.is_verified === 'boolean'
              ? technicianProfileResponse.data.is_verified
              : null,
          availabilityStatus: technicianProfileResponse.data?.availability_status ?? null,
          presenceStatus: technicianStatusResponse.data?.current_status ?? null,
          isOnline:
            typeof technicianStatusResponse.data?.is_online === 'boolean'
              ? technicianStatusResponse.data.is_online
              : null,
          distanceLabel: formatDistanceLabel(
            serviceRequest.location_lat,
            serviceRequest.location_lng,
            technicianStatusResponse.data?.current_lat ?? null,
            technicianStatusResponse.data?.current_lng ?? null
          ),
        }
      : null;

    return NextResponse.json({
      id: serviceRequest.id,
      status: serviceRequest.status as ServiceRequestStatus,
      technicianCandidate,
    });
  } catch (error) {
    console.error('Error inesperado al consultar la solicitud.', error);
    return NextResponse.json({ error: 'No se pudo obtener el estado de la solicitud.' }, { status: 500 });
  }
}
