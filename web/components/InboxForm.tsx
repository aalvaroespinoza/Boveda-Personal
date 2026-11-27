'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { mutate } from '@/lib/offline';

const SOURCES = ['Otra', 'WhatsApp', 'Instagram', 'YouTube', 'Gmail', 'Web'];

export default function InboxForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('Otra');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setNote('');
    setError('');

    if (!title.trim()) {
      setError('Escribí un título para la captura.');
      return;
    }

    setBusy(true);
    try {
      const result = await mutate(
        '/api/inbox',
        'POST',
        {
          id: crypto.randomUUID(),
          title: title.trim(),
          source,
          body: body.trim(),
        },
        `Nueva captura: ${title.trim()}`,
      );

      setTitle('');
      setSource('Otra');
      setBody('');

      if (result.queued) {
        setNote('Guardado en este dispositivo; se enviará al reconectar.');
      } else {
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo guardar la captura',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <label className="wide">
          Título
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Idea, enlace o próximo paso"
            maxLength={200}
          />
        </label>

        <label>
          Origen
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            {SOURCES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="wide">
          Contenido
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Pegá un mensaje, enlace o el contexto concreto"
            rows={5}
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="action" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar en Entrada'}
        </button>
      </div>

      {note ? (
        <p className="form-note" role="status">
          {note}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
