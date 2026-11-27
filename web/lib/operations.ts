import type { SupabaseClient } from '@supabase/supabase-js';

export interface OperationInput {
  userId: string;
  entity: 'task' | 'project' | 'inbox' | 'activity';
  entityId: string;
  operation: 'upsert' | 'delete';
  payload: unknown;
  origin?: string;
}

export async function startOperation(
  supabase: SupabaseClient,
  input: OperationInput,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('sync_operations')
    .insert({
      user_id: input.userId,
      entity: input.entity,
      entity_id: input.entityId,
      operation: input.operation,
      payload: input.payload,
      origin: input.origin ?? 'web',
    })
    .select('id')
    .single();

  if (error) return null;
  return (data as { id: string }).id;
}

export async function finishOperation(
  supabase: SupabaseClient,
  operationId: string | null,
  errorMessage?: string,
): Promise<void> {
  if (!operationId) return;

  await supabase
    .from('sync_operations')
    .update({
      processed_at: new Date().toISOString(),
      error: errorMessage ?? null,
    })
    .eq('id', operationId);
}
