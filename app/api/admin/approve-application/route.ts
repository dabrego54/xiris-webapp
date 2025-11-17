import { NextResponse } from 'next/server';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';

import type { SupabaseDatabase } from '@/lib/supabase/types';
import type { TechnicianApplication } from '@/types/database.types';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

interface ApproveApplicationPayload {
  applicationId?: string;
  decision?: string;
  reviewNotes?: string;
}

type Decision = 'approved' | 'rejected';

function isDecision(decision: unknown): decision is Decision {
  return decision === 'approved' || decision === 'rejected';
}

export async function POST(req: Request) {
  let payload: ApproveApplicationPayload;

  try {
    payload = (await req.json()) as ApproveApplicationPayload;
  } catch (error) {
    console.error('Invalid JSON payload for approve application request.', error);
    return NextResponse.json({ ok: false, error: 'Cuerpo inválido' }, { status: 400 });
  }

  const { applicationId, decision, reviewNotes } = payload;

  if (!applicationId || !isDecision(decision)) {
    return NextResponse.json({ ok: false, error: 'Faltan parámetros' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError || !user) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string | null }>();

  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase service role credentials not configured.');
    return NextResponse.json({ ok: false, error: 'Configuración inválida' }, { status: 500 });
  }

  const serviceClient = createServiceRoleClient<SupabaseDatabase>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: application, error: applicationError } = await serviceClient
    .from('technician_applications')
    .select('*')
    .eq('id', applicationId)
    .single<TechnicianApplication>();

  if (applicationError || !application) {
    return NextResponse.json({ ok: false, error: 'Aplicación no encontrada' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    status: decision,
    review_notes: reviewNotes ?? null,
    reviewer_id: user.id,
    reviewed_at: new Date().toISOString(),
  };

  let targetUserId: string | null = application.user_id ?? null;

  if (decision === 'approved') {
    if (!targetUserId) {
      if (!application.email) {
        return NextResponse.json(
          { ok: false, error: 'No se encontró email para invitar al técnico' },
          { status: 400 },
        );
      }

      const inviteResult = await serviceClient.auth.admin.inviteUserByEmail(application.email);

      if (inviteResult.error || !inviteResult.data?.user) {
        console.error('Error inviting technician user.', inviteResult.error);
        return NextResponse.json({ ok: false, error: 'No se pudo invitar al usuario' }, { status: 500 });
      }

      targetUserId = inviteResult.data.user.id;
    }

    updates.status = 'approved';
    updates.user_id = targetUserId;

    const { error: profileUpsertError } = await serviceClient
      .from('profiles')
      .upsert({ id: targetUserId, role: 'technician' } as never);

    if (profileUpsertError) {
      console.error('Error updating technician profile.', profileUpsertError);
      return NextResponse.json({ ok: false, error: 'No se pudo actualizar el perfil' }, { status: 500 });
    }

    const { error: metadataError } = await serviceClient.auth.admin.updateUserById(targetUserId, {
      app_metadata: { role: 'technician' },
    });

    if (metadataError) {
      console.error('Error updating technician role metadata.', metadataError);
      return NextResponse.json({ ok: false, error: 'No se pudo actualizar el rol del usuario' }, { status: 500 });
    }
  } else if (decision === 'rejected' && targetUserId) {
    updates.status = 'rejected';

    const { error: profileUpdateError } = await serviceClient
      .from('profiles')
      .update({ role: 'client' } as never)
      .eq('id', targetUserId);

    if (profileUpdateError) {
      console.error('Error reverting technician profile.', profileUpdateError);
      return NextResponse.json({ ok: false, error: 'No se pudo actualizar el perfil' }, { status: 500 });
    }
  }

  const { error: updateError } = await serviceClient
    .from('technician_applications')
    .update(updates as never)
    .eq('id', applicationId);

  if (updateError) {
    console.error('Error updating technician application status.', updateError);
    return NextResponse.json({ ok: false, error: 'No se pudo actualizar la aplicación' }, { status: 500 });
  }

  const { error: auditError } = await serviceClient.from('audit_logs').insert({
    actor_id: user.id,
    action: decision === 'approved' ? 'APPLICATION_APPROVED' : 'APPLICATION_REJECTED',
    entity: 'technician_application',
    entity_id: applicationId,
    details: {
      decision,
      reviewNotes: reviewNotes ?? null,
    },
  } as never);

  if (auditError) {
    console.error('Error inserting audit log for technician application review.', auditError);
    return NextResponse.json({ ok: false, error: 'No se pudo registrar la auditoría' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
