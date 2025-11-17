import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

type StartRoutePayload = {
  serviceRequestId?: string;
};

export async function POST(request: Request) {
  let payload: StartRoutePayload;

  try {
    payload = (await request.json()) as StartRoutePayload;
  } catch (error) {
    console.error('Invalid JSON payload for /api/tech/service/start-route.', error);
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

    const { data: serviceRequest, error: serviceError } = await supabase
      .from('service_requests')
      .select('id, assigned_technician_id, status')
      .eq('id', payload.serviceRequestId)
      .single();

    if (serviceError || !serviceRequest) {
      console.error('Service request not found or inaccessible.', serviceError);
      return NextResponse.json({ error: 'Service request not found.' }, { status: 404 });
    }

    if (serviceRequest.assigned_technician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    if (serviceRequest.status !== 'accepted') {
      return NextResponse.json({ error: 'Invalid status transition.' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('service_requests')
      .update({ status: 'on_route' })
      .eq('id', payload.serviceRequestId);

    if (updateError) {
      console.error('Failed to update service request to on_route.', updateError);
      return NextResponse.json({ error: 'Unable to update service request.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Unexpected error while starting route.', error);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
