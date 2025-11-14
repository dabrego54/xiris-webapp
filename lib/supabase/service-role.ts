import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { SupabaseDatabase } from './types';

let serviceRoleClient: SupabaseClient<SupabaseDatabase> | null = null;

export function getSupabaseServiceRoleClient(): SupabaseClient<SupabaseDatabase> {
  if (serviceRoleClient) {
    return serviceRoleClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase service role credentials are not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  serviceRoleClient = createClient<SupabaseDatabase>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serviceRoleClient;
}
