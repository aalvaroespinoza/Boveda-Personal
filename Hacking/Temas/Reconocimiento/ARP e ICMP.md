---
aliases: [ARP, ICMP, Ping, Descubrimiento de hosts]
---
# ARP e ICMP

[[00_Ciberseguridad|Inicio]] · [[Temas/Reconocimiento/Nmap|Nmap]]

## ARP: encontrar una MAC vecina

En una red Ethernet con IPv4, ARP permite preguntar qué MAC corresponde a una IPv4 del enlace local. No busca la MAC de un servidor a través de todos los routers.

**Ejemplo:** si tu PC `192.168.1.10/24` quiere enviar a `192.168.1.20` en el mismo enlace, puede resolver la MAC de `.20`. Para un destino de otra red, normalmente resuelve la MAC de su puerta de enlace. IPv6 utiliza Neighbor Discovery, no ARP.

## ICMP: información y diagnóstico de IP

ICMPv4 transporta mensajes de control, errores y diagnóstico. `ping` suele usar Echo Request/Echo Reply; existen otros mensajes, como destino inalcanzable o tiempo excedido. ICMP no es un puerto TCP o UDP.

## Comando de ejemplo

```bash
ping -c 4 127.0.0.1
```

Ejemplo para Linux: envía cuatro solicitudes al propio equipo. Si recibís respuestas, confirma ese intercambio; no prueba conectividad con Internet. Si no recibís respuesta de un equipo remoto, puede haber filtrado: no demuestra por sí solo que esté apagado. En Windows el límite de cantidad se escribe `-n 4`.

## Para no mezclarlos

| Necesito entender | Mecanismo |
| --- | --- |
| Qué MAC usar para un vecino IPv4 en Ethernet | ARP |
| Mensajes de diagnóstico/control de IPv4 | ICMPv4 |
| Qué servicio responde en un puerto | TCP/UDP y herramientas como Nmap |

Ampliación del asistente, 20/10/2026. Ejemplos no ejecutados. Fuentes: [ARP, RFC 826](https://www.rfc-editor.org/rfc/rfc826), [ICMPv4, RFC 792](https://www.rfc-editor.org/rfc/rfc792), [Neighbor Discovery, RFC 4861](https://www.rfc-editor.org/rfc/rfc4861).
