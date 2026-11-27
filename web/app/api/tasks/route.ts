import { NextResponse } from 'next/server';
import { finishOperation, startOperation } from '@/lib/operations';
import { createClientOrNull } from '@/lib/supabase/server';
import {
  isUuid,
  oneOf,
  optionalDate,
  text,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const title = text(body.title, 200);
  if (!title) {
    return NextResponse.json(
      { error: 'El título es obligatorio (máximo 200 caracteres)' },
      { status: 400 },
    );
  }

  const dueRaw = text(body.due_date, 10);
  const dueDate = dueRaw ? optionalDate(dueRaw) : null;
  if (dueRaw && !dueDate) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }

  const priority = oneOf(body.priority, ['high', 'normal', 'low'] as const);
  const projectRaw = body.project_id;
  if (projectRaw && !isUuid(projectRaw)) {
    return NextResponse.json({ error: 'Proyecto inválido' }, { status: 400 });
  }

  const id = isUuid(body.id) ? body.id : crypto.randomUUID();
  const payload = {
    id,
    title,
    status: 'pending' as const,
    due_date: dueDate,
    priority: priority ?? 'normal',
    project_id: isUuid(projectRaw) ? projectRaw : null,
    context: text(body.context, 4000),
    origin: 'web',
  };

  const operationId = await startOperation(supabase, {
    userId: user.id,
    entity: 'task',
    entityId: id,
    operation: 'upsert',
    payload,
  });

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (existing) {
        await finishOperation(supabase, operationId, 'Reintento idempotente');
        return NextResponse.json({ task: existing }, { status: 200 });
      }
    }

    await finishOperation(supabase, operationId, error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await finishOperation(supabase, operationId);
  return NextResponse.json({ task: data }, { status: 201 });
}
