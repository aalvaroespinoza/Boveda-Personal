export default function SetupRequired() {
  return (
    <main className="auth-page">
      <section className="auth-card setup-card">
        <p className="eyebrow">Configuración pendiente</p>
        <h1>Falta conectar Supabase</h1>
        <p className="auth-lead">
          La app está creada, pero todavía no tiene las variables públicas del
          proyecto. No se muestra ningún dato ficticio.
        </p>

        <ol className="setup-list">
          <li>
            Copiá <code>web/.env.example</code> a <code>web/.env.local</code>.
          </li>
          <li>
            Completá <code>NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> con los datos del
            proyecto Supabase.
          </li>
          <li>
            Aplicá la migración de <code>supabase/migrations/</code>.
          </li>
          <li>
            Reiniciá <code>npm run dev</code>.
          </li>
        </ol>

        <p className="form-note">
          La clave <code>service_role</code> no va en la web ni en la bóveda.
          Solo la usa el sincronizador local, fuera de este proyecto.
        </p>
      </section>
    </main>
  );
}
