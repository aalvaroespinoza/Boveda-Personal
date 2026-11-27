import EmptyState from '@/components/EmptyState';
import { formatDateTime } from '@/lib/labels';
import type { ActivityRow } from '@/lib/types';

export default function ActivityFeed({ entries }: { entries: ActivityRow[] }) {
  if (!entries.length) {
    return (
      <EmptyState
        title="Sin actividad registrada"
        detail="Las corridas del sincronizador local y las acciones de la web aparecerán acá."
      />
    );
  }

  return (
    <ol className="timeline">
      {entries.map((entry) => (
        <li key={entry.id} className="timeline-item">
          <div className="timeline-head">
            <strong>{entry.action}</strong>
            <span>{formatDateTime(entry.occurred_at)}</span>
          </div>
          <p className="row-meta">
            <span className="meta-pill">{entry.agent}</span>
            <span className="meta-pill">{entry.origin}</span>
            <span
              className={`status-badge ${
                entry.review_status === 'reviewed'
                  ? 'status-success'
                  : 'status-warning'
              }`}
            >
              {entry.review_status === 'reviewed'
                ? 'Revisada'
                : 'Revisión pendiente'}
            </span>
          </p>
          {entry.result ? <p className="row-body">{entry.result}</p> : null}
          {entry.errors ? (
            <p className="form-error">Errores: {entry.errors}</p>
          ) : null}
          {Array.isArray(entry.files) && entry.files.length ? (
            <p className="row-note">Archivos: {entry.files.join(', ')}</p>
          ) : null}
          {entry.source_path ? (
            <p className="row-note">Origen: {entry.source_path}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
