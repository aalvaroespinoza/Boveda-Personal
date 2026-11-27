---
aliases: [Escaneo de puertos, Reconocimiento con Nmap]
---
# Nmap

[[00_Ciberseguridad|Inicio]]

Nmap (Network Mapper) consulta equipos y servicios para reconocer qué responde y cómo se presenta desde donde lo ejecutás. Un **puerto abierto** indica que hay un servicio aceptando comunicaciones; no demuestra por sí solo una vulnerabilidad.

- [[Temas/Reconocimiento/Nmap - Comandos|Comandos para copiar y entender]].
- [[Temas/Reconocimiento/Nmap - Scripts|Scripts NSE y automatizaciones guardadas]].
- [[Temas/Reconocimiento/ARP e ICMP|ARP e ICMP: descubrir vecinos y diagnosticar]].
- Antes: [[Temas/Conceptos basicos/TCP y UDP|TCP, UDP y puertos]] y [[Temas/Conceptos basicos/Subnetting|subnetting]].

## Cómo interpretar un resultado

| Estado | Qué informa |
| --- | --- |
| open | Un servicio acepta comunicaciones en ese puerto. |
| closed | El puerto responde, pero no hay un servicio aceptando allí. |
| filtered | Nmap no puede decidir si está abierto porque las sondas o respuestas están filtradas. |
| open\|filtered | La técnica usada no permite distinguir esas dos posibilidades. |

Sin detección de versiones, el nombre de servicio puede venir de asociar el número de puerto a una tabla: no identifica con certeza el programa real. Los resultados también dependen del punto desde donde se consulta.

## Ejemplo de lectura

Salida ficticia, sin ejecutar un escaneo:

```text
PORT     STATE     SERVICE
22/tcp   open      ssh
80/tcp   closed    http
443/tcp  filtered  https
```

En 22 hay un servicio accesible; en 80 no hay escucha según esa observación. En 443 Nmap no puede decidir si hay un servicio escuchando: el filtrado afecta las sondas o sus respuestas. **Filtrado no equivale a cerrado**. Los nombres de SERVICE en este ejemplo son asociaciones de puertos, no una detección del programa.

Ampliación docente integrada el 20/10/2026 a partir del [[Diario/2026-10-20/2026-10-20 - Apunte - texto observado al corte|apunte del día, versión evaluada]]: abierto/cerrado estaban orientados correctamente y filtrado aún vacío al corte. No se atribuye una confusión al estudiante ni se evalúa la adición posterior. Fuente: [Nmap, estados](https://nmap.org/book/man-port-scanning-basics.html). [[Diario/2026-10-20/2026-10-20 - Revision docente|Devolución y comprobación]].

Referencia complementaria del asistente, 20/10/2026; no acredita haber cursado o practicado Nmap. Fuentes: [estados de puertos](https://nmap.org/book/man-port-scanning-basics.html), [identificación de servicios](https://nmap.org/book/man-version-detection.html).

Validación docente del 22/10/2026: el agregado de definición en [[Diario/2026-10-20/2026-10-20 - Apunte|el apunte del 20/10]] describe correctamente su propósito de exploración y auditoría. Se integra el nombre completo, sin duplicar la explicación ni atribuir práctica. Fuente: [proyecto Nmap](https://nmap.org/). [[Diario/2026-10-20/2026-10-22 - Revision del agregado de Nmap|Revisión del agregado]].
