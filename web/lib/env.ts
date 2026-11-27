function readUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return value ? value.replace(/\/+$/, '') : undefined;
}

function readAnonKey(): string | undefined {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return value || undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(readUrl() && readAnonKey());
}

export function supabaseConfig(): { url: string; anonKey: string } {
  const url = readUrl();
  const anonKey = readAnonKey();

  if (!url || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. Copiá web/.env.example a web/.env.local y completá los datos del proyecto Supabase.',
    );
  }

  return { url, anonKey };
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') ||
    'http://localhost:3000'
  );
}
