'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  formatDate,
  priorityLabel,
  taskStatusLabel,
} from '@/lib/labels';
import { mutate } from '@/lib/offline';
import type { TaskRow as Task, TaskStatus } from '@/lib/types';

export default function TaskRow({
  task,
  projectName,
}: {
  task: Task;
  projectName?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [optimistic, setOptimistic] = useState<TaskStatus | null>(null);
  const status = optimistic ?? task.status;
  const isDone = status === 'completed';

  async function toggle() {
    setBusy(true);
    setNote('');
    const nextStatus: TaskStatus = isDone ? 'pending' : 'completed';

    try {
      const result = await mutate(
        `/api/tasks/${task.id}`,
        'PATCH',
        { status: nextStatus, version: task.version },
        `Tarea: ${task.title}`,
      );

      if (result.queued) {
        setOptimistic(nextStatus);
        setNote('Guardado en este dispositivo; se enviará al reconectar.');
      } else {
        router.refresh();
      }
    } catch (error) {
      setNote(
        error instanceof Error ? error.message : 'No se pudo actualizar la tarea',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`row task-row${isDone ? ' is-done' : ''}`}>
      <button
        type="button"
        className={`check${isDone ? ' checked' : ''}`}
        onClick={toggle}
        disabled={busy}
        aria-label={isDone ? `Reabrir ${task.title}` : `Completar ${task.title}`}
        aria-pressed={isDone}
      >
        {isDone ? '✓' : ''}
      </button>

      <div className="row-main">
        <div className="row-title">{task.title}</div>

        <div className="row-meta">
          {task.due_date ? (
            <span className="meta-pill">{formatDate(task.due_date)}</span>
          ) : null}
          {projectName ? (
            <span className="meta-pill">{projectName}</span>
          ) : null}
          {task.priority === 'high' ? (
            <span className="meta-pill priority-high">
              {priorityLabel[task.priority]}
            </span>
          ) : null}
          {task.status !== 'pending' && task.status !== 'completed' ? (
            <span className={`status-badge status-${task.status}`}>
              {taskStatusLabel[task.status]}
            </span>
          ) : null}
        </div>

        {task.context ? <p className="row-body">{task.context}</p> : null}
        {note ? (
          <p className="row-note" role="status">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}
