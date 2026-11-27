---
id: dec-migracion-web-vercel-supabase
tipo: decision
estado: pendiente
creado: 2026-11-26
origen: solicitud_de_usuario
revisado: 2026-11-26
fuentes:
  - "[[02 Proyectos/Implementación de pendientes de auditoría]]"
  - "web/README.md"
  - "supabase/migrations/202611260001_initial_schema.sql"
  - "supabase/migrations/202611260002_explicit_grants.sql"
  - "herramientas/sync_supabase.py"
---
# Migración web · Vercel y Supabase

## Problema comprobado

El panel actual sirve archivos y escribe Markdown/CSV con Python desde la PC. Vercel ejecuta funciones efímeras: no puede usar la bóveda local como almacenamiento ni conservar cambios de archivos en el disco del servidor.

## Arquitectura elegida

- Vercel: interfaz web y API autenticada.
- Supabase: datos operativos que requieren acceso móvil sin PC: tareas, proyectos, capturas, actividad y estados de sincronización.
- Supabase Storage: bucket privado `attachments` para adjuntos que la persona decida subir. No hay subida automática en esta etapa.
- La bóveda Markdown: archivo local y fuente de contexto. La sincronización es explícita, por comando, con conflictos visibles.

Supabase es la fuente operativa; el Markdown local sigue siendo el archivo y el contexto. Ninguna nota se borra ni se sobrescribe en silencio.

## Estado de implementación · 2026-11-26

Código creado y verificado localmente. **No hay proyecto Supabase, credenciales, migración aplicada ni deploy reales.** Por lo tanto, auth, RLS, sincronización y Vercel están implementados pero **no probados contra un entorno real**.

### Creado

- `web/`: app Next.js 15.5.29 + React 19.1.10 + `@supabase/ssr` 0.12.7.
  - Login por magic link y callback `/auth/callback`.
  - Páginas Inicio, Tareas, Proyectos, Entrada y Actividad.
  - API con validación, control de versión y outbox.
  - Estado de sync honesto, cola offline en `localStorage` y aviso de conflictos.
  - Estilo iOS oscuro del panel local, responsive y con `prefers-reduced-motion`.
- `supabase/migrations/202611260001_initial_schema.sql`: tablas `projects`, `tasks`, `inbox_items`, `activity_entries`, `sync_operations` y `sync_conflicts`; triggers de `version`/`updated_at`; RLS por usuario; índices; `GRANT` explícitos para `authenticated`; recarga de esquema de PostgREST; bucket privado `attachments` con políticas por usuario.
- `supabase/migrations/202611260002_explicit_grants.sql`: refuerzo idempotente de permisos para proyectos donde la primera migración ya se aplicó. Corrige el caso de tablas sin `GRANT` y fuerza `notify pgrst, 'reload schema'`.
- `web/app/api/health/route.ts`: diagnóstico autenticado que informa si faltan variables, si no hay sesión y qué tabla falla, con una pista concreta. No expone claves.
- Errores de la app: las páginas muestran código, explicación y pasos; el callback de auth devuelve el motivo a `/login` en vez de fallar en silencio.
- `herramientas/sync_supabase.py`: modos `push`, `pull`, `sync` y `--dry-run`; IDs estables (UUID existente o UUIDv5 por ruta); detección de conflicto; outbox; registro de actividad; estado fuera de la bóveda.
- `tests/test_sync_supabase.py`: serialización Markdown ↔ modelo remoto, conflicto bilateral, outbox de tarea local y pull que no borra notas no relacionadas.

### Verificación real ejecutada

- `npm run typecheck`: sin errores.
- `npm run lint`: sin advertencias ni errores.
- `npm run build`: compila; 16 rutas generadas, incluida `/api/health`.
- `npm run start` sin variables: `/`, `/login`, `/tareas`, `/actividad` y `/api/health` responden 200; la app muestra “Falta conectar Supabase” o un diagnóstico honesto y no muestra datos ficticios.
- `/api/health` sin variables devuelve `configured: false` y una pista para crear `.env.local`; no lanza un 500.
- `python -m unittest discover -s tests -v`: 10 pruebas correctas (3 de finanzas y 7 nuevas de sync).
- `python herramientas/sync_supabase.py --mode sync --dry-run` sin variables: falla con código 2 y mensaje claro; no escribe nada.

