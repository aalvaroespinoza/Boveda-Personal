---
aliases: ["IP", "IPv4", "IPv6"]
---
# IP

[[00_Ciberseguridad|Inicio]] · [[Temas/Conceptos basicos/Conceptos Basicos|Conceptos básicos]]

## IP: la dirección de red

Una dirección IP identifica lógicamente una **interfaz**. Una computadora puede tener varias interfaces y varias IP; por ejemplo, una para Wi-Fi y otra para Ethernet. No equivale necesariamente a identificar una persona.

### IPv4: 32 bits y cuatro octetos

Tu ejemplo `192.168.111.42` tiene cuatro números decimales. Cada uno representa **8 bits** y puede valer de **0 a 255**. Son cuatro grupos de 8 bits, no cuatro pares.

Hay `2^32 = 4.294.967.296` patrones posibles; no todos pueden asignarse como direcciones públicas de equipos.

El **prefijo** indica qué parte identifica la red. En `192.168.111.42/24`, los primeros 24 bits corresponden a la red: `192.168.111.0/24`; quedan 8 bits para hosts. No siempre se divide después del tercer número.

![[Recursos Visuales/Redes - IPv4 IPv6 y MAC#IPv4: cuatro octetos]]

**Privada no significa cifrada.** `192.168.111.42` pertenece al espacio privado. Los rangos privados IPv4 son `10.0.0.0/8`, `172.16.0.0/12` y `192.168.0.0/16`; se reutilizan en redes diferentes y no se anuncian como destinos globales de Internet. [RFC 1918](https://www.rfc-editor.org/rfc/rfc1918).

### IPv6: más espacio de direcciones

IPv6 tiene **128 bits**, es decir, `2^128 = 340282366920938463463374607431768211456` patrones posibles. Tu ejemplo completo es:

`2001:0db8:85a3:0000:0000:8a2e:0370:7334`

Son ocho grupos hexadecimales de 16 bits. Cada dígito hexadecimal representa 4 bits. Puede abreviarse como `2001:db8:85a3::8a2e:370:7334`: se omiten ceros iniciales y `::` sustituye grupos de ceros una sola vez. [RFC 4291](https://www.rfc-editor.org/rfc/rfc4291).

Para experimentar con el prefijo IPv4: [[Recursos Visuales/Redes - IPv4 IPv6 y MAC#Explorador IPv4 — añadido 2026-09-09|explorador y ejercicios]].

---
Reorganizado por tema el 20/10/2026 a partir de la guía existente: apuntes y ampliaciones previas, con sus fuentes y correcciones conservadas. No acredita práctica nueva.
