-- Bóveda Personal · esquema operativo para Supabase
-- Fecha: 2026-11-26
--
-- Alcance deliberado:
--   * Solo datos operativos: proyectos, tareas, entrada, actividad y sincronización.
--   * NO incluye finanzas, adjuntos financieros, capturas históricas de Gmail,
--     secretos, tokens ni el contenido de Hacking.
--   * RLS estricta por usuario. El frontend usa la clave anónima y la sesión;
--     nunca la service_role.
--
-- Aplicar con: supabase db push --yes --remote
-- (CLI v3: sin --remote apunta al stack local)
-- o:          psql "$DATABASE_URL" -f supabase/migrations/202611260001_initial_schema.sql

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create or replace function public.touch_row()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  new.version := coalesce(old.version, 0) + 1;
  return new;
end;
$$;

create or replace function public.prevent_user_id_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id no se puede modificar';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Proyectos
-- ---------------------------------------------------------------------------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  status text not null default 'active',
  area text not null default '',
  result text not null default '',
  current_state text not null default '',
  next_step text not null default '',
  source_path text,
  origin text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  deleted_at timestamptz,
  constraint projects_title_len check (char_length(title) between 1 and 200),
  constraint projects_status_check check (status in ('active', 'waiting', 'paused', 'done', 'archived')),
  constraint projects_version_check check (version > 0),
  constraint projects_id_user_unique unique (id, user_id)
);

-- ---------------------------------------------------------------------------
-- Tareas
-- ---------------------------------------------------------------------------

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  status text not null default 'pending',
  due_date date,
  priority text not null default 'normal',
  project_id uuid,
  context text not null default '',
  google_id text,
  source_path text,
  origin text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  deleted_at timestamptz,
  constraint tasks_title_len check (char_length(title) between 1 and 200),
  constraint tasks_status_check check (status in ('pending', 'pending_sync', 'completed', 'waiting', 'blocked')),
  constraint tasks_priority_check check (priority in ('high', 'normal', 'low')),
  constraint tasks_version_check check (version > 0),
  constraint tasks_project_fk
    foreign key (project_id, user_id)
    references public.projects (id, user_id)
    on delete set null (project_id)
);

-- ---------------------------------------------------------------------------
-- Entrada / capturas
-- ---------------------------------------------------------------------------

create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  body text not null default '',
  source text not null default 'Otra',
  status text not null default 'pending',
  source_path text,
  origin text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  deleted_at timestamptz,
  constraint inbox_items_title_len check (char_length(title) between 1 and 200),
  constraint inbox_items_status_check check (status in ('pending', 'processed', 'discarded')),
  constraint inbox_items_version_check check (version > 0)
);

-- ---------------------------------------------------------------------------
-- Actividad de automatización
-- ---------------------------------------------------------------------------

create table if not exists public.activity_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  agent text not null default 'desconocido',
  action text not null,
  result text not null default '',
  files jsonb not null default '[]'::jsonb,
  errors text not null default '',
  review_status text not null default 'pending',
  source_path text,
  origin text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  deleted_at timestamptz,
  constraint activity_action_len check (char_length(action) between 1 and 500),
  constraint activity_review_check check (review_status in ('pending', 'reviewed')),
  constraint activity_version_check check (version > 0)
);

-- ---------------------------------------------------------------------------
-- Outbox de operaciones
-- ---------------------------------------------------------------------------

create table if not exists public.sync_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entity text not null,
  entity_id uuid not null,
  operation text not null,
  payload jsonb not null default '{}'::jsonb,
  origin text not null default 'web',
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  constraint sync_operations_entity_check check (entity in ('task', 'project', 'inbox', 'activity')),
  constraint sync_operations_operation_check check (operation in ('upsert', 'delete'))
);

-- ---------------------------------------------------------------------------
-- Conflictos de sincronización
-- ---------------------------------------------------------------------------

create table if not exists public.sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entity text not null,
  entity_id uuid not null,
  local_version jsonb not null default '{}'::jsonb,
  remote_version jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  status text not null default 'pending',
  resolution jsonb,
  resolved_at timestamptz,
  constraint sync_conflicts_entity_check check (entity in ('task', 'project', 'inbox')),
  constraint sync_conflicts_status_check check (status in ('pending', 'resolved', 'ignored'))
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

create index if not exists projects_user_updated_idx
  on public.projects (user_id, updated_at desc);
create index if not exists projects_user_status_idx
  on public.projects (user_id, status) where deleted_at is null;

create index if not exists tasks_user_due_idx
  on public.tasks (user_id, due_date) where deleted_at is null;
create index if not exists tasks_user_status_idx
  on public.tasks (user_id, status) where deleted_at is null;
create index if not exists tasks_project_idx
  on public.tasks (project_id) where deleted_at is null;

create index if not exists inbox_user_status_idx
  on public.inbox_items (user_id, status) where deleted_at is null;
create index if not exists inbox_user_updated_idx
  on public.inbox_items (user_id, updated_at desc);

create index if not exists activity_user_occurred_idx
  on public.activity_entries (user_id, occurred_at desc);

