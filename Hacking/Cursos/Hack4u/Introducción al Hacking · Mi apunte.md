---
aliases: [Mi apunte de hacking, Apunte central, Introducción al Hacking]
cssclasses: [ciber-apunte]
---
# Introducción al Hacking · Mi apunte

[[00_Ciberseguridad|Inicio]] · [[Diario/00_Diario|Mis días]] · [Curso](https://hack4u.io/curso/introduccion-al-hacking/)

> [!info] Tu nota de consulta
> Síntesis de lo que ya escribiste o procesaste, con enlaces al origen. Las correcciones se identifican; no son práctica nueva tuya. Tu diario queda intacto.

## Índice

[[#Conceptos básicos|Conceptos básicos]] · [[#Reconocimiento|Reconocimiento]] · [[#Laboratorios en Docker|Docker]] · [[#Enumeración de servicios y CMS|Servicios y CMS]] · [[#Enumeración y explotación|Explotación]] · [[#OWASP y vulnerabilidades web|Web]] · [[#Escalada de privilegios|Escalada]] · [[#Buffer overflow|Buffer overflow]] · [[#Máquinas y material adicional|Máquinas]] · [[#Reportes|Reportes]]

## Conceptos básicos

### IP y MAC

Son parte de tu recorrido previo. Las guías antiguas mezclan notas y ampliaciones del tutor; todavía no se trasladan como si todo lo hubieras procesado. Conservamos ese material y completaremos esta síntesis al identificar el original correspondiente.

### TCP, UDP y puertos

Origen: [[Cursos/Hack4u/Fuentes/2026-09-11 - Protocolos/Transcripcion de las capturas|Tus manuscritos del 11/09]].

**TCP** es orientado a conexión. Anotaste comprobación de errores, entrega ordenada e inicio de conexión mediante **SYN → SYN-ACK → ACK**. El handshake sincroniza números de secuencia y reconocimiento.

**UDP** es sin conexión y no garantiza por sí mismo la entrega ni el orden.

> [!note]- Precisión del tutor · 23/10/2026
> “TCP garantiza entrega” no significa que una conexión nunca falle. En UDP, “no garantiza errores” tampoco significa que no haya mecanismos de comprobación de integridad. Se corrigen afirmaciones presentes en tu manuscrito.
> Fundamentos: [TCP](https://www.rfc-editor.org/rfc/rfc9293), [UDP](https://www.rfc-editor.org/rfc/rfc768).

| Puerto anotado | Servicio |
| --- | --- |
| 21 | FTP · transferencia de archivos |
| 22 | SSH · administración remota segura |
| 23 | Telnet · conexión remota |
| 80 | HTTP · intercambio de contenido web |
| 443 | HTTPS · HTTP protegido mediante TLS |

### Modelo OSI

Tu manuscrito identifica **siete capas**. No trasladamos automáticamente la ampliación larga anterior: falta distinguir qué parte procesaste vos. Origen: [[Cursos/Hack4u/Fuentes/2026-09-11 - Protocolos/Transcripcion de las capturas#Segunda captura: otros puertos y UDP|Manuscrito]].

### Subnetting

Origen: [Tu Machete y ejercicios](https://docs.google.com/spreadsheets/d/17CF5xfhPW8zIvF75St5F5LsKliFFU-L3YM8Sg1hv5b8/edit#gid=2003694523). El cuestionario aprobado ya consta en el registro previo.

Tu tabla relaciona prefijos con máscaras y tamaño del bloque. En los ejercicios calculaste máscara, hosts utilizables, dirección de red y broadcast.

| Caso de tu Machete | Máscara | Utilizables | Red | Broadcast |
| --- | --- | --- | --- | --- |
| 192.168.1.0/26 | 255.255.255.192 | 62 | 192.168.1.0 | 192.168.1.63 |
| 13.13.13.13/13 | 255.248.0.0 | 524286 | 13.8.0.0 | 13.15.255.255 |

> [!note]- Corrección de encabezado · revisión del 19/10
> En tu tabla de potencias, “Total Hosts” cuenta direcciones totales. En una subred IPv4 ordinaria, la red y el broadcast no son hosts utilizables: /26 tiene 64 direcciones y 62 utilizables. Los resultados de arriba proceden de tu hoja; esta precisión es del tutor.
> [Fundamento: tabla IPv4, RFC 1878](https://www.rfc-editor.org/rfc/rfc1878).

## Reconocimiento

### Nmap

Origen: [[Diario/2026-10-20/2026-10-20 - Apunte|Tu apunte del 20/10]], incluida la definición que agregaste antes de la revisión del 22/10. La versión previa a las correcciones se conserva en el respaldo.

Nmap es una herramienta de escaneo para explorar y auditar redes y sistemas. En tu primera clase anotaste selección de puertos, consulta de rutas y estados de puertos.

### Comandos que anotaste

| Comando | Uso registrado |
| --- | --- |
| `nmap -p- IP` | Seleccionar los puertos 1 a 65535 |
| `nmap -p1-18000 IP` | Seleccionar el rango 1 a 18000 |
| `route -n` | Consultar rutas con direcciones numéricas |

**IP** es un marcador del destino del laboratorio del curso. Estos son ejemplos documentales; no demuestran ejecución.

> [!note]- Correcciones del tutor sobre tu apunte
> Del 0 al 65535 existen 65536 números de puerto; 1–65535 contiene 65535. La opción `-p` selecciona puertos, no activa UDP por sí sola.
>
> Para identificar la puerta de enlace por defecto no alcanza con tomar cualquier Gateway: se busca la fila de ruta por defecto, con Destination y Genmask en 0.0.0.0.
>
> Fuentes de comprobación: [selección de puertos](https://nmap.org/book/man-port-specification.html), [manual de route](https://man7.org/linux/man-pages/man8/route.8.html). Correcciones ya relacionadas con la revisión del 20/10; consolidadas el 23/10.

### Estados de puertos que anotaste

| Estado | Resumen corregido |
| --- | --- |
| Abierto | Hay una aplicación aceptando comunicaciones en ese puerto |
| Cerrado | El puerto responde, pero no hay una aplicación escuchando |
| Filtrado | Nmap no puede determinar si está abierto por filtrado de sondas o respuestas |

“Filtrado” estaba sin explicación en tu texto original: esa definición es del tutor sobre el mismo tema. [Fundamento](https://nmap.org/book/man-port-scanning-basics.html).

**Para retomar:** seguí la clase donde la dejaste. No hay un minuto registrado y no lo inventamos.

## Laboratorios en Docker

Etapa posterior del curso. Sin contenido incorporado todavía.

## Enumeración de servicios y CMS

Etapa posterior del curso. Sin contenido incorporado todavía.

## Enumeración y explotación

Etapa posterior del curso. Sin contenido incorporado todavía.

## OWASP y vulnerabilidades web

Etapa posterior del curso. Sin contenido incorporado todavía.

## Escalada de privilegios

Etapa posterior del curso. Sin contenido incorporado todavía.

## Buffer overflow

Etapa posterior del curso. Sin contenido incorporado todavía.

## Máquinas y material adicional

Etapas posteriores del curso. Sin contenido incorporado todavía.

## Reportes

Etapa posterior del curso. Sin contenido incorporado todavía.

---

Consolidación: 23/10/2026. Solo fuentes identificables de tus notas y ejercicios, con correcciones relacionadas. Las ampliaciones de guías anteriores no se dan por estudiadas.
