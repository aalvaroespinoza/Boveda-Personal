import DataError from '@/components/DataError';
import EmptyState from '@/components/EmptyState';
import Panel from '@/components/Panel';
import TaskForm from '@/components/TaskForm';
import TaskRow from '@/components/TaskRow';
import { inNextDays, isTodayOrOverdue } from '@/lib/labels';
import { createClientOrNull } from '@/lib/supabase/server';
import type { ProjectRow, TaskRow as Task } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TareasPage() {
  const supabase = await createClientOrNull();
  if (!supabase) return null;

  const [tasksResult, projectsResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null)
      .order('title', { ascending: true }),
  ]);

  const error = tasksResult.error ?? projectsResult.error;
  if (error) {
    return (
      <DataError message={error.message} code={error.code} hint={error.hint} />
    );
  }

  const tasks = (tasksResult.data ?? []) as Task[];
  const projects = (projectsResult.data ?? []) as ProjectRow[];
  const projectNames = Object.fromEntries(
    projects.map((project) => [project.id, project.title]),
  );

  const pending = tasks.filter((task) => task.status !== 'completed');
  const completed = tasks
    .filter((task) => task.status === 'completed')
    .slice(0, 8);

  const groups = [
    {
      title: 'Hoy y vencidas',
      items: pending.filter((task) => isTodayOrOverdue(task.due_date)),
    },
    {
      title: 'Próximos 7 días',
      items: pending.filter((task) => inNextDays(task.due_date, 7)),
    },
    {
      title: 'Sin fecha o más adelante',
      items: pending.filter(
        (task) =>
          !task.due_date ||
          (!isTodayOrOverdue(task.due_date) && !inNextDays(task.due_date, 7)),
      ),
    },
  ];

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Ejecución</div>
        <h1>Tareas</h1>
        <p>
          La acción concreta y su contexto. La sincronización con Google Tasks
          sigue siendo local.
        </p>
      </div>

      <Panel
        title="Nueva acción"
        description="Una próxima acción concreta y su contexto de resolución."
        className="section-gap"
      >
        <TaskForm projects={projects} />
      </Panel>

      <div className="split section-gap">
        <div className="stack">
          {groups.map((group) => (
            <Panel key={group.title} title={group.title}>
              {group.items.length ? (
                group.items.map((task) => (
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
                <EmptyState title="Sin tareas en este grupo" />
              )}
            </Panel>
          ))}
        </div>

        <Panel
          title="Completadas"
          description="Últimas tareas cerradas, para no perder el hilo."
        >
          {completed.length ? (
            completed.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                projectName={
                  task.project_id ? projectNames[task.project_id] : undefined
                }
              />
            ))
          ) : (
            <EmptyState
              title="Todavía no hay tareas completadas"
              detail="Cuando cierres una, queda acá."
            />
          )}
        </Panel>
      </div>
    </>
  );
}
