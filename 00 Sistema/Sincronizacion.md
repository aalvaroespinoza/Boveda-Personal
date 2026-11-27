# Sincronización

## Obsidian
La bóveda nueva debe configurarse con Remotely Save en Windows, HarmonyOS e iPhone usando **un destino remoto nuevo y exclusivo**. No copiar credenciales de otra bóveda ni mezclar dos servicios de sincronización. Antes de usarla a diario, probar una nota y un adjunto en los tres dispositivos.

## Tareas
Google Tasks y las notas de tareas en `06 Tareas` se concilian al iniciar Windows y periódicamente mientras esté encendido. Las ediciones móviles llegan a Windows mediante Remotely Save. Mientras Windows esté apagado, los cambios pueden quedar pendientes. Cada tarea conserva `task_id` y `google_id`. Si un mismo campo cambia en ambos lados, se genera un conflicto para revisión; jamás se sobreescribe silenciosamente.

La API de Google Tasks admite fecha sin hora. Bloques horarios y eventos se gestionan en Google Calendar. Los recordatorios antiguos de Apple no se migran.

## Copias de seguridad
Remotely Save sincroniza; no sustituye un respaldo recuperable. Mantener copias periódicas fuera del destino remoto de sincronización. No subir finanzas a repositorios públicos.
