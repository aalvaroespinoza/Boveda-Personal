import DataError from '@/components/DataError';
import EmptyState from '@/components/EmptyState';
import Panel from '@/components/Panel';
import ProjectForm from '@/components/ProjectForm';
import StatusBadge from '@/components/StatusBadge';
import { formatDate, projectStatusLabel } from '@/lib/labels';
import { createClientOrNull } from '@/lib/supabase/server';
import type { ProjectRow, TaskRow as Task } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProyectosPage() {
  const supabase = await createClientOrNull();
  if (!supabase) return null;

  const [projectsResult, tasksResult] = await Promise.all([
    supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('id, project_id, status')
      .is('deleted_at', null),
  ]);

  const error = projectsResult.error ?? tasksResult.error;
  if (error) {
    return (
      <DataError message={error.message} code={error.code} hint={error.hint} />
    );
  }

  const projects = (projectsResult.data ?? []) as ProjectRow[];
  const tasks = (tasksResult.data ?? []) as Pick<
    Task,
    'id' | 'project_id' | 'status'
  >[];

  const openByProject = tasks.reduce<Record<string, number>>((acc, task) => {
    if (task.project_id && task.status !== 'completed') {
      acc[task.project_id] = (acc[task.project_id] ?? 0) + 1;
    }
    return acc;
  }, {});

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Contexto</div>
        <h1>Proyectos</h1>
        <p>
          Resultado, decisiones y próximo paso para volver sin reconstruir la
          historia.
        </p>
      </div>

      <div className="split">
        <Panel
          title="Proyectos registrados"
          description="El panel muestra lo que existe; no crea progreso ficticio."
        >
          {projects.length ? (
            <div className="project-list">
              {projects.map((project) => (
                <article key={project.id} className="project-card">
                  <div className="project-card-head">
                    <h3>{project.title}</h3>
                    <StatusBadge
                      label={projectStatusLabel[project.status]}
                      tone={project.status === 'active' ? 'accent' : 'neutral'}
                    />
                  </div>

                  <div className="row-meta">
                    {project.area ? (
                      <span className="meta-pill">{project.area}</span>
                    ) : null}
                    <span className="meta-pill">
                      {openByProject[project.id] ?? 0} tareas abiertas
                    </span>
                    <span className="meta-pill">
                      Rev. {formatDate(project.updated_at.slice(0, 10))}
                    </span>
                  </div>

                  {project.result ? (
                    <p className="row-body">
                      <strong>Resultado:</strong> {project.result}
                    </p>
                  ) : null}
                  {project.current_state ? (
                    <p className="row-body">
                      <strong>Estado:</strong> {project.current_state}
                    </p>
                  ) : null}
                  {project.next_step ? (
                    <div className="row-meta-step">
                      ↳ Próximo paso: {project.next_step}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin proyectos registrados"
              detail="Definí un resultado antes de llenar la lista de acciones."
            />
          )}
        </Panel>

        <Panel
          title="Nuevo proyecto"
          description="Definí el resultado antes de llenar la lista de acciones."
        >
          <ProjectForm />
        </Panel>
      </div>
    </>
  );
}
