---
aliases: [Comandos Nmap, Machete Nmap]
---
# Nmap — comandos

[[00_Ciberseguridad|Inicio]] · [[Temas/Reconocimiento/Nmap|Nmap]] · [[Temas/Reconocimiento/Nmap - Scripts|Scripts]]

Ejemplos para un laboratorio propio. `127.0.0.1` es el propio equipo: sustituilo solo por un objetivo de práctica autorizado. No se ejecutaron estos comandos al preparar la nota.

## Consultar puertos TCP concretos

```bash
nmap -sT -p 22,80,443 127.0.0.1
```

`-sT` intenta conexiones TCP; `-p` limita los puertos. Mirá `PORT`, `STATE` y `SERVICE`. Puede no haber ningún servicio abierto: eso no es un fallo del comando. La salida real depende del equipo y su configuración.

## Identificar servicios

```bash
nmap -sT -sV -p 22,80,443 127.0.0.1
```

`-sV` agrega sondas para identificar el servicio y su versión. No confirma automáticamente vulnerabilidades.

## Opciones que conviene reconocer

| Opción | Para qué sirve |
| --- | --- |
| `-p 80,443` | Consulta solo esos puertos. |
| `-p-` | Puertos del 1 al 65535 del protocolo que estés escaneando; no añade UDP por sí sola. |
| `-sn` | Descubrimiento de hosts sin escaneo de puertos. |
| `-Pn` | Omite el descubrimiento previo; no atraviesa mágicamente un firewall. |
| `-sU` | Escaneo UDP; normalmente necesita privilegios para paquetes sin procesar. |
| `-sV` | Sondeos de identificación de servicios/versiones. |
| `-oN resultado.txt` | Guarda salida normal; cuidá el nombre porque puede reemplazar un archivo existente. |

El comando básico sin `-p` consulta por defecto los 1000 puertos TCP más frecuentes. `-sn` no equivale a “mandar únicamente un ping ICMP”: en el descubrimiento intervienen varias técnicas según privilegios y red.

## Elegir un rango de puertos

Los números de puerto van de 0 a 65535 por protocolo; 0 está reservado. El rango habitual 1–65535 contiene 65535 números. TCP y UDP tienen espacios separados; seleccionar un rango no agrega un protocolo.

```bash
nmap -sT -p1-18000 127.0.0.1
nmap -sT -p- 127.0.0.1
```

El primer ejemplo solicita del 1 al 18000 inclusive; el segundo, del 1 al 65535. Se hace explícito TCP con `-sT` para leer el ejemplo sin depender de privilegios. El propio equipo es solo un ejemplo documental; no se ejecutó. Esperar columnas PORT, STATE y SERVICE, o un resumen de puertos sin listar cada uno. No esperar que todos estén abiertos.

El `[IP]` del apunte representa el destino que habría que sustituir en un laboratorio autorizado; no se pega literalmente. Fuente: [Nmap, rangos](https://nmap.org/book/man-port-specification.html) y [RFC 6335 §6](https://www.rfc-editor.org/rfc/rfc6335#section-6).

## Leer la puerta de enlace antes de un ejemplo

En Linux, si `route` de net-tools está disponible, `route -n` muestra la tabla de rutas con direcciones numéricas. El `-n` evita resolver nombres: no es una búsqueda de routers.

```bash
route -n
```

Salida ficticia abreviada:

```text
Destination    Gateway       Genmask        Flags Iface
0.0.0.0        192.0.2.1     0.0.0.0        UG    eth0
192.0.2.0      0.0.0.0       255.255.255.0  U     eth0
```

Buscar la fila de destino 0.0.0.0 y máscara 0.0.0.0: su Gateway, 192.0.2.1, es el siguiente salto por defecto en este ejemplo. La fila del enlace local no usa gateway intermedio. No elegir cualquier celda de Gateway ni asumir la configuración de tu equipo. Puede haber varias rutas o faltar la ruta por defecto. Este comando solo muestra datos cuando se usa como aquí; no hace un escaneo. Fuente: [manual de route, -n y OUTPUT](https://man7.org/linux/man-pages/man8/route.8.html).

Correcciones y ampliaciones docentes, 20/10/2026, desde el [[Diario/2026-10-20/2026-10-20 - Apunte - texto observado al corte|apunte original evaluado]]. Se precisa la afirmación sobre 65535 puertos y la elección de Gateway; la selección de rango era correcta. Ejemplos agregados por el asistente, sin ejecución ni práctica acreditada. [[Diario/2026-10-20/2026-10-20 - Revision docente|Devolución]].

## Guardar un resultado de práctica

```bash
nmap -sT -p 22,80,443 -oN nmap-lab-01.txt 127.0.0.1
```

Cuando uses un comando en clase, anotá en el diario el objetivo, opciones, resultado y qué interpretaste. Después de revisarlo, incorporaremos acá las variantes útiles, con enlace a su día.

Ampliación del asistente, 20/10/2026. Fuentes oficiales: [puertos](https://nmap.org/book/man-port-specification.html), [técnicas](https://nmap.org/book/man-port-scanning-techniques.html), [descubrimiento](https://nmap.org/book/man-host-discovery.html), [versiones](https://nmap.org/book/man-version-detection.html), [salida](https://nmap.org/book/man-output.html).
