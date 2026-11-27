import { NextResponse } from 'next/server';
import { getSyncSummary } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      configured: false,
      pendingOps: 0,
      conflicts: 0,
      lastSync: null,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const summary = await getSyncSummary(supabase);
  return NextResponse.json({ configured: true, ...summary });
}
