# MAC

[[00_Ciberseguridad|Inicio]] · [[Temas/Conceptos basicos/Conceptos Basicos|Conceptos básicos]]

## MAC: la dirección del enlace

Una MAC Ethernet habitual tiene **48 bits**: seis pares hexadecimales, como tu ejemplo `00:0c:29:c4:94:ab`.

En la asignación clásica, los primeros 24 bits corresponden al **OUI — Organizationally Unique Identifier**, asociado a una organización; el resto distingue interfaces dentro de esa asignación. No es una regla para todas las MAC: pueden ser administradas localmente, modificadas o aleatorizadas, y pueden existir duplicados. [RFC 7042](https://www.rfc-editor.org/rfc/rfc7042).

### ¿Uso la MAC del servidor remoto?

Normalmente, si el servidor está fuera de tu subred, el paquete mantiene su IP de destino remoto y la **trama local se dirige a la MAC de la puerta de enlace**. La puerta de enlace es el router al que confiás ese siguiente salto. En Ethernet, los routers generan nuevas tramas para los siguientes enlaces; la MAC no acompaña intacta el recorrido completo.

![[Recursos Visuales/Redes - IPv4 IPv6 y MAC#Cómo se relacionan]]

---
Reorganizado por tema el 20/10/2026 a partir de la guía existente: apuntes y ampliaciones previas, con sus fuentes y correcciones conservadas. No acredita práctica nueva.
