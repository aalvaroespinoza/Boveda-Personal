import Link from 'next/link';
import DataError from '@/components/DataError';
import EmptyState from '@/components/EmptyState';
import Panel from '@/components/Panel';
import StatusBadge from '@/components/StatusBadge';
import TaskRow from '@/components/TaskRow';
import { getSyncSummary } from '@/lib/data';
import { formatDateTime, projectStatusLabel } from '@/lib/labels';
import { createClientOrNull } from '@/lib/supabase/server';
import type {
  ActivityRow,
  ProjectRow,
  TaskRow as Task,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClientOrNull();
  if (!supabase) return null;

  const [tasksResult, projectsResult, inboxResult, activityResult, summary] =
    await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('projects')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false }),
      supabase
        .from('inbox_items')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .is('deleted_at', null),
      supabase
        .from('activity_entries')
        .select('*')
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false })
        .limit(4),
      getSyncSummary(supabase),
    ]);

  const error =
    tasksResult.error ??
    projectsResult.error ??
    inboxResult.error ??
    activityResult.error;

  if (error) {
    return (
      <DataError message={error.message} code={error.code} hint={error.hint} />
    );
  }

  const tasks = (tasksResult.data ?? []) as Task[];
  const projects = (projectsResult.data ?? []) as ProjectRow[];
  const activity = (activityResult.data ?? []) as ActivityRow[];
  const inboxCount = inboxResult.count ?? 0;

  const pending = tasks.filter((task) => task.status !== 'completed');
  const projectNames = Object.fromEntries(
    projects.map((project) => [project.id, project.title]),
  );

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Hoy</div>
        <h1>Hoy</h1>
        <p>{today}</p>
      </div>

      <section className="hero" aria-label="Resumen del día">
        <div>
          <span className="hero-kicker">CENTRO DE CONTROL</span>
          <h2>Tu contexto, listo para actuar.</h2>
          <p>
            Priorizá lo que mueve el día y dejá el resto en un lugar confiable.
          </p>
        </div>
        <Link className="hero-action" href="/entrada">
          <span aria-hidden="true">＋</span>
          Capturar
        </Link>
      </section>

      <div className="split-home">
        <div className="stack">
          <Panel
            title="Necesita tu atención"
            description="Acciones que podés resolver o retomar ahora."
            action={
              <Link className="link-action" href="/tareas">
                Ver tareas →
              </Link>
            }
          >
            {pending.length ? (
              pending
                .slice(0, 5)
                .map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    projectName={
                      task.project_id
                        ? projectNames[task.project_id]
                        : undefined
                    }
                  />
                ))
            ) : (
              <EmptyState
                title="Sin tareas urgentes"
                detail="No hay acciones pendientes cargadas."
              />
            )}
          </Panel>

          <Panel
            title="Para retomar"
            description="Proyectos con su estado y próximo paso visible."
            action={
              <Link className="link-action" href="/proyectos">
                Abrir proyectos →
              </Link>
            }
          >
            {projects.length ? (
              projects.slice(0, 5).map((project) => (
                <div key={project.id} className="row project-row">
                  <div className="row-main">
                    <div className="row-title">{project.title}</div>
                    <div className="row-meta">
                      <StatusBadge
                        label={projectStatusLabel[project.status]}
                        tone={project.status === 'active' ? 'accent' : 'neutral'}
                      />
                      {project.area ? (
                        <span className="meta-pill">{project.area}</span>
                      ) : null}
                    </div>
                    {project.next_step ? (
                      <div className="row-meta-step">
                        ↳ Próximo paso: {project.next_step}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="Sin proyectos registrados"
                detail="Creá un proyecto para preservar contexto y próximo paso."
              />
            )}
          </Panel>
        </div>

        <div className="stack">
          <Panel
            title="Espacios de contexto"
            description="Navegación directa por área de trabajo."
          >
            <div className="space-grid">
              <Link className="space" href="/tareas">
                <small>Acción</small>
                <strong>Tareas</strong>
                <span>
                  {pending.length
                    ? `${pending.length} pendientes`
                    : 'Al día'}
                </span>
              </Link>
              <Link className="space" href="/proyectos">
                <small>Contexto</small>
                <strong>Proyectos</strong>
                <span>
                  {projects.length
                    ? `${projects.length} registrados`
                    : 'Sin proyectos'}
                </span>
              </Link>
              <Link className="space" href="/entrada">
                <small>Captura</small>
                <strong>Entrada</strong>
                <span>
                  {inboxCount ? `${inboxCount} por procesar` : 'Al día'}
                </span>
              </Link>
              <Link className="space" href="/actividad">
                <small>Estado</small>
                <strong>Sync</strong>
                <span>
                  {summary.conflicts
                    ? `${summary.conflicts} conflictos`
                    : summary.lastSync
                      ? formatDateTime(summary.lastSync)
                      : 'Sin sync'}
                </span>
              </Link>
            </div>
          </Panel>

          <Panel
            title="Actividad reciente"
            description="Lo último que corrió o cambió."
            action={
              <Link className="link-action" href="/actividad">
                Ver todo →
              </Link>
            }
          >
            {activity.length ? (
              <ul className="mini-timeline">
                {activity.map((entry) => (
                  <li key={entry.id}>
                    <strong>{entry.action}</strong>
                    <span>
                      {entry.agent} · {formatDateTime(entry.occurred_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Sin actividad registrada"
                detail="Las corridas del sincronizador aparecerán acá."
              />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
