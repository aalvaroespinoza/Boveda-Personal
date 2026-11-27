# Bóveda Personal · Web

App Next.js 15 (App Router) para usar la bóveda desde el teléfono o cualquier
navegador, con Supabase como fuente operativa. La bóveda Markdown sigue siendo
el archivo local y el contexto; esta app **no** lee ni escribe archivos de la PC.

Estado: código completo y compilado localmente. **Sin proyecto Supabase,
credenciales ni deploy reales todavía.** Nada de lo que depende de Supabase
(auth, RLS, datos, sync) está verificado contra un entorno real.

## Qué incluye

- Login por enlace de correo (magic link) con `@supabase/ssr`.
- Páginas: Inicio, Tareas, Proyectos, Entrada y Actividad.
- Alta de tareas, proyectos y capturas; completar tareas; convertir o descartar
  capturas.
- Estado honesto de sincronización: último sync, operaciones pendientes,
  conflictos y modo sin conexión.
- Cola local de cambios (`localStorage`) cuando el navegador está offline.
- Esquema SQL con RLS estricta, outbox (`sync_operations`) y conflictos
  (`sync_conflicts`).
- Sincronizador local `../herramientas/sync_supabase.py` con modos `push`,
  `pull`, `sync` y `--dry-run`.

## Requisitos

- Node.js 20 o superior (probado con 24.19.0).
- npm 10 o superior.
- Un proyecto Supabase (para desarrollo real y producción).
- Python 3.11+ con `requests` para el sincronizador (ya está en
  `../herramientas/requirements.txt`).

## Desarrollo local

```powershell
cd web
npm install
Copy-Item .env.example .env.local
# Completar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Abrir `http://localhost:3000`. Sin variables configuradas, la app muestra una
pantalla de configuración pendiente y no inventa datos.

## Configurar Supabase (manual, una vez)

Estos comandos requieren tu cuenta y credenciales. No se ejecutaron en esta
implementación.

### 1. Instalar el CLI (Windows)

`npm install -g supabase` **no está soportado** por el CLI actual. En Windows,
usá Scoop:

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
supabase --version
```

Alternativa sin instalación global, con `npx`:

```powershell
npx supabase@latest --version
```

En los comandos siguientes, reemplazá `supabase` por `npx supabase@latest` si
usás esa vía.

### 2. Crear y vincular el proyecto

El CLI v3 es **local por defecto**. Para hablar con el proyecto hosteado hay que
pasar `--remote` en los comandos de base de datos.

```powershell
cd "D:\Documentos\Boveda Personal"
supabase login
supabase init          # crea supabase/config.jsonc si falta

# Opción A (recomendada): crear el proyecto en el dashboard y copiar el project ref.
supabase link --project-ref <project-ref>

# Opción B: crear el proyecto desde el CLI
supabase orgs list
supabase projects create "boveda-personal" --org-id <org-id> --region <region> --db-password "<contraseña-fuerte>"
supabase link --project-ref <project-ref>
```

`supabase link` pide la contraseña de la base. Podés dejarla en blanco: con tu
sesión iniciada, el CLI puede usar un rol temporal.

### 3. Aplicar la migración

```powershell
supabase db push --yes --remote
supabase migration list --remote
```

`--remote` es obligatorio en v3 para apuntar al proyecto hosteado. `--yes` evita
la confirmación interactiva; si querés revisar antes, quitá `--yes` y respondé
`y`. Sin `--remote`, el comando intenta aplicar la migración al stack local.

`supabase db push` aplica las dos migraciones en orden:

1. `202611260001_initial_schema.sql`: tablas, RLS, outbox, conflictos y bucket.
2. `202611260002_explicit_grants.sql`: permisos explícitos para `authenticated`,
   revocación de `anon` y recarga del esquema de PostgREST. Es idempotente y
   sirve para reparar proyectos donde la primera ya se aplicó.

Después, en el panel de Supabase:

1. **Authentication → Providers → Email**: dejar habilitado el magic link.
2. **Authentication → URL Configuration**: agregar
   `http://localhost:3000/auth/callback` y, cuando exista, el dominio de Vercel
   `https://<proyecto>.vercel.app/auth/callback`.
3. Crear tu usuario (o entrar una vez con el magic link) y copiar su UUID desde
   **Authentication → Users**. Ese UUID es `BOVEDA_USER_ID` para el
   sincronizador.
4. Copiar `Project URL` y `anon public key` a `web/.env.local`.

La clave `service_role` **no** va en la web, ni en `.env.local`, ni en la
bóveda. Solo la usa el sincronizador local desde el entorno de Windows.

## Variables de entorno

