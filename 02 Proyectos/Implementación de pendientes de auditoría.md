---
id: pro-implementacion-pendientes-auditoria
tipo: proyecto
estado: en_espera
area: "[[00 Sistema/Plan maestro]]"
creado: 2026-11-26
origen: "Auditoría y pendientes"
revisado: 2026-11-26
fuentes:
  - "[[00 Sistema/Plan maestro]]"
---
# Implementación de pendientes de auditoría

## Resultado buscado

Que los mecanismos técnicos de la bóveda sean seguros y verificables, y que los pendientes que requieren evidencia personal o acceso externo permanezcan explícitos.

## Estado actual

Estructura, configuración diaria, plantillas, privacidad por defecto, curaduría de fuentes, estados de sincronización y respaldo cifrado preparados. No se declararon completas pruebas externas ni se cargaron datos personales o financieros.

El panel local recibió una renovación visual inspirada en patrones iOS. La publicación sin PC requiere migrar el almacenamiento y autenticación; ver [[00 Sistema/Migración web · Vercel y Supabase]].

La app web híbrida quedó implementada en `web/` (Next.js + Supabase), con migración SQL, sincronizador local `herramientas/sync_supabase.py` y pruebas. Compila, pasa lint y 10 pruebas unitarias; sin Supabase configurado muestra una guía de configuración y no datos ficticios. Falta crear el proyecto Supabase, aplicar la migración, probar auth/RLS/sync reales y desplegar en Vercel.

Se reportó un fallo después del login sin mensaje concreto. Se agregó `/api/health` para distinguir variables faltantes, sesión inválida, tablas ausentes y permisos; las páginas ahora muestran código y pasos, y el callback devuelve el motivo a `/login`. También se agregó `202611260002_explicit_grants.sql` con GRANT explícitos para `authenticated`, revocación de `anon` y recarga del esquema. La causa exacta sigue sin confirmar hasta probar contra el proyecto real.

## Próximo paso

Con el proyecto Supabase real, abrir `/api/health` después de iniciar sesión y actuar según el resultado: si faltan tablas, aplicar `supabase db push --yes --remote`; si faltan permisos, aplicar `202611260002_explicit_grants.sql`; si no hay sesión, revisar las Redirect URLs y el navegador del magic link. Después, probar auth/RLS con un segundo usuario y correr `sync_supabase.py --dry-run` antes de publicar en Vercel. En paralelo sigue pendiente definir el cifrado y la contraseña de respaldo.

## Decisiones

- [[00 Sistema/Privacidad de capturas externas]] fija la captura de Gmail sin metadatos sensibles mientras Dropbox no tenga cifrado decidido.
- La web usa Supabase como fuente operativa y Markdown/CSV local como archivo y contexto; el sync es por comando y nunca borra ni sobrescribe en silencio.
- Finanzas, adjuntos financieros, Gmail histórico y `Hacking/` quedan fuera del alcance de la migración web.

## Fuentes y archivos

- [[00 Sistema/Plan maestro]]
- Auditoría externa del 26-11-2026 proporcionada por el usuario.
- `web/README.md`, `supabase/migrations/202611260001_initial_schema.sql`, `supabase/migrations/202611260002_explicit_grants.sql`, `web/app/api/health/route.ts`, `herramientas/sync_supabase.py` y `tests/test_sync_supabase.py`.

## Historial breve

- 2026-11-26: implementación técnica inicial y registro de pendientes bloqueados.
- 2026-11-26: app web Next.js + Supabase, migración SQL, sincronizador y pruebas creados; build, lint y tests verificados localmente. Pendiente de credenciales, migración aplicada y deploy.
- 2026-11-26: diagnóstico posterior al login (`/api/health`, errores accionables, callback visible) y migración de GRANT explícitos. Build de 16 rutas verificado; causa del fallo original pendiente de confirmar contra Supabase real.
