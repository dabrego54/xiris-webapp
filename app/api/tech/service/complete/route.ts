import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

type CompletePayload = {
  serviceRequestId?: string;
};

export async function POST(request: Request) {
  let payload: CompletePayload;

  try {
    payload = (await request.json()) as CompletePayload;
  } catch (error) {
    console.error('Invalid JSON payload for /api/tech/service/complete.', error);
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

    if (serviceRequest.status !== 'in_progress') {
      return NextResponse.json({ error: 'Invalid status transition.' }, { status: 400 });
    }

    const completedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('service_requests')
      .update({ status: 'completed', completed_at: completedAt })
      .eq('id', payload.serviceRequestId);

    if (updateError) {
      console.error('Failed to update service request to completed.', updateError);
      return NextResponse.json({ error: 'Unable to update service request.' }, { status: 500 });
    }

    const { error: statusError } = await supabase
      .from('technician_status')
      .upsert({
        technician_id: user.id,
        is_online: true,
        current_status: 'available',
      });

    if (statusError) {
      console.error('Failed to update technician_status after completion.', statusError);
      return NextResponse.json({ error: 'Unable to update technician status.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Unexpected error while completing service.', error);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
