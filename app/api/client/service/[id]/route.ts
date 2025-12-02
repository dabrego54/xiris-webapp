import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

type ServiceResponse = {
  id: string;
  status: string;
  problemDescription: string | null;
  location: { lat: number | null; lng: number | null };
  startedAt: string | null;
  completedAt: string | null;
  technician:
    | null
    | {
        id: string;
        fullName: string | null;
        email: string | null;
      };
  technicianLocation:
    | null
    | {
        lat: number;
        lng: number;
      };
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: serviceRequestId } = await context.params;

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
        'id, status, problem_description, location_lat, location_lng, started_at, completed_at, client_id, assigned_technician_id'
      )
      .eq('id', serviceRequestId)
      .single();

    if (serviceError || !serviceRequest) {
      console.error('Service request not found or inaccessible.', serviceError);
      return NextResponse.json({ error: 'Service request not found.' }, { status: 404 });
    }

    if (serviceRequest.client_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    let technician: ServiceResponse['technician'] = null;
    let technicianLocation: ServiceResponse['technicianLocation'] = null;

    if (serviceRequest.assigned_technician_id) {
      const [{ data: profile, error: profileError }, { data: locationData, error: locationError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', serviceRequest.assigned_technician_id)
          .maybeSingle(),
        supabase
          .from('technician_status')
          .select('current_lat, current_lng')
          .eq('technician_id', serviceRequest.assigned_technician_id)
          .maybeSingle(),
      ]);

      if (profileError) {
        console.warn('Unable to load technician profile.', profileError);
      } else if (profile) {
        technician = {
          id: profile.id,
          fullName: profile.full_name,
          email: 'email' in profile ? (profile as { email: string | null }).email : null,
        };
      }

      if (locationError && locationError.code !== 'PGRST116') {
        console.warn('Unable to load technician location.', locationError);
      } else if (
        locationData &&
        locationData.current_lat !== null &&
        locationData.current_lng !== null
      ) {
        technicianLocation = {
          lat: locationData.current_lat,
          lng: locationData.current_lng,
        };
      }
    }

    const responseBody: ServiceResponse = {
      id: serviceRequest.id,
      status: serviceRequest.status,
      problemDescription: serviceRequest.problem_description,
      location: {
        lat: serviceRequest.location_lat,
        lng: serviceRequest.location_lng,
      },
      startedAt: serviceRequest.started_at,
      completedAt: serviceRequest.completed_at,
      technician,
      technicianLocation,
    };

    return NextResponse.json(responseBody satisfies ServiceResponse);
  } catch (error) {
    console.error('Unexpected error while fetching client service.', error);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
