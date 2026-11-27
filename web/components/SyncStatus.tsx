'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/labels';
import {
  flushQueue,
  readQueue,
  subscribeToQueue,
} from '@/lib/offline';
import type { SyncSummary } from '@/lib/types';

type StatusPayload = SyncSummary & {
  configured?: boolean;
  error?: string;
};

export default function SyncStatus() {
  const [online, setOnline] = useState(true);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [unreachable, setUnreachable] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('status');
      const data = (await response.json()) as StatusPayload;
      setSummary({
        pendingOps: data.pendingOps ?? 0,
        conflicts: data.conflicts ?? 0,
        lastSync: data.lastSync ?? null,
      });
      setUnreachable(false);
    } catch {
      setUnreachable(true);
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    setQueueCount(readQueue().length);
    void refresh();

    const onOnline = async () => {
      setOnline(true);
      await flushQueue();
      setQueueCount(readQueue().length);
      await refresh();
    };
    const onOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    const unsubscribe = subscribeToQueue(() =>
      setQueueCount(readQueue().length),
    );
    const timer = window.setInterval(() => void refresh(), 30_000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [refresh]);

  const hasAlert = Boolean(
    queueCount > 0 || (summary?.pendingOps ?? 0) > 0 || (summary?.conflicts ?? 0) > 0,
  );

  const dotClass = !online
    ? 'offline'
    : unreachable
      ? 'offline'
      : (summary?.conflicts ?? 0) > 0
        ? 'syncing'
        : '';

  const label = !online
    ? 'Sin conexión'
    : unreachable
      ? 'Supabase no responde'
      : summary
        ? `Sync ${formatDateTime(summary.lastSync)}`
        : 'Conectando…';

  return (
    <div className="sync-wrap">
      <div className="sync-pill" title="Estado de sincronización">
        <span className={`sync-dot ${dotClass}`} aria-hidden="true" />
        <span aria-live="polite">{label}</span>
      </div>

      {hasAlert ? (
        <div className="sync-alert" role="status">
          {queueCount > 0 ? (
            <span>
              {queueCount} cambio{queueCount === 1 ? '' : 's'} guardado
              {queueCount === 1 ? '' : 's'} en este dispositivo
            </span>
          ) : null}
          {(summary?.pendingOps ?? 0) > 0 ? (
            <span>
              {summary?.pendingOps} operación
              {summary?.pendingOps === 1 ? '' : 'es'} pendiente
              {summary?.pendingOps === 1 ? '' : 's'}
            </span>
          ) : null}
          {(summary?.conflicts ?? 0) > 0 ? (
            <Link href="/actividad">
              {summary?.conflicts} conflicto
              {summary?.conflicts === 1 ? '' : 's'} · revisar
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
