import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, supabaseConfig } from '@/lib/env';

const PUBLIC_PATHS = ['/login', '/auth'];

function withRefreshedCookies(
  target: NextResponse,
  source: NextResponse,
): NextResponse {
  const headers = source.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = headers.getSetCookie?.() ?? [];

  if (setCookies.length) {
    for (const cookie of setCookies) {
      target.headers.append('set-cookie', cookie);
    }
    return target;
  }

  // Fallback para runtimes sin Headers.getSetCookie: conserva al menos el valor.
  for (const { name, value } of source.cookies.getAll()) {
    target.cookies.set(name, value);
  }

  return target;
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;

  // El callback canjea el código y escribe la sesión. No hace falta que el
  // middleware intente refrescar una sesión que todavía no existe.
  if (path === '/auth' || path.startsWith('/auth/')) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseConfig();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some(
    (publicPath) => path === publicPath || path.startsWith(`${publicPath}/`),
  );

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', path);
    return withRefreshedCookies(NextResponse.redirect(loginUrl), response);
  }

  if (user && path === '/login') {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    homeUrl.search = '';
    return withRefreshedCookies(NextResponse.redirect(homeUrl), response);
  }

  return response;
}
