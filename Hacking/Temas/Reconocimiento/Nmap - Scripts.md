---
aliases: [Scripts Nmap, NSE, Automatizaciones Nmap]
---
# Nmap — scripts

[[00_Ciberseguridad|Inicio]] · [[Temas/Reconocimiento/Nmap|Nmap]] · [[Temas/Reconocimiento/Nmap - Comandos|Comandos]]

## Scripts NSE de Nmap

**NSE** es el motor de scripts de Nmap. Un script agrega una tarea concreta al reconocimiento, como consultar el título de una web. Los scripts NSE se escriben en Lua.

Para leer la ayuda de un script instalado:

```bash
nmap --script-help http-title
```

`--script-help` muestra documentación; no lanza ese script contra un objetivo. `http-title` consulta el título de una página web cuando se ejecuta como script. No se descargó ni ejecutó nada para esta nota. Conviene elegir scripts concretos y leer qué hacen: sus categorías no son una garantía de ausencia de efectos.

## Scripts propios y combinaciones de clase

Todavía no se identificó un script personal de Nmap entre los apuntes revisados. Cuando escribas uno, pegalo libremente en tu diario. La revisión lo incorporará acá con:

- Un título que diga qué resuelve.
- El código completo, cómo usarlo y qué archivo o resultado produce.
- Sus requisitos, límites y enlace al apunte original del día.

Un script Bash o Python que invoca Nmap es una automatización propia; no se convierte por eso en un script NSE.

Referencia del asistente, 20/10/2026. Fuentes: [manual NSE](https://nmap.org/book/man-nse.html), [http-title](https://nmap.org/nsedoc/scripts/http-title.html).
