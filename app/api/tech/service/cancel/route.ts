import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import type { ServiceRequestStatus } from '@/types/database.types';

const CANCELABLE_STATUSES: ServiceRequestStatus[] = [
  'candidate_ready',
  'accepted',
  'on_route',
  'in_progress',
];

type CancelPayload = {
  serviceRequestId?: string;
};

export async function POST(request: Request) {
  let payload: CancelPayload;

  try {
    payload = (await request.json()) as CancelPayload;
  } catch (error) {
    console.error('Invalid JSON payload for /api/tech/service/cancel.', error);
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!payload.serviceRequestId || typeof payload.serviceRequestId !== 'string') {
    return NextResponse.json({ error: 'serviceRequestId is required.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('Unable to read Supabase session.', authError);
      return NextResponse.json({ error: 'Unable to validate session.' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const serviceRoleClient = getSupabaseServiceRoleClient();

    const { data: serviceRequest, error: fetchError } = await serviceRoleClient
      .from('service_requests')
      .select('id, status, assigned_technician_id')
      .eq('id', payload.serviceRequestId)
      .maybeSingle();

    if (fetchError) {
      console.error('Unable to read service_request for cancel.', fetchError);
      return NextResponse.json({ error: 'Unable to load service request.' }, { status: 500 });
    }

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Service request not found.' }, { status: 404 });
    }

    if (serviceRequest.assigned_technician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const status = serviceRequest.status as ServiceRequestStatus;

    if (!CANCELABLE_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'El servicio no puede cancelarse en este estado.' }, { status: 400 });
    }

    const { error: updateError } = await serviceRoleClient
      .from('service_requests')
      .update({ status: 'cancelled', assigned_technician_id: null })
      .eq('id', payload.serviceRequestId)
      .eq('assigned_technician_id', user.id)
      .in('status', CANCELABLE_STATUSES);

    if (updateError) {
      console.error('Unable to cancel service request.', updateError);
      return NextResponse.json({ error: 'Unable to cancel the service.' }, { status: 500 });
    }

    const { error: offersError } = await serviceRoleClient
      .from('service_request_offers')
      .update({ status: 'cancelled' })
      .eq('service_request_id', payload.serviceRequestId)
      .not('status', 'eq', 'cancelled');

    if (offersError) {
      console.error('Unable to cancel service offers.', offersError);
    }

    const { error: statusError } = await serviceRoleClient.from('technician_status').upsert({
      technician_id: user.id,
      is_online: true,
      current_status: 'available',
    });

    if (statusError) {
      console.error('Unable to reset technician_status after cancel.', statusError);
      return NextResponse.json({ error: 'Unable to update technician status.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Unexpected error while cancelling service.', error);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
