'use client';

export type QueuedMutation = {
  id: string;
  url: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body: unknown;
  label: string;
  createdAt: string;
};

const STORAGE_KEY = 'boveda:offline-queue';
const QUEUE_EVENT = 'boveda:queue';

export function readQueue(): QueuedMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedMutation[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function enqueue(
  mutation: Omit<QueuedMutation, 'id' | 'createdAt'>,
): number {
  const queue = readQueue();
  queue.push({
    ...mutation,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  writeQueue(queue);
  return queue.length;
}

type MutationResult<T> = { queued: boolean; data?: T };

export async function mutate<T>(
  url: string,
  method: QueuedMutation['method'],
  body: unknown,
  label: string,
): Promise<MutationResult<T>> {
  const send = async (): Promise<T> => {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      const error = new Error(json.error ?? 'No se pudo guardar');
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    return json as T;
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueue({ url, method, body, label });
    return { queued: true };
  }

  try {
    return { queued: false, data: await send() };
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status && status < 500) throw error;
    enqueue({ url, method, body, label });
    return { queued: true };
  }
}

export async function flushQueue(): Promise<number> {
  if (typeof navigator === 'undefined' || !navigator.onLine) return 0;

  let queue = readQueue();
  let sent = 0;

  for (const item of [...queue]) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      });

      // 2xx aplicado; 400/404/409/422 no se resuelven reintentando.
      // 401/403 y 5xx quedan en cola: pueden resolverse al renovar sesión.
      const permanent =
        response.ok || [400, 404, 409, 422].includes(response.status);

      if (permanent) {
        queue = queue.filter((queued) => queued.id !== item.id);
        writeQueue(queue);
        sent += 1;
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return sent;
}

export function subscribeToQueue(listener: () => void): () => void {
  window.addEventListener(QUEUE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(QUEUE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