### Web (`web/.env.local` y Vercel)

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública (protegida por RLS) |
| `NEXT_PUBLIC_SITE_URL` | URL pública de la app (`http://localhost:3000` en local) |

### Sincronizador local (entorno de Windows, fuera de la bóveda)

| Variable | Uso |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (o `SUPABASE_SECRET_KEY`) |
| `BOVEDA_USER_ID` | UUID del usuario en `auth.users` |
| `BOVEDA_SYNC_STATE` | Opcional: ruta del estado de sync |

Ejemplo (guardar como variables de usuario, no en un archivo de la bóveda):

```powershell
[Environment]::SetEnvironmentVariable('SUPABASE_URL', 'https://<ref>.supabase.co', 'User')
[Environment]::SetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', '<service-role>', 'User')
[Environment]::SetEnvironmentVariable('BOVEDA_USER_ID', '<uuid-del-usuario>', 'User')
```

Cerrar y volver a abrir la terminal después de definirlas.

## Sincronizador

```powershell
python herramientas/sync_supabase.py --mode push            # PC → Supabase
python herramientas/sync_supabase.py --mode pull            # Supabase → PC
python herramientas/sync_supabase.py --mode sync            # ambos
python herramientas/sync_supabase.py --mode sync --dry-run  # solo muestra
```

Alcance:

- Lee solo notas con frontmatter `tipo: tarea`, `tipo: proyecto` o
  `tipo: entrada`.
- Nunca toca `Hacking/`, finanzas, adjuntos originales ni capturas de Gmail.
- Nunca borra notas locales ni filas remotas. Una desaparición se registra como
  conflicto visible.
- Si local y remoto cambiaron desde el último sync, no aplica nada y registra el
  conflicto en `sync_conflicts`.
- El estado por defecto vive en
  `%LOCALAPPDATA%\ObsidianPersonalSync\supabase_sync_state.json`, fuera de la
  bóveda.
- Registra la corrida en `08 Automatizacion/Actividad/<mes>.md` y en
  `activity_entries` de Supabase.

Sin las variables de entorno, el script falla con código 2 y no escribe nada.

## Desplegar en Vercel (manual)

```powershell
npm install -g vercel
cd web
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production
vercel --prod
```

Después del deploy, agregar el dominio de producción en **Supabase →
Authentication → URL Configuration**. Sin ese paso, el magic link vuelve a
`localhost` y no funciona desde el teléfono.

## Si después del login todo falla

Abrí `/api/health` en la app. Devuelve un JSON con el estado de la sesión y de
cada tabla. No muestra datos personales de otras cuentas ni claves.

| Síntoma en `/api/health` | Causa probable | Solución |
| --- | --- | --- |
| `configured: false` | Faltan las variables públicas | Crear `web/.env.local` o cargarlas en Vercel y reiniciar |
| `authenticated: false` | No hay sesión válida | Pedir un enlace nuevo y abrirlo en el mismo navegador |
| Tabla con `code: "42P01"` o `PGRST205` | La migración no está aplicada en ese proyecto, o PostgREST no ve las tablas | `supabase db push --yes --remote` y después `notify pgrst, 'reload schema';` |
| Tabla con `code: "42501"` | Faltan `GRANT` para `authenticated` o RLS bloquea | Aplicar `202611260002_explicit_grants.sql` |
| Todo `ok: true` y la página igual falla | El error es de la consulta concreta | Revisar el detalle técnico que muestra la página |

La app ahora muestra en pantalla el código del error, una explicación en
castellano y un enlace a `/api/health`. Si el magic link falla, el motivo
aparece en `/login` en lugar de volver silenciosamente al formulario.

## Verificación

```powershell
cd web
npm run typecheck
npm run lint
npm run build

cd ..
python -m unittest discover -s tests -v
python herramientas/sync_supabase.py --mode sync --dry-run   # debe fallar claro sin env
```

Resultado de esta implementación: `typecheck`, `lint`, `build` y las 10 pruebas
Python pasan. La app responde 200 en `/`, `/login`, `/tareas`, `/actividad` y
`/api/health` sin Supabase configurado, mostrando la guía de configuración o un
diagnóstico honesto. **No se probaron auth, RLS, migración aplicada ni sync
contra Supabase real.**

## Límites deliberados

- No se migran finanzas, adjuntos financieros, Gmail histórico ni `Hacking/`.
- El bucket `attachments` existe y es privado, pero no hay subida automática.
- Los conflictos se muestran, pero todavía no hay botón para elegir una versión; la resolución es manual.
- No hay despliegue, proyecto Supabase ni secretos creados por este código.
- El panel local (`herramientas/panel.py`) sigue funcionando y no se modificó.
