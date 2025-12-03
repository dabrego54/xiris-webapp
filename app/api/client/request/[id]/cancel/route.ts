import { NextResponse } from 'next/server'

import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role'
import { createClient } from '@/lib/supabase/server'
import type { ServiceRequestStatus } from '@/types/database.types'

const CANCELABLE_STATUSES: ServiceRequestStatus[] = ['requested', 'searching', 'candidate_ready']

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    const { id: serviceRequestId } = await context.params

    const serviceRoleClient = getSupabaseServiceRoleClient()

    const { data: serviceRequest, error: serviceRequestError } = await serviceRoleClient
      .from('service_requests')
      .select('id, client_id, status')
      .eq('id', serviceRequestId)
      .maybeSingle<{ id: string; client_id: string; status: ServiceRequestStatus }>()

    if (serviceRequestError) {
      console.error('No se pudo leer la solicitud del cliente.', serviceRequestError)
      return NextResponse.json({ error: 'No se pudo cancelar la solicitud.' }, { status: 500 })
    }

    if (!serviceRequest || serviceRequest.client_id !== user.id) {
      return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 })
    }

    if (!CANCELABLE_STATUSES.includes(serviceRequest.status)) {
      return NextResponse.json({ error: 'La solicitud no se puede cancelar en este estado.' }, { status: 400 })
    }

    const { error: cancelError } = await serviceRoleClient
      .from('service_requests')
      .update({ status: 'cancelled' })
      .eq('id', serviceRequest.id)

    if (cancelError) {
      console.error('No se pudo cancelar la solicitud.', cancelError)
      return NextResponse.json({ error: 'No se pudo cancelar la solicitud.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error inesperado al cancelar la solicitud.', error)
    return NextResponse.json({ error: 'No se pudo cancelar la solicitud.' }, { status: 500 })
  }
}
