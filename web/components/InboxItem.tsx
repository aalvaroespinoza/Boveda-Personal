'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatDateTime, inboxStatusLabel } from '@/lib/labels';
import { mutate } from '@/lib/offline';
import type { InboxRow } from '@/lib/types';

export default function InboxItem({ item }: { item: InboxRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const isPending = item.status === 'pending';

  async function act(
    url: string,
    method: 'POST' | 'PATCH',
    body: unknown,
    label: string,
  ) {
    setBusy(true);
    setNote('');
    setError('');

    try {
      const result = await mutate(url, method, body, label);
      if (result.queued) {
        setNote('Guardado en este dispositivo; se enviará al reconectar.');
      } else {
        router.refresh();
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'No se pudo procesar la captura',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`row inbox-row${isPending ? '' : ' is-done'}`}>
      <div className="row-main">
        <div className="row-title">{item.title}</div>

        <div className="row-meta">
          <span className="meta-pill">{item.source}</span>
          <span className="meta-pill">{formatDateTime(item.created_at)}</span>
          {!isPending ? (
            <span className="status-badge status-neutral">
              {inboxStatusLabel[item.status]}
            </span>
          ) : null}
        </div>

        {item.body ? <p className="row-body">{item.body}</p> : null}

        {isPending ? (
          <div className="row-actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() =>
                act(
                  `/api/inbox/${item.id}/convert`,
                  'POST',
                  { version: item.version },
                  `Convertir en tarea: ${item.title}`,
                )
              }
            >
              Convertir en tarea
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() =>
                act(
                  `/api/inbox/${item.id}`,
                  'PATCH',
                  { status: 'discarded', version: item.version },
                  `Descartar captura: ${item.title}`,
                )
              }
            >
              Descartar
            </button>
          </div>
        ) : null}

        {note ? (
          <p className="row-note" role="status">
            {note}
          </p>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </article>
  );
}
