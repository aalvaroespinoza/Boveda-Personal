import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TABLES = [
  'projects',
  'tasks',
  'inbox_items',
  'activity_entries',
  'sync_operations',
  'sync_conflicts',
] as const;

interface TableCheck {
  table: string;
  ok: boolean;
  code?: string;
  message?: string;
}

function hintFor(tables: TableCheck[]): string | null {
  if (tables.every((table) => table.ok)) return null;

  const failed = tables.filter((table) => !table.ok);
  const missing = failed.some(
    (table) =>
      table.code === '42P01' ||
      table.code === 'PGRST205' ||
      (table.message ?? '').toLowerCase().includes('schema cache'),
  );
  if (missing) {
    return 'Faltan tablas o PostgREST no las ve. Aplicá supabase/migrations/ con "supabase db push --yes --remote" y después "notify pgrst, \'reload schema\';".';
  }

  const denied = failed.some(
    (table) =>
      table.code === '42501' ||
      (table.message ?? '').toLowerCase().includes('permission denied'),
  );
  if (denied) {
    return 'La sesión es válida pero faltan permisos. Aplicá supabase/migrations/202611260002_explicit_grants.sql.';
  }

  return 'Revisá el detalle de las tablas que fallan.';
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      authenticated: false,
      tables: [],
      hint: 'Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en web/.env.local o en las variables de Vercel.',
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      ok: false,
      configured: true,
      authenticated: false,
      authError: authError?.message ?? null,
      tables: [],
      hint: 'No hay sesión. Entrá con el enlace de correo y volvé a abrir /api/health.',
    });
  }

  const tables: TableCheck[] = [];

  for (const table of TABLES) {
    const { error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .limit(1);

    tables.push(
      error
        ? { table, ok: false, code: error.code, message: error.message }
        : { table, ok: true },
    );
  }

  const ok = tables.every((table) => table.ok);

  return NextResponse.json({
    ok,
    configured: true,
    authenticated: true,
    userId: user.id,
    email: user.email ?? null,
    tables,
    hint: hintFor(tables),
  });
}
