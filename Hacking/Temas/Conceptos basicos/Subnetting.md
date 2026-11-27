---
aliases: [Subredes, CIDR, Mascara de red, Network ID, Broadcast]
---
# Subnetting

[[00_Ciberseguridad|Inicio]] · [[Temas/Conceptos basicos/IP|IP]]

Subnetting divide una red en bloques más pequeños. El **prefijo** indica cuántos bits identifican la red; los restantes distinguen direcciones dentro del bloque. No depende de que los primeros números “parezcan clase A, B o C”.

En IPv4 hay 32 bits. En `/26`, 26 son de red y quedan 6: **2⁶ = 64 direcciones totales**. En una subred IPv4 ordinaria reservás la primera como dirección de red y la última como broadcast: **62 direcciones utilizables**.

## Ejemplo paso a paso

Para `192.168.1.70/26`:

1. Máscara: `255.255.255.192`. El último octeto es `11000000`: dos bits de red y seis de host.
2. Tamaño del bloque: `256 − 192 = 64` direcciones. Comienza en `.0`, `.64`, `.128` o `.192`.
3. `.70` está entre `.64` y `.127`, así que la red es **192.168.1.64**.
4. El siguiente bloque comienza en `.128`; el broadcast del actual es **192.168.1.127**.
5. Rango utilizable: **192.168.1.65–192.168.1.126**, 62 direcciones.

La dirección escrita antes de `/26` puede ser un host; no es automáticamente la dirección de red.

## Machete rápido

| Prefijo | Máscara | Totales | Utilizables en subred ordinaria |
| --- | --- | --- | --- |
| /24 | 255.255.255.0 | 256 | 254 |
| /25 | 255.255.255.128 | 128 | 126 |
| /26 | 255.255.255.192 | 64 | 62 |
| /27 | 255.255.255.224 | 32 | 30 |
| /28 | 255.255.255.240 | 16 | 14 |
| /29 | 255.255.255.248 | 8 | 6 |
| /30 | 255.255.255.252 | 4 | 2 |

La resta de dos **no es universal**: `/31` puede conectar dos extremos punto a punto y `/32` representa una única dirección. IPv6 no utiliza broadcast; esta tabla es IPv4.

## Para practicar y consultar

Revisión del 20/10/2026: en la [[Diario/2026-10-20/2026-10-20 - Fuentes de revision|captura de Machete recibida hoy]], la fila de `192.168.1.45/29` ya tiene red y broadcast correctos. Sigue pendiente justificar los límites y aclarar totales/utilizables con la tabla de arriba. [[Diario/2026-10-20/2026-10-20 - Revision docente|Devolución, procedimiento y siguiente paso]]. Es evidencia de corrección de valores, no de dominio; la fecha real de resolución no está declarada.

- [Tu machete y ejercicios en Sheets](https://docs.google.com/spreadsheets/d/17CF5xfhPW8zIvF75St5F5LsKliFFU-L3YM8Sg1hv5b8/edit#gid=2003694523).
- [Recurso de subnetting de Hack4u](https://hack4u.io/subnetting).
- [IP Calc mencionado en tu apunte](https://blog.jodies.de/ipcalc).
- [[Recursos Visuales/redes-ipv4.html|Explorador IPv4 local]]: abrir en navegador; no se confirmó incrustación interactiva en Obsidian.

## Comprobate

¿`.80` y `.130` pertenecen a la misma subred si ambas tienen `/26`?

> [!tip]- Respuesta
> No: `.80` pertenece a `.64/26` y `.130` a `.128/26`.

Ampliación del asistente, 20/10/2026, a partir de tu nota “dividir una red grande en varias pequeñas”. No es una entrega tuya ni resuelve la corrección pendiente de `.45/29`. Fuentes: [CIDR, RFC 4632](https://www.rfc-editor.org/rfc/rfc4632#section-3.1), [tabla IPv4, RFC 1878](https://www.rfc-editor.org/rfc/rfc1878.txt), [caso /31, RFC 3021](https://www.rfc-editor.org/rfc/rfc3021.txt).
