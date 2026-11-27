# DNS

[[00_Ciberseguridad|Inicio]] · [[Temas/Conceptos basicos/Conceptos Basicos|Conceptos básicos]]

## DNS: pasar del nombre a la dirección

**DNS — Domain Name System** permite consultar información asociada a nombres. Para buscar direcciones, los registros **A** contienen IPv4 y los **AAAA**, IPv6. Un nombre puede tener varias direcciones; distintas webs pueden compartir una IP.

Ejemplo didáctico: consultás `servidor.example` y obtenés `192.0.2.10`. DNS ayuda a localizarlo; **no descarga la página** ni establece la conexión HTTPS por vos. El sistema puede reutilizar una respuesta guardada en caché, por lo que no siempre consulta por la red.

DNS clásico utiliza **53/UDP y 53/TCP**. No conviene memorizar que “DNS siempre es UDP”. [RFC 1035](https://www.rfc-editor.org/rfc/rfc1035).

---
Reorganizado por tema el 20/10/2026 a partir de la guía existente: apuntes y ampliaciones previas, con sus fuentes y correcciones conservadas. No acredita práctica nueva.
