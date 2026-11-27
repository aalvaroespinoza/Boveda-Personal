# Hallazgos de automatización

Registrar fecha, tarea, resultado observado, fuente, qué funcionó y qué debe cambiar en la próxima ejecución.

## 2026-11-26 · Auditoría e implementación inicial

- Resultado comprobado: el colector de Gmail queda configurado para no persistir asunto, remitente ni fecha; la configuración revisable está en herramientas/reglas_gmail.json.
- Resultado comprobado: el colector de YouTube no devuelve fuentes hasta que una persona agregue un canal aprobado con identificador estable y se verifica duración real.
- Resultado comprobado: respaldo.py no produce un ZIP cuando falta una contraseña externa válida o pyzipper.

## 2026-11-26 · Implementación web híbrida (Next.js + Supabase)

- Resultado comprobado: en Next.js App Router el layout y la página de una misma ruta se renderizan en paralelo. Un guard `isSupabaseConfigured()` solo en el layout no evita que la página llame a `createClient()`; hay que guardar también en cada página y en cada API route. Fuente: log de `next start` sin variables y corrección aplicada.
- Resultado comprobado: `next build` genera 16 rutas (incluida `/api/health`) y `next lint` pasa sin advertencias con ESLint 8 + `eslint-config-next` 15.5.29; `next lint` ya está deprecado y conviene migrar al CLI de ESLint antes de Next 16.
- Resultado comprobado: las notas de tareas existentes usan `task_id`/`google_id` que no siempre son UUID. Usar UUIDv5 determinístico por ruta permite sincronizar sin mutar la nota y sin colisiones; el `google_id` original se conserva como texto en la columna remota.
- Resultado comprobado: `python -m unittest discover -s tests` informa 10 pruebas correctas; PowerShell puede mostrar el bloque de stderr como error de comando aunque los tests pasen, así que hay que leer el resumen y `$LASTEXITCODE`.
- Pendiente de comprobar: auth, RLS, migración aplicada, sync real y deploy. No hay credenciales ni proyecto Supabase.
- Resultado comprobado: con Supabase sin configurar, `/api/health` responde 200 con `configured: false`, `authenticated: false` y una pista concreta; no lanza 500 ni inventa datos. `npm run build` compila la ruta y `next start` no escribe errores en stderr. Fuente: prueba local en el puerto 3100.
- Pendiente de comprobar: la causa del fallo reportado después del login. Las tres candidatas son migración no aplicada en el proyecto correcto, falta de `GRANT` para `authenticated`, o sesión/callback inválido. `/api/health` distingue los tres casos, pero no se ejecutó contra un proyecto real.
- Resultado comprobado con el CLI v3.4.0 (`--help`) y la documentación oficial (26-11-2026): el CLI v3 es local por defecto; `supabase db push` necesita `--remote` para el proyecto hosteado y `--yes` en runs no interactivos. `npm install -g supabase` ya no está soportado: usar Scoop, `npx supabase@latest` o una dependencia local. `supabase init` funciona con `supabase/migrations` ya existente y crea `supabase/config.jsonc`. Fuente: CLI v3.4.0 y guía «Migrating to Supabase CLI v3».
