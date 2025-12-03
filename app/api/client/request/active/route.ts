import { NextResponse } from 'next/server'

import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role'
import { createClient } from '@/lib/supabase/server'
import type { ServiceRequestStatus } from '@/types/database.types'
import type { SupabaseDatabase } from '@/lib/supabase/types'
import type { PostgrestSingleResponse, SupabaseClient } from '@supabase/supabase-js'

type TechnicianCandidatePayload = {
  id: string
  fullName: string
  avatarUrl: string | null
  phone: string | null
  rating: number | null
  experience: string | null
  skills: string[] | null
  serviceAreas: string[] | null
  totalServices: number | null
  isVerified: boolean | null
  availabilityStatus: string | null
  presenceStatus: string | null
  isOnline: boolean | null
  distanceLabel: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  phone?: string | null
  avatar_url?: string | null
}

type ActiveServiceResponse = {
  id: string
  status: ServiceRequestStatus
  location: { lat: number | null; lng: number | null } | null
  technicianCandidate: TechnicianCandidatePayload | null
  technicianLocation: { lat: number | null; lng: number | null } | null
}

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
    return null
  }

  const toRadians = (value: number) => (value * Math.PI) / 180
  const earthRadiusKm = 6371

  const deltaLat = toRadians(technicianLat - clientLat)
  const deltaLng = toRadians(technicianLng - clientLng)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(clientLat)) *
      Math.cos(toRadians(technicianLat)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = earthRadiusKm * c

  if (!Number.isFinite(distance)) {
    return null
  }

  return `${distance.toFixed(1)} km`
}

async function fetchTechnicianProfile(
  serviceRoleClient: SupabaseClient<SupabaseDatabase>,
  technicianId: string
) {
  const profileColumnOptions = [
    'id, full_name, avatar_url, phone',
    'id, full_name, phone',
    'id, full_name',
  ]

  let lastResponse: PostgrestSingleResponse<ProfileRow> | null = null

  for (const selectColumns of profileColumnOptions) {
    const response = await serviceRoleClient
      .from('profiles')
      .select(selectColumns)
      .eq('id', technicianId)
      .maybeSingle<ProfileRow>()

    if (response.error?.code === '42703') {
      console.warn(`Columnas faltantes (${selectColumns}) en profiles; degradando la consulta.`, response.error)
      lastResponse = response
      continue
    }

    return response
  }

  return lastResponse as PostgrestSingleResponse<ProfileRow>
}

const ACTIVE_STATUSES: ServiceRequestStatus[] = [
  'requested',
  'searching',
  'candidate_ready',
  'accepted',
  'on_route',
  'in_progress',
]

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    const serviceRoleClient = getSupabaseServiceRoleClient()

    const { data: serviceRequest, error: serviceRequestError } = await serviceRoleClient
      .from('service_requests')
      .select('id, client_id, status, location_lat, location_lng')
      .eq('client_id', user.id)
      .in('status', ACTIVE_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (serviceRequestError) {
      console.error('No se pudo leer la solicitud activa del cliente.', serviceRequestError)
      return NextResponse.json({ error: 'No se pudo obtener la solicitud activa.' }, { status: 500 })
    }

    if (!serviceRequest) {
      return NextResponse.json({ service: null })
    }

    const { data: offer } = await serviceRoleClient
      .from('service_request_offers')
      .select('id, technician_id, status')
      .eq('service_request_id', serviceRequest.id)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; technician_id: string; status: 'pending' | 'accepted' }>()

    if (!offer) {
      return NextResponse.json({
        service: {
          id: serviceRequest.id,
          status: serviceRequest.status as ServiceRequestStatus,
          location: { lat: serviceRequest.location_lat, lng: serviceRequest.location_lng },
          technicianCandidate: null,
          technicianLocation: null,
        } satisfies ActiveServiceResponse,
      })
    }

    const [profileResponse, technicianProfileResponse, technicianStatusResponse] = await Promise.all([
      fetchTechnicianProfile(serviceRoleClient, offer.technician_id),
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
    ])

    if (profileResponse.error) {
      console.error('No se pudo cargar el perfil del técnico.', profileResponse.error)
      return NextResponse.json({ error: 'Error al cargar el técnico.' }, { status: 500 })
    }

    if (technicianProfileResponse.error) {
      console.warn('No se pudo cargar el perfil extendido del técnico.', technicianProfileResponse.error)
    }

    if (technicianStatusResponse.error) {
      console.warn('No se pudo leer la ubicación del técnico.', technicianStatusResponse.error)
    }

    const profileData = profileResponse.data as ProfileRow | null

    const technicianCandidate: TechnicianCandidatePayload | null = profileData
      ? {
          id: profileData.id,
          fullName: profileData.full_name ?? 'Técnico disponible',
          avatarUrl: Object.hasOwn(profileData, 'avatar_url') ? profileData.avatar_url ?? null : null,
          phone: Object.hasOwn(profileData, 'phone') ? profileData.phone ?? null : null,
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
      : null

    const response: ActiveServiceResponse = {
      id: serviceRequest.id,
      status: serviceRequest.status as ServiceRequestStatus,
      location: { lat: serviceRequest.location_lat, lng: serviceRequest.location_lng },
      technicianCandidate,
      technicianLocation:
        technicianStatusResponse.data?.current_lat != null && technicianStatusResponse.data?.current_lng != null
          ? {
              lat: technicianStatusResponse.data.current_lat,
              lng: technicianStatusResponse.data.current_lng,
            }
          : null,
    }

    return NextResponse.json({ service: response satisfies ActiveServiceResponse })
  } catch (error) {
    console.error('Error inesperado al consultar la solicitud activa.', error)
    return NextResponse.json({ error: 'No se pudo obtener la solicitud activa.' }, { status: 500 })
  }
}
