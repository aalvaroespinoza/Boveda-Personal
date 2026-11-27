import type {
  InboxStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '@/lib/types';

export const taskStatusLabel: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  pending_sync: 'Pendiente de sync',
  completed: 'Completada',
  waiting: 'En espera',
  blocked: 'Bloqueada',
};

export const projectStatusLabel: Record<ProjectStatus, string> = {
  active: 'Activo',
  waiting: 'En espera',
  paused: 'Pausado',
  done: 'Terminado',
  archived: 'Archivado',
};

export const inboxStatusLabel: Record<InboxStatus, string> = {
  pending: 'Pendiente',
  processed: 'Procesada',
  discarded: 'Descartada',
};

export const priorityLabel: Record<TaskPriority, string> = {
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja',
};

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function isTodayOrOverdue(value: string | null): boolean {
  if (!value) return false;
  return value <= localDateKey(new Date());
}

export function inNextDays(value: string | null, days: number): boolean {
  if (!value) return false;
  const today = new Date();
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  return value > localDateKey(today) && value <= localDateKey(limit);
}
