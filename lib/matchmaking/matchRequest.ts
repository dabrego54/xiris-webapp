import type { SupabaseClient } from '@supabase/supabase-js';

import type { SupabaseDatabase } from '@/lib/supabase/types';
import type { ServiceRequestStatus } from '@/types/database.types';

const OFFER_EXPIRATION_MINUTES = 5;

type MatchRequestOptions = {
  excludeTechnicians?: string[];
};

export type MatchRequestResult = {
  status: ServiceRequestStatus;
};

function formatSupabaseError(context: string, message: string): Error {
  return new Error(`${context}: ${message}`);
}

export async function matchRequest(
  supabase: SupabaseClient<SupabaseDatabase>,
  serviceRequestId: string,
  options: MatchRequestOptions = {}
): Promise<MatchRequestResult> {
  const excludedTechnicians = options.excludeTechnicians ?? [];

  const { error: searchingError } = await supabase
    .from('service_requests')
    .update({ status: 'searching' })
    .eq('id', serviceRequestId);

  if (searchingError) {
    throw formatSupabaseError('No se pudo marcar la solicitud como "searching"', searchingError.message);
  }

  const { data: availableTechnicians, error: technicianStatusError } = await supabase
    .from('technician_status')
    .select('technician_id')
    .eq('is_online', true)
    .eq('current_status', 'available')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (technicianStatusError) {
    throw formatSupabaseError('No se pudo leer la disponibilidad de técnicos', technicianStatusError.message);
  }

  const nextCandidate = availableTechnicians?.find(
    (candidate) => !excludedTechnicians.includes(candidate.technician_id)
  );

  if (!nextCandidate) {
    return { status: 'searching' };
  }

  const expiresAt = new Date(Date.now() + OFFER_EXPIRATION_MINUTES * 60 * 1000).toISOString();

  const { error: offerError } = await supabase.from('service_request_offers').insert({
    service_request_id: serviceRequestId,
    technician_id: nextCandidate.technician_id,
    status: 'pending',
    expires_at: expiresAt,
  });

  if (offerError) {
    throw formatSupabaseError('No se pudo registrar la oferta del técnico', offerError.message);
  }

  const { error: candidateReadyError } = await supabase
    .from('service_requests')
    .update({ status: 'candidate_ready' })
    .eq('id', serviceRequestId);

  if (candidateReadyError) {
    throw formatSupabaseError('No se pudo actualizar el estado a "candidate_ready"', candidateReadyError.message);
  }

  return { status: 'candidate_ready' };
}