### No verificado

- Magic link real, sesión, cookies y callback.
- RLS con un usuario real y con un segundo usuario.
- Migración aplicada en un proyecto Supabase.
- Sincronización real PC ↔ Supabase, incluido el manejo de conflictos en la nube.
- Deploy en Vercel y dominio de producción.

## Diagnóstico si todo falla después del login

La app tiene un endpoint `/api/health` que responde, sin exponer claves, si faltan variables, si hay sesión y qué tabla falla. También muestra el código de error en pantalla con una explicación en castellano.

| Resultado | Causa probable | Acción |
| --- | --- | --- |
| `configured: false` | Faltan `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Crear `web/.env.local` o cargarlas en Vercel; reiniciar |
| `authenticated: false` | El magic link se abrió en otro navegador o el callback no está permitido | Pedir un enlace nuevo y revisar las Redirect URLs |
| `42P01` o `PGRST205` | La migración no está aplicada en ese proyecto, o PostgREST no ve las tablas | `supabase db push --yes --remote` y `notify pgrst, 'reload schema';` |
| `42501` | Faltan permisos para `authenticated` o RLS bloquea | Aplicar `202611260002_explicit_grants.sql` |
| Todo `ok: true` | El error es de una consulta concreta | Revisar el detalle técnico de la página |

No se puede confirmar que el problema esté resuelto hasta probarlo contra un proyecto Supabase real con una sesión real.

## Pasos manuales para activar

Requieren cuenta, credenciales e instrucción explícita; no se ejecutaron.

El CLI actual es v3: los comandos de base de datos apuntan al stack local por defecto y los cambios hosteados piden confirmación. Por eso `db push` necesita `--remote` y, en un run no interactivo, `--yes`. La instalación global con `npm install -g supabase` ya no está soportada.

```powershell
# Windows: instalar el CLI con Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

cd "D:\Documentos\Boveda Personal"
supabase login
supabase init          # crea supabase/config.jsonc si falta

# Opción A: proyecto creado en el dashboard; copiar el project ref.
supabase link --project-ref <project-ref>

# Opción B: crear el proyecto desde el CLI
supabase orgs list
supabase projects create "boveda-personal" --org-id <org-id> --region <region> --db-password "<contraseña-fuerte>"
supabase link --project-ref <project-ref>

# Aplicar la migración al proyecto hosteado
supabase db push --yes --remote
supabase migration list --remote
```

Alternativa sin instalación global: usar `npx supabase@latest` en lugar de `supabase`. Sin `--remote`, `db push` apunta al stack local y no toca el proyecto.

1. En Supabase, habilitar Email/magic link y agregar
   `http://localhost:3000/auth/callback` y el futuro dominio de Vercel a las
   URLs permitidas.
2. Copiar `Project URL` y `anon key` a `web/.env.local`.
3. Crear o entrar con el usuario real y copiar su UUID de `auth.users`.
4. Definir en el entorno de Windows, fuera de la bóveda:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `BOVEDA_USER_ID`.
5. Ejecutar primero `python herramientas/sync_supabase.py --mode sync --dry-run`,
   revisar la salida y recién después correr sin `--dry-run`.
6. Desplegar:

```powershell
cd web
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production
vercel --prod
```

Después del deploy, agregar el dominio de producción en Supabase → Authentication → URL Configuration.

## Límites de datos

- No se migran finanzas ni datos financieros.
- No se migran adjuntos financieros ni capturas históricas de Gmail.
- No se migra `Hacking/`.
- No se suben adjuntos automáticamente.
- Los conflictos se muestran en la web, pero su resolución todavía es manual: no hay botón para elegir una versión.
- La `service_role` no va en la web ni en la bóveda; solo en el entorno local del sincronizador.

## Regla de seguridad

No migrar ni publicar capturas de Gmail, adjuntos financieros, secretos, tokens ni la bóveda completa sin una política de datos y Row Level Security verificada.
