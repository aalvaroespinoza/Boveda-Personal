export type TaskStatus =
  | 'pending'
  | 'pending_sync'
  | 'completed'
  | 'waiting'
  | 'blocked';

export type TaskPriority = 'high' | 'normal' | 'low';

export type ProjectStatus =
  | 'active'
  | 'waiting'
  | 'paused'
  | 'done'
  | 'archived';

export type InboxStatus = 'pending' | 'processed' | 'discarded';

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  priority: TaskPriority;
  project_id: string | null;
  context: string;
  google_id: string | null;
  source_path: string | null;
  origin: string;
  created_at: string;
  updated_at: string;
  version: number;
  deleted_at: string | null;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  status: ProjectStatus;
  area: string;
  result: string;
  current_state: string;
  next_step: string;
  source_path: string | null;
  origin: string;
  created_at: string;
  updated_at: string;
  version: number;
  deleted_at: string | null;
}

export interface InboxRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  source: string;
  status: InboxStatus;
  source_path: string | null;
  origin: string;
  created_at: string;
  updated_at: string;
  version: number;
  deleted_at: string | null;
}

export interface ActivityRow {
  id: string;
  user_id: string;
  occurred_at: string;
  agent: string;
  action: string;
  result: string;
  files: string[];
  errors: string;
  review_status: 'pending' | 'reviewed';
  source_path: string | null;
  origin: string;
  created_at: string;
  updated_at: string;
  version: number;
  deleted_at: string | null;
}

export interface ConflictRow {
  id: string;
  user_id: string;
  entity: 'task' | 'project' | 'inbox';
  entity_id: string;
  local_version: Record<string, unknown>;
  remote_version: Record<string, unknown>;
  detected_at: string;
  status: 'pending' | 'resolved' | 'ignored';
  resolution: Record<string, unknown> | null;
  resolved_at: string | null;
}

export interface OperationRow {
  id: string;
  user_id: string;
  entity: 'task' | 'project' | 'inbox' | 'activity';
  entity_id: string;
  operation: 'upsert' | 'delete';
  payload: Record<string, unknown>;
  origin: string;
  created_at: string;
  processed_at: string | null;
  error: string | null;
}

export interface SyncSummary {
  pendingOps: number;
  conflicts: number;
  lastSync: string | null;
}
