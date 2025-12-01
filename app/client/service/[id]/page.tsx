import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'

import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/server'
import ClientServiceView, { type ClientServiceViewProps, type ServiceStatus } from '../ClientServiceView'

type ClientServicePageProps = {
  params: Promise<{ id: string }> | { id: string }
}

type ServiceRequestRow = {
  id: string
  client_id: string
  status: string
  problem_description: string | null
  location_lat: number | null
  location_lng: number | null
  assigned_technician_id: string | null
  started_at: string | null
  completed_at: string | null
}

type TechnicianProfile = {
  id: string
  full_name: string | null
  email: string
}

type TechnicianLocationRow = {
  current_lat: number | null
  current_lng: number | null
}

export const metadata: Metadata = {
  title: 'Seguimiento de servicio',
}

export default async function ClientServicePage({ params: routeParams }: ClientServicePageProps) {
  const resolvedParams = routeParams instanceof Promise ? await routeParams : routeParams
  const serviceRequestId = resolvedParams.id

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/client/service/${serviceRequestId}`)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile || profile.role?.toLowerCase() !== 'client') {
    redirect('/dashboard')
  }

  const { data: serviceRequest, error: serviceError } = await supabase
    .from('service_requests')
    .select(
      'id, client_id, status, problem_description, location_lat, location_lng, assigned_technician_id, started_at, completed_at'
    )
    .eq('id', serviceRequestId)
    .maybeSingle<ServiceRequestRow>()

  if (serviceError || !serviceRequest) {
    notFound()
  }

  if (serviceRequest.client_id !== user.id) {
    notFound()
  }

  let technician: ClientServiceViewProps['technician'] = null
  let technicianLocation: ClientServiceViewProps['technicianLocation'] = null

  if (serviceRequest.assigned_technician_id) {
    const [{ data: technicianProfile }, { data: technicianStatus }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', serviceRequest.assigned_technician_id)
        .maybeSingle<TechnicianProfile>(),
      supabase
        .from('technician_status')
        .select('current_lat, current_lng')
        .eq('technician_id', serviceRequest.assigned_technician_id)
        .maybeSingle<TechnicianLocationRow>(),
    ])

    if (technicianProfile) {
      technician = {
        id: technicianProfile.id,
        fullName: technicianProfile.full_name,
        email: technicianProfile.email,
      }
    }

    if (
      technicianStatus?.current_lat !== null &&
      technicianStatus?.current_lng !== null &&
      technicianStatus?.current_lat !== undefined &&
      technicianStatus?.current_lng !== undefined
    ) {
      technicianLocation = {
        lat: technicianStatus.current_lat,
        lng: technicianStatus.current_lng,
      }
    }
  }

  const viewProps: ClientServiceViewProps = {
    serviceRequestId: serviceRequest.id,
    status: serviceRequest.status as ServiceStatus,
    problemDescription: serviceRequest.problem_description,
    location: {
      lat: serviceRequest.location_lat,
      lng: serviceRequest.location_lng,
    },
    technician,
    technicianLocation,
    startedAt: serviceRequest.started_at,
    completedAt: serviceRequest.completed_at,
  }

  return (
    <AppShell>
      <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-slate-50">
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          <ClientServiceView {...viewProps} />
        </div>
      </div>
    </AppShell>
  )
}
