# Procesos y flujos

## Estados del trabajo en Bash
```mermaid
flowchart TD
 F["Ejecutando en primer plano"] -->|"Ctrl+Z"| S["Suspendido"]
 S -->|"bg"| B["Ejecutando en segundo plano"]
 S -->|"fg"| F
 B -->|"fg"| F
 F -->|"Termina"| T["Finalizado"]
 B -->|"Termina"| T
```

Se muestra control de trabajos en una terminal interactiva, no todos los estados del planificador Linux. `jobs` lista los trabajos de esa shell. Fuente: [Bash, JOB CONTROL](https://manpages.debian.org/bookworm/bash/bash.1.en.html#JOB_CONTROL).

## Tres canales
```mermaid
flowchart TD
 I["stdin: descriptor 0"] --> C["Comando"]
 C --> O["stdout: descriptor 1"]
 C --> E["stderr: descriptor 2"]
 O -->|"tubería normal"| N["stdin del siguiente comando"]
 E --> P["Terminal, salvo redirección"]
```

Probá mentalmente: si un comando falla, ¿`| wc -l` contará necesariamente el error? No: la tubería normal transporta stdout. Véase [[Temas/Linux/07_Texto_y_tuberias_Gemini]].
