import ActivityFeed from '@/components/ActivityFeed';
import ConflictList from '@/components/ConflictList';
import DataError from '@/components/DataError';
import EmptyState from '@/components/EmptyState';
import Panel from '@/components/Panel';
import { getSyncSummary } from '@/lib/data';
import { formatDateTime } from '@/lib/labels';
import { createClientOrNull } from '@/lib/supabase/server';
import type {
  ActivityRow,
  ConflictRow,
  OperationRow,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ActividadPage() {
  const supabase = await createClientOrNull();
  if (!supabase) return null;

  const [activityResult, conflictsResult, operationsResult, summary] =
    await Promise.all([
      supabase
        .from('activity_entries')
        .select('*')
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false })
        .limit(50),
      supabase
        .from('sync_conflicts')
        .select('*')
        .eq('status', 'pending')
        .order('detected_at', { ascending: false }),
      supabase
        .from('sync_operations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
      getSyncSummary(supabase),
    ]);

  const error =
    activityResult.error ?? conflictsResult.error ?? operationsResult.error;
  if (error) {
    return (
      <DataError message={error.message} code={error.code} hint={error.hint} />
    );
  }

  const activity = (activityResult.data ?? []) as ActivityRow[];
  const conflicts = (conflictsResult.data ?? []) as ConflictRow[];
  const operations = (operationsResult.data ?? []) as OperationRow[];

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Estado y registro</div>
        <h1>Actividad</h1>
        <p>
          Qué corrió, qué quedó pendiente y qué conflictos esperan una decisión
          humana.
        </p>
      </div>

      <div className="stats-grid section-gap">
        <div className="stat-card">
          <small>Último sync</small>
          <strong>{formatDateTime(summary.lastSync)}</strong>
        </div>
        <div className="stat-card">
          <small>Operaciones pendientes</small>
          <strong>{summary.pendingOps}</strong>
        </div>
        <div className="stat-card">
          <small>Conflictos sin resolver</small>
          <strong>{summary.conflicts}</strong>
        </div>
      </div>

      <div className="split section-gap">
        <Panel
          title="Conflictos de sincronización"
          description="Si local y remoto cambiaron el mismo elemento, no se aplica nada."
        >
          <ConflictList conflicts={conflicts} />
        </Panel>

        <Panel
          title="Outbox reciente"
          description="Cada operación que la web o la PC intentaron aplicar."
        >
          {operations.length ? (
            <ul className="mini-timeline">
              {operations.map((operation) => (
                <li key={operation.id}>
                  <strong>
                    {operation.entity} · {operation.operation}
                  </strong>
                  <span>
                    {operation.origin} ·{' '}
                    {operation.processed_at
                      ? `procesada ${formatDateTime(operation.processed_at)}`
                      : 'pendiente'}
                    {operation.error ? ` · ${operation.error}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Sin operaciones registradas"
              detail="La primera tarea o captura creará una entrada en el outbox."
            />
          )}
        </Panel>
      </div>

      <Panel
        title="Registro de actividad"
        description="Corridas del sincronizador local y acciones de la app."
        className="section-gap"
      >
        <ActivityFeed entries={activity} />
      </Panel>
    </>
  );
}
