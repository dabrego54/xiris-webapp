import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';

import AppShell from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import TechServiceView, { type TechServiceViewProps } from '../TechServiceView';

type TechServicePageProps = {
  params: {
    id: string;
  };
};

type ServiceRequestRow = {
  id: string;
  status: string;
  problem_description: string | null;
  location_lat: number | null;
  location_lng: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  assigned_technician_id: string | null;
};

export const metadata: Metadata = {
  title: 'Servicio activo',
};

export default async function TechServicePage({ params }: TechServicePageProps) {
  const serviceRequestId = params.id;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/tech/service/${serviceRequestId}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role?.toLowerCase() !== 'technician') {
    redirect('/dashboard');
  }

  const { data: serviceRequest, error: serviceError } = await supabase
    .from('service_requests')
    .select(
      'id, status, problem_description, location_lat, location_lng, started_at, completed_at, created_at, assigned_technician_id'
    )
    .eq('id', serviceRequestId)
    .maybeSingle<ServiceRequestRow>();

  if (serviceError || !serviceRequest) {
    notFound();
  }

  if (serviceRequest.assigned_technician_id !== user.id) {
    notFound();
  }

  const viewProps: TechServiceViewProps = {
    serviceRequestId: serviceRequest.id,
    status: serviceRequest.status as TechServiceViewProps['status'],
    problemDescription: serviceRequest.problem_description,
    clientLocation: {
      lat: serviceRequest.location_lat,
      lng: serviceRequest.location_lng,
    },
    startedAt: serviceRequest.started_at,
    completedAt: serviceRequest.completed_at,
    createdAt: serviceRequest.created_at,
  };

  return (
    <AppShell>
      <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-slate-50">
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          <TechServiceView {...viewProps} />
        </div>
      </div>
    </AppShell>
  );
}
