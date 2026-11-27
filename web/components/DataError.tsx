import Link from 'next/link';

interface DataErrorProps {
  message: string;
  code?: string | null;
  hint?: string | null;
}

function explain(
  message: string,
  code: string | null | undefined,
): { summary: string; steps: string[] } {
  const text = message.toLowerCase();

  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    text.includes('schema cache') ||
    text.includes('does not exist')
  ) {
    return {
      summary:
        'Supabase no encuentra las tablas de la bóveda en este proyecto. Lo más probable es que la migración no se haya aplicado al proyecto correcto.',
      steps: [
        'Aplicá todas las migraciones de supabase/migrations/ con supabase db push --yes --remote.',
        'Si ya las aplicaste, recargá el esquema con: notify pgrst, \'reload schema\';',
        'Revisá que NEXT_PUBLIC_SUPABASE_URL apunte al mismo proyecto donde aplicaste las migraciones.',
      ],
    };
  }

  if (
    code === '42501' ||
    text.includes('permission denied') ||
    text.includes('row-level security')
  ) {
    return {
      summary:
        'La sesión existe, pero el rol authenticated no puede leer esta tabla. Faltan permisos o una política RLS.',
      steps: [
        'Aplicá supabase/migrations/202611260002_explicit_grants.sql.',
        'Verificá que las políticas RLS comparen auth.uid() con user_id.',
        'Si usás un usuario distinto al dueño de los datos, la tabla se ve vacía por diseño.',
      ],
    };
  }

  if (
    code === 'PGRST301' ||
    code === 'PGRST303' ||
    text.includes('jwt') ||
    text.includes('token')
  ) {
    return {
      summary:
        'La sesión no es válida o venció. El enlace de acceso puede haberse abierto en otro navegador o dispositivo.',
      steps: [
        'Cerrá sesión y pedí un enlace nuevo desde /login.',
        'Abrí el enlace en el mismo navegador donde lo pediste.',
        'Revisá que /auth/callback esté en la lista de Redirect URLs de Supabase.',
      ],
    };
  }

  return {
    summary:
      'Supabase respondió con un error. No se muestra información inventada ni datos parciales.',
    steps: [
      'Abrí /api/health para ver qué tabla o permiso falla.',
      'Revisá las variables de entorno y el estado del proyecto Supabase.',
    ],
  };
}

export default function DataError({ message, code, hint }: DataErrorProps) {
  const { summary, steps } = explain(message, code);

  return (
    <section className="panel data-error" role="alert">
      <h2>No se pudieron cargar los datos</h2>
      <p>{summary}</p>

      <ol className="setup-list">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <p className="form-note">
        Diagnóstico automático: <Link href="/api/health">/api/health</Link>
      </p>

      <details>
        <summary>Detalle técnico</summary>
        <pre className="json-preview">
          {code ? `[${code}] ` : ''}
          {message}
          {hint ? `\n${hint}` : ''}
        </pre>
      </details>
    </section>
  );
}
