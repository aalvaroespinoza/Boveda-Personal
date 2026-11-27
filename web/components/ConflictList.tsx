import EmptyState from '@/components/EmptyState';
import { formatDateTime } from '@/lib/labels';
import type { ConflictRow } from '@/lib/types';

function titleOf(version: Record<string, unknown>): string {
  return typeof version.title === 'string' ? version.title : 'Sin título';
}

export default function ConflictList({
  conflicts,
}: {
  conflicts: ConflictRow[];
}) {
  if (!conflicts.length) {
    return (
      <EmptyState
        title="Sin conflictos pendientes"
        detail="Si la PC y la web cambian el mismo elemento, aparecerá acá y no se aplicará ningún cambio automáticamente."
      />
    );
  }

  return (
    <div className="conflict-list">
      {conflicts.map((conflict) => (
        <article key={conflict.id} className="conflict-item">
          <div className="timeline-head">
            <strong>
              {conflict.entity} · {titleOf(conflict.local_version)}
            </strong>
            <span>{formatDateTime(conflict.detected_at)}</span>
          </div>
          <p className="row-meta">
            <span className="meta-pill">Local: {titleOf(conflict.local_version)}</span>
            <span className="meta-pill">Remoto: {titleOf(conflict.remote_version)}</span>
          </p>
          <details>
            <summary>Ver versiones</summary>
            <pre className="json-preview">
              {JSON.stringify(
                {
                  local: conflict.local_version,
                  remoto: conflict.remote_version,
                },
                null,
                2,
              )}
            </pre>
          </details>
          <p className="form-note">
            Resolución manual pendiente. Ninguna versión se sobrescribió.
          </p>
        </article>
      ))}
    </div>
  );
}
