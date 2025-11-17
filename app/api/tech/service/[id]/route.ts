import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

type TechServiceResponse = {
  id: string;
  status: string;
  problemDescription: string | null;
  clientLocation: { lat: number | null; lng: number | null };
  startedAt: string | null;
  completedAt: string | null;
};

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const serviceRequestId = params.id;

  if (!serviceRequestId) {
    return NextResponse.json({ error: 'Missing service request id.' }, { status: 400 });
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
      .select(
        'id, status, problem_description, location_lat, location_lng, started_at, completed_at, assigned_technician_id'
      )
      .eq('id', serviceRequestId)
      .single();

    if (serviceError || !serviceRequest) {
      console.error('Service request not found or inaccessible.', serviceError);
      return NextResponse.json({ error: 'Service request not found.' }, { status: 404 });
    }

    if (serviceRequest.assigned_technician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const responseBody: TechServiceResponse = {
      id: serviceRequest.id,
      status: serviceRequest.status,
      problemDescription: serviceRequest.problem_description,
      clientLocation: {
        lat: serviceRequest.location_lat,
        lng: serviceRequest.location_lng,
      },
      startedAt: serviceRequest.started_at,
      completedAt: serviceRequest.completed_at,
    };

    return NextResponse.json(responseBody satisfies TechServiceResponse);
  } catch (error) {
    console.error('Unexpected error while fetching technician service.', error);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
