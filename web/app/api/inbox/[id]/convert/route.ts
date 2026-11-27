import { NextResponse } from 'next/server';
import { finishOperation, startOperation } from '@/lib/operations';
import { createClientOrNull } from '@/lib/supabase/server';
import { isUuid, positiveVersion } from '@/lib/validation';
import type { InboxRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClientOrNull();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase no está configurado en este entorno' },
      { status: 503 },
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const version = positiveVersion(body.version);
  if (!version) {
    return NextResponse.json(
      { error: 'Falta la versión de la captura' },
      { status: 400 },
    );
  }

  const { data: inboxData, error: inboxError } = await supabase
    .from('inbox_items')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (inboxError) {
    return NextResponse.json({ error: inboxError.message }, { status: 400 });
  }

  if (!inboxData) {
    return NextResponse.json(
      { error: 'La captura no existe' },
      { status: 404 },
    );
  }

  const inbox = inboxData as InboxRow;
  if (inbox.status !== 'pending') {
    return NextResponse.json(
      { error: 'La captura ya fue procesada' },
      { status: 409 },
    );
  }

  const taskId = crypto.randomUUID();
  const taskPayload = {
    id: taskId,
    title: inbox.title,
    status: 'pending' as const,
    due_date: null,
    priority: 'normal' as const,
    project_id: null,
    context: inbox.body,
    origin: 'web',
  };

  const taskOperation = await startOperation(supabase, {
    userId: user.id,
    entity: 'task',
    entityId: taskId,
    operation: 'upsert',
    payload: taskPayload,
  });

  const { data: taskData, error: taskError } = await supabase
    .from('tasks')
    .insert({ ...taskPayload, user_id: user.id })
    .select()
    .single();

  if (taskError) {
    await finishOperation(supabase, taskOperation, taskError.message);
    return NextResponse.json({ error: taskError.message }, { status: 400 });
  }

  const inboxOperation = await startOperation(supabase, {
    userId: user.id,
    entity: 'inbox',
    entityId: id,
    operation: 'upsert',
    payload: { status: 'processed' },
  });

  const { data: updatedInbox, error: updateError } = await supabase
    .from('inbox_items')
    .update({ status: 'processed' })
    .eq('id', id)
    .eq('version', version)
    .select()
    .maybeSingle();

  if (updateError || !updatedInbox) {
    // Rollback explícito: no dejar una tarea duplicada si la captura no se pudo cerrar.
    await supabase.from('tasks').delete().eq('id', taskId);
    await finishOperation(
      supabase,
      taskOperation,
      'Revertida: no se pudo marcar la captura como procesada',
    );
    await finishOperation(
      supabase,
      inboxOperation,
      updateError?.message ?? 'Conflicto de versión',
    );

    return NextResponse.json(
      {
        error:
          'La captura cambió en otro dispositivo. Recargá y volvé a intentar.',
      },
      { status: 409 },
    );
  }

  await finishOperation(supabase, taskOperation);
  await finishOperation(supabase, inboxOperation);

  return NextResponse.json(
    { task: taskData, item: updatedInbox },
    { status: 201 },
  );
}
