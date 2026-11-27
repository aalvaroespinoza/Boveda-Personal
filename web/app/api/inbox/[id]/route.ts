import { NextResponse } from 'next/server';
import { finishOperation, startOperation } from '@/lib/operations';
import { createClientOrNull } from '@/lib/supabase/server';
import { isUuid, oneOf, positiveVersion } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const INBOX_STATUSES = ['pending', 'processed', 'discarded'] as const;

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
  const status = oneOf(body.status, INBOX_STATUSES);

  if (!version || !status) {
    return NextResponse.json(
      { error: 'Versión o estado inválido' },
      { status: 400 },
    );
  }

  const operationId = await startOperation(supabase, {
    userId: user.id,
    entity: 'inbox',
    entityId: id,
    operation: 'upsert',
    payload: { status },
  });

  const { data, error } = await supabase
    .from('inbox_items')
    .update({ status })
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
      'Conflicto de versión: la captura cambió en otro dispositivo',
    );
    return NextResponse.json(
      {
        error:
          'La captura cambió en otro dispositivo. Recargá para ver la versión más reciente.',
      },
      { status: 409 },
    );
  }

  await finishOperation(supabase, operationId);
  return NextResponse.json({ item: data });
}
