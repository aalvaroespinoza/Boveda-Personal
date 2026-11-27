import DataError from '@/components/DataError';
import EmptyState from '@/components/EmptyState';
import InboxForm from '@/components/InboxForm';
import InboxItem from '@/components/InboxItem';
import Panel from '@/components/Panel';
import { createClientOrNull } from '@/lib/supabase/server';
import type { InboxRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EntradaPage() {
  const supabase = await createClientOrNull();
  if (!supabase) return null;

  const result = await supabase
    .from('inbox_items')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (result.error) {
    return (
      <DataError
        message={result.error.message}
        code={result.error.code}
        hint={result.error.hint}
      />
    );
  }

  const items = (result.data ?? []) as InboxRow[];
  const pending = items.filter((item) => item.status === 'pending');
  const processed = items.filter((item) => item.status !== 'pending');

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Entrada</div>
        <h1>Capturar</h1>
        <p>Guardá primero. Decidí el destino cuando tengas contexto.</p>
      </div>

      <div className="split">
        <Panel
          title="Nueva captura"
          description="Texto, enlaces o fragmentos que todavía no querés procesar."
        >
          <InboxForm />
        </Panel>

        <Panel
          title="Entrada pendiente"
          description="Elementos que esperan una decisión de archivo o ejecución."
        >
          {pending.length ? (
            pending.map((item) => <InboxItem key={item.id} item={item} />)
          ) : (
            <EmptyState
              title="Entrada al día"
              detail="No hay capturas pendientes de procesar."
            />
          )}
        </Panel>
      </div>

      {processed.length ? (
        <Panel
          title="Procesadas y descartadas"
          description="Historial reciente de decisiones sobre la entrada."
          className="section-gap"
        >
          {processed.map((item) => (
            <InboxItem key={item.id} item={item} />
          ))}
        </Panel>
      ) : null}
    </>
  );
}
