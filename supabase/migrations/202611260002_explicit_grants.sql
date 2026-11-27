-- Bóveda Personal · permisos explícitos y recarga de esquema
-- Fecha: 2026-11-26
--
-- Refuerzo idempotente para proyectos donde la migración inicial ya se aplicó.
-- Corrige el caso en que las tablas existen pero el rol authenticated no tiene
-- GRANT (por ejemplo, proyectos con auto_expose_new_tables = false) y fuerza a
-- PostgREST a recargar el esquema si la tabla existe pero no aparece en la API.
--
-- Aplicar con: supabase db push --yes --remote

begin;

grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.projects,
  public.tasks,
  public.inbox_items,
  public.activity_entries,
  public.sync_operations,
  public.sync_conflicts
  to authenticated;

-- Los datos personales no se exponen al rol anónimo.
revoke all on table public.projects from anon;
revoke all on table public.tasks from anon;
revoke all on table public.inbox_items from anon;
revoke all on table public.activity_entries from anon;
revoke all on table public.sync_operations from anon;
revoke all on table public.sync_conflicts from anon;

notify pgrst, 'reload schema';

commit;
