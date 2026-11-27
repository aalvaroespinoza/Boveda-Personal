import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

function safeNext(value: string | null): string {
  if (!value) return '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

function loginWithError(origin: string, message: string): NextResponse {
  const url = new URL('/login', origin);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = safeNext(url.searchParams.get('next'));
  const providerError =
    url.searchParams.get('error_description') ?? url.searchParams.get('error');

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }

  if (providerError) {
    return loginWithError(url.origin, providerError);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    return loginWithError(
      url.origin,
      `No se pudo validar el enlace: ${error.message}`,
    );
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    return loginWithError(
      url.origin,
      `No se pudo validar el enlace: ${error.message}`,
    );
  }

  return loginWithError(
    url.origin,
    'El enlace de acceso no traía un código válido. Pedí uno nuevo.',
  );
}
