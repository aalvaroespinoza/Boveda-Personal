'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { mutate } from '@/lib/offline';
import type { ProjectRow } from '@/lib/types';

export default function TaskForm({ projects }: { projects: ProjectRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [context, setContext] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setNote('');
    setError('');

    if (!title.trim()) {
      setError('Escribí un título para la tarea.');
      return;
    }

    setBusy(true);
    try {
      const result = await mutate(
        '/api/tasks',
        'POST',
        {
          id: crypto.randomUUID(),
          title: title.trim(),
          due_date: dueDate || null,
          project_id: projectId || null,
          priority,
          context: context.trim(),
        },
        `Nueva tarea: ${title.trim()}`,
      );

      setTitle('');
      setDueDate('');
      setProjectId('');
      setPriority('normal');
      setContext('');

      if (result.queued) {
        setNote('Guardado en este dispositivo; se enviará al reconectar.');
      } else {
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear la tarea',
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
            placeholder="Ej.: Revisar el apunte de Nmap"
            maxLength={200}
          />
        </label>

        <label>
          Fecha
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>

        <label>
          Proyecto
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">Sin proyecto</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          Prioridad
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="low">Baja</option>
          </select>
        </label>

        <label className="wide">
          Contexto
          <textarea
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder="Qué necesitás saber o tener abierto al retomarla"
            rows={3}
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="action" disabled={busy}>
          {busy ? 'Guardando…' : 'Crear tarea'}
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
