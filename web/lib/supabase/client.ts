'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from '@/lib/env';

export function createClient() {
  const { url, anonKey } = supabaseConfig();
  return createBrowserClient(url, anonKey);
}
