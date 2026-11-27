import { NextResponse } from 'next/server';
import { finishOperation, startOperation } from '@/lib/operations';
import { createClientOrNull } from '@/lib/supabase/server';
import {
  isUuid,
  oneOf,
  optionalDate,
  positiveVersion,
  text,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';

const TASK_STATUSES = [
  'pending',
  'pending_sync',
  'completed',
  'waiting',
  'blocked',
] as const;

export async function PATCH(
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
      { error: 'Falta la versión del elemento' },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const status = oneOf(body.status, TASK_STATUSES);
    if (!status) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }
    patch.status = status;
  }

  if (body.title !== undefined) {
    const title = text(body.title, 200);
    if (!title) {
      return NextResponse.json({ error: 'Título inválido' }, { status: 400 });
    }
    patch.title = title;
  }

  if (body.due_date !== undefined) {
    if (body.due_date === null || body.due_date === '') {
      patch.due_date = null;
    } else {
      const dueDate = optionalDate(body.due_date);
      if (!dueDate) {
        return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
      }
      patch.due_date = dueDate;
    }
  }

  if (body.priority !== undefined) {
    const priority = oneOf(body.priority, ['high', 'normal', 'low'] as const);
    if (!priority) {
      return NextResponse.json({ error: 'Prioridad inválida' }, { status: 400 });
    }
    patch.priority = priority;
  }

  if (body.context !== undefined) {
    patch.context = text(body.context, 4000);
  }

  if (body.project_id !== undefined) {
    if (body.project_id === null || body.project_id === '') {
      patch.project_id = null;
    } else if (isUuid(body.project_id)) {
      patch.project_id = body.project_id;
    } else {
      return NextResponse.json({ error: 'Proyecto inválido' }, { status: 400 });
    }
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json(
      { error: 'No hay cambios para aplicar' },
      { status: 400 },
    );
  }

  const operationId = await startOperation(supabase, {
    userId: user.id,
    entity: 'task',
    entityId: id,
    operation: 'upsert',
    payload: patch,
  });

  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .eq('version', version)
    .select()
    .maybeSingle();

  if (error) {
    await finishOperation(supabase, operationId, error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    await finishOperation(
      supabase,
      operationId,
      'Conflicto de versión: el elemento cambió en otro dispositivo',
    );
    return NextResponse.json(
      {
        error:
          'El elemento cambió en otro dispositivo. Recargá para ver la versión más reciente.',
      },
      { status: 409 },
    );
  }

  await finishOperation(supabase, operationId);
  return NextResponse.json({ task: data });
}
