import { NextResponse } from 'next/server';
import { finishOperation, startOperation } from '@/lib/operations';
import { createClientOrNull } from '@/lib/supabase/server';
import { isUuid, text } from '@/lib/validation';

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
      { error: 'El nombre es obligatorio (máximo 200 caracteres)' },
      { status: 400 },
    );
  }

  const id = isUuid(body.id) ? body.id : crypto.randomUUID();
  const payload = {
    id,
    title,
    status: 'active' as const,
    area: text(body.area, 80),
    result: text(body.result, 4000),
    current_state: text(body.current_state, 4000),
    next_step: text(body.next_step, 2000),
    origin: 'web',
  };

  const operationId = await startOperation(supabase, {
    userId: user.id,
    entity: 'project',
    entityId: id,
    operation: 'upsert',
    payload,
  });

  const { data, error } = await supabase
    .from('projects')
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (existing) {
        await finishOperation(supabase, operationId, 'Reintento idempotente');
        return NextResponse.json({ project: existing }, { status: 200 });
      }
    }

    await finishOperation(supabase, operationId, error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await finishOperation(supabase, operationId);
  return NextResponse.json({ project: data }, { status: 201 });
}