create index if not exists sync_operations_pending_idx
  on public.sync_operations (user_id, created_at) where processed_at is null;
create index if not exists sync_operations_user_created_idx
  on public.sync_operations (user_id, created_at desc);

create index if not exists sync_conflicts_pending_idx
  on public.sync_conflicts (user_id, detected_at desc) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Triggers de versión y updated_at
-- ---------------------------------------------------------------------------

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch
  before update on public.projects
  for each row execute function public.touch_row();

drop trigger if exists projects_user_guard on public.projects;
create trigger projects_user_guard
  before update on public.projects
  for each row execute function public.prevent_user_id_change();

drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch
  before update on public.tasks
  for each row execute function public.touch_row();

drop trigger if exists tasks_user_guard on public.tasks;
create trigger tasks_user_guard
  before update on public.tasks
  for each row execute function public.prevent_user_id_change();

drop trigger if exists inbox_items_touch on public.inbox_items;
create trigger inbox_items_touch
  before update on public.inbox_items
  for each row execute function public.touch_row();

drop trigger if exists inbox_items_user_guard on public.inbox_items;
create trigger inbox_items_user_guard
  before update on public.inbox_items
  for each row execute function public.prevent_user_id_change();

drop trigger if exists activity_entries_touch on public.activity_entries;
create trigger activity_entries_touch
  before update on public.activity_entries
  for each row execute function public.touch_row();

drop trigger if exists activity_entries_user_guard on public.activity_entries;
create trigger activity_entries_user_guard
  before update on public.activity_entries
  for each row execute function public.prevent_user_id_change();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.inbox_items enable row level security;
alter table public.activity_entries enable row level security;
alter table public.sync_operations enable row level security;
alter table public.sync_conflicts enable row level security;

-- Proyectos
drop policy if exists projects_select_own on public.projects;
create policy projects_select_own on public.projects
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own on public.projects
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own on public.projects
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Tareas
drop policy if exists tasks_select_own on public.tasks;
create policy tasks_select_own on public.tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists tasks_insert_own on public.tasks;
create policy tasks_insert_own on public.tasks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists tasks_update_own on public.tasks;
create policy tasks_update_own on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists tasks_delete_own on public.tasks;
create policy tasks_delete_own on public.tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Entrada
drop policy if exists inbox_select_own on public.inbox_items;
create policy inbox_select_own on public.inbox_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists inbox_insert_own on public.inbox_items;
create policy inbox_insert_own on public.inbox_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists inbox_update_own on public.inbox_items;
create policy inbox_update_own on public.inbox_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists inbox_delete_own on public.inbox_items;
create policy inbox_delete_own on public.inbox_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Actividad
drop policy if exists activity_select_own on public.activity_entries;
create policy activity_select_own on public.activity_entries
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists activity_insert_own on public.activity_entries;
create policy activity_insert_own on public.activity_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists activity_update_own on public.activity_entries;
create policy activity_update_own on public.activity_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists activity_delete_own on public.activity_entries;
create policy activity_delete_own on public.activity_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Outbox
drop policy if exists sync_operations_select_own on public.sync_operations;
create policy sync_operations_select_own on public.sync_operations
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists sync_operations_insert_own on public.sync_operations;
create policy sync_operations_insert_own on public.sync_operations
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists sync_operations_update_own on public.sync_operations;
create policy sync_operations_update_own on public.sync_operations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists sync_operations_delete_own on public.sync_operations;
create policy sync_operations_delete_own on public.sync_operations
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Conflictos
drop policy if exists sync_conflicts_select_own on public.sync_conflicts;
create policy sync_conflicts_select_own on public.sync_conflicts
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists sync_conflicts_insert_own on public.sync_conflicts;
create policy sync_conflicts_insert_own on public.sync_conflicts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists sync_conflicts_update_own on public.sync_conflicts;
create policy sync_conflicts_update_own on public.sync_conflicts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists sync_conflicts_delete_own on public.sync_conflicts;
create policy sync_conflicts_delete_own on public.sync_conflicts
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Ningún acceso anónimo a datos personales.
revoke all on table public.projects from anon;
revoke all on table public.tasks from anon;
revoke all on table public.inbox_items from anon;
revoke all on table public.activity_entries from anon;
revoke all on table public.sync_operations from anon;
revoke all on table public.sync_conflicts from anon;

-- Permisos explícitos para usuarios autenticados. No dependemos de los
-- privilegios por defecto del proyecto: si el proyecto usa
-- auto_expose_new_tables = false, sin estos GRANT todo falla con 42501.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.projects,
  public.tasks,
  public.inbox_items,
  public.activity_entries,
  public.sync_operations,
  public.sync_conflicts
  to authenticated;

-- Fuerza a PostgREST a recargar el esquema después de crear las tablas.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Storage privado para adjuntos (no se sube nada automáticamente)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists attachments_read_own on storage.objects;
create policy attachments_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists attachments_insert_own on storage.objects;
create policy attachments_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists attachments_update_own on storage.objects;
create policy attachments_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists attachments_delete_own on storage.objects;
create policy attachments_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
