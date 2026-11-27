'use client';

import { useEffect, useState } from 'react';
import SetupRequired from '@/components/SetupRequired';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';

function safeNext(value: string | null): string {
  if (!value) return '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const raw =
      params.get('error_description') ??
      params.get('error') ??
      hash.get('error_description') ??
      hash.get('error');

    if (raw) {
      setError(raw.replace(/\+/g, ' '));
    }
  }, []);

  if (!isSupabaseConfigured()) {
    return <SetupRequired />;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setState('sending');

    try {
      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);
      const next = safeNext(params.get('next'));
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (authError) throw authError;
      setState('sent');
    } catch (submitError) {
      setState('idle');
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo enviar el enlace de acceso',
      );
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Acceso privado</p>
        <h1>Bóveda Personal</h1>
        <p className="auth-lead">
          Entrá con un enlace por correo. No hay contraseña compartida ni acceso
          anónimo a los datos.
        </p>

        {state === 'sent' ? (
          <div className="auth-success" role="status">
            <strong>Revisá tu correo</strong>
            <p>
              Enviamos un enlace de acceso a <strong>{email}</strong>. Abrilo en
              este dispositivo para entrar.
            </p>
          </div>
        ) : (
          <form className="form" onSubmit={submit}>
            <label>
              Correo
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@correo.com"
              />
            </label>

            <div className="form-actions">
              <button
                type="submit"
                className="action"
                disabled={state === 'sending'}
              >
                {state === 'sending' ? 'Enviando…' : 'Enviar enlace de acceso'}
              </button>
            </div>
          </form>
        )}

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <p className="form-note">
          Si el correo no llega, revisá spam y la configuración de Auth en
          Supabase. Si el enlace falla, abrilo en el mismo navegador donde lo
          pediste.
        </p>
      </section>
    </main>
  );
}
