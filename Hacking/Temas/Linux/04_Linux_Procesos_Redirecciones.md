# Procesos y Redirecciones

## Control de Procesos
Cada proceso tiene un **PID** único.

| Comando | Acción |
| :--- | :--- |
| `ps aux` | Muestra todos los procesos corriendo. |
| `top` / `htop` | Monitor de recursos en tiempo real. |
| `kill PID` | Mata un proceso por su número ID. |
| `ctrl + z` | Pausa un proceso (Background). |
| `bg` / `fg` | Mover proceso al fondo o al frente. |

### Truco Pro: Ejecución Silenciosa
```bash
wireshark >& /dev/null & disown

```

## Revisión técnica — 2026-09-09
Se cerró el bloque Bash anterior; el comando original se conserva.

`Ctrl+Z` suspende: no deja el programa ejecutándose al fondo. `bg` lo reanuda allí. `kill PID` envía por defecto SIGTERM; el proceso puede manejarla y no terminar inmediatamente. `disown` quita el trabajo de la tabla de Bash; no garantiza que cualquier aplicación sobreviva al cierre de toda la sesión. Fuente: [manual de Bash](https://manpages.debian.org/bookworm/bash/bash.1.en.html).

## Ver estados y canales
![[Recursos Visuales/Linux - Procesos y flujos]]

## Ejemplo pequeño sin Wireshark
```bash
printf 'ok\n' | wc -l
printf 'fallo\n' >&2
```

El primero produce `1`: `printf` entrega una línea por stdout y `wc -l` la cuenta. El segundo muestra `fallo` por stderr.

`>` reemplaza contenido del destino; `>>` agrega al final. En `comando > salida.txt 2>&1`, stderr se dirige al mismo destino que stdout; el orden importa. El ejemplo de Wireshark descarta ambas salidas, arranca al fondo y usa `disown`; puede ocultar información útil para diagnosticar.
