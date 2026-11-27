import type { SupabaseClient } from '@supabase/supabase-js';
import type { SyncSummary } from '@/lib/types';

export async function getSyncSummary(
  supabase: SupabaseClient,
): Promise<SyncSummary> {
  const [pending, conflicts, last] = await Promise.all([
    supabase
      .from('sync_operations')
      .select('id', { count: 'exact', head: true })
      .is('processed_at', null),
    supabase
      .from('sync_conflicts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('sync_operations')
      .select('processed_at')
      .not('processed_at', 'is', null)
      .order('processed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    pendingOps: pending.count ?? 0,
    conflicts: conflicts.count ?? 0,
    lastSync:
      (last.data as { processed_at: string | null } | null)?.processed_at ??
      null,
  };
}
