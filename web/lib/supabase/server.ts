import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isSupabaseConfigured, supabaseConfig } from '@/lib/env';

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Un Server Component no puede escribir cookies.
          // El middleware se encarga de refrescar la sesión.
        }
      },
    },
  });
}

/**
 * Devuelve null cuando Supabase todavía no está configurado, para que las
 * páginas puedan mostrar la guía de configuración en vez de lanzar un error.
 */
export async function createClientOrNull() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}
