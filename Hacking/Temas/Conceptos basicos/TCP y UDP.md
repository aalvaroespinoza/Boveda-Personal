---
aliases: ["TCP", "UDP", "Puertos", "Handshake"]
---
# TCP y UDP

[[00_Ciberseguridad|Inicio]] · [[Temas/Conceptos basicos/Conceptos Basicos|Conceptos básicos]]

## Protocolos: TCP, UDP y puertos

Un **protocolo** es un conjunto de reglas para comunicarse. TCP y UDP transportan datos entre aplicaciones, tanto en una red local como a través de Internet.

### TCP: una conversación con seguimiento

**TCP — Transmission Control Protocol** está orientado a conexión. Usa secuencias, confirmaciones y retransmisiones para entregar a la aplicación un flujo de bytes fiable y ordenado.

> [!important] Precisión sobre tu apunte
> “Garantiza la entrega” no significa que los datos lleguen pase lo que pase: la conexión puede fallar. Los segmentos pueden llegar desordenados por la red; TCP reconstruye el orden de los **bytes** antes de entregarlos a la aplicación. Tampoco cifra por sí mismo.

### Qué significa recibir un flujo de bytes

Si una aplicación envía `HOLA` y luego `MUNDO`, TCP no promete que la otra aplicación los lea en dos mensajes separados: puede leer `HOLAMUNDO` o varios fragmentos. El protocolo de aplicación define dónde empieza y termina cada mensaje.

En UDP se conservan los límites de los datagramas recibidos, pero un datagrama puede perderse o llegar fuera de orden. **Fiabilidad y cifrado son propiedades diferentes**: recuperar datos no los vuelve secretos.

### Three-way handshake: iniciar una conexión TCP

1. **SYN:** el cliente propone iniciar la conexión y anuncia su secuencia inicial.
2. **SYN-ACK:** el servidor confirma la del cliente y anuncia la suya.
3. **ACK:** el cliente confirma la del servidor.

![[Recursos Visuales/Redes - TCP UDP puertos y OSI#Handshake TCP]]

**SYN** alude a sincronizar; **ACK**, a confirmar recepción. El campo `ack` indica el siguiente número de secuencia esperado. No es un inicio de sesión con contraseña ni el handshake de TLS. [TCP: RFC 9293](https://www.rfc-editor.org/rfc/rfc9293).

### UDP: datagramas sin conexión previa

**UDP — User Datagram Protocol** envía mensajes llamados **datagramas**, sin un handshake de transporte como el de TCP. Por sí solo no confirma recepción, retransmite pérdidas ni garantiza orden; una aplicación puede agregar esos mecanismos.

> [!important] Precisión sobre “no garantiza entrega de datos ni errores”
> UDP no garantiza entrega ni ausencia de errores, pero sí contempla una **suma de comprobación (checksum)** para detectar corrupción. Detectar un error no equivale a corregirlo o reenviar el mensaje. En IPv4 puede omitirse; en IPv6 se exige normalmente, con excepciones específicas.

Referencias: [UDP, RFC 768](https://www.rfc-editor.org/rfc/rfc768) y [UDP sobre IPv6, RFC 8200, sección 8.1](https://www.rfc-editor.org/rfc/rfc8200#section-8.1).

### Comparar para entender

| Pregunta | TCP | UDP por sí solo |
| --- | --- | --- |
| ¿Establece conexión? | Sí | No |
| ¿Qué recibe la aplicación? | Flujo de bytes ordenado | Datagramas separados |
| ¿Reenvía lo perdido? | Sí, puede intentar recuperarlo | No |
| ¿Garantiza que nunca falle? | No | No |
| ¿Incluye cifrado propio? | No | No |

![[Recursos Visuales/Redes - TCP UDP puertos y OSI#TCP y UDP ante una pérdida]]

### Cuándo importa cada diferencia

Para descargar un archivo necesitás recuperar todas sus partes. En una comunicación en tiempo real, esperar indefinidamente por un dato viejo puede ser peor que continuar. Esto explica decisiones de diseño; no significa que TCP sea siempre lento o UDP siempre rápido. La red y los mecanismos de la aplicación también influyen.

### Puertos comunes: a qué servicio quiero llegar

Un puerto es un **número lógico**, no un conector físico. TCP y UDP tienen espacios de puertos separados: `443/TCP` y `443/UDP` no son el mismo punto de transporte.

| Puerto habitual | Servicio de tu apunte | Para qué sirve | Precisión útil |
| --- | --- | --- | --- |
| **21/TCP** | **FTP — File Transfer Protocol** | Transferir archivos | El 21 es el canal de control; los datos usan otra conexión. FTP básico no cifra |
| **22/TCP** | **SSH — Secure Shell** | Acceso y administración remotos | Protege la comunicación mediante cifrado y autenticación |
| **23/TCP** | **Telnet** | Terminal remota | Telnet básico no cifra; las credenciales pueden quedar expuestas |
| **80/TCP** | **HTTP — Hypertext Transfer Protocol** | Intercambiar solicitudes y respuestas web | HTTP sin TLS no protege el contenido mediante cifrado |
| **443/TCP** | **HTTPS — HTTP protegido con TLS** | Comunicación web protegida | Para HTTP/1.1 y HTTP/2 sobre TLS/TCP; HTTP/3 usa QUIC sobre UDP, habitualmente 443/UDP |

Son asociaciones habituales: un administrador puede usar otros puertos. Ver el número **no prueba** qué servicio está ejecutándose. [Registro de puertos de IANA](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml).

> [!note] Actualización de “SSL/TLS” en tu manuscrito
> Para las conexiones actuales hablamos de **TLS**; SSL es su predecesor obsoleto. HTTPS protege el canal, pero no garantiza que el sitio sea honesto. [TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446). La variante HTTP/3 se describe en [RFC 9114](https://www.rfc-editor.org/rfc/rfc9114).

![[Recursos Visuales/Redes - TCP UDP puertos y OSI#Una IP, distintos puertos]]

### Puerto de origen, puerto de destino y conexión

El servicio puede escuchar en `443`, mientras el cliente usa temporalmente `53000`. En TCP, las IP y puertos de **ambos extremos** permiten distinguir conexiones. Que dos personas visiten el mismo puerto 443 no mezcla sus conversaciones.

Los puertos tienen 16 bits: van de **0 a 65535**, con el 0 reservado. IANA distingue `0–1023` (sistema), `1024–49151` (usuario) y `49152–65535` (dinámicos/privados). El rango que un sistema usa automáticamente para puertos temporales depende de su configuración. [RFC 6335](https://www.rfc-editor.org/rfc/rfc6335).

### Ejemplo paso a paso: una web con HTTPS sobre TCP

Suponé un servidor de laboratorio con IP `192.0.2.10` (dirección de documentación) y servicio HTTPS en 443:

1. El cliente obtiene la dirección del nombre mediante DNS o caché. Para este ejemplo ya conocemos `192.0.2.10`.
2. El cliente usa un puerto de origen disponible, por ejemplo `53000`, y se dirige a `192.0.2.10:443`.
3. Completa el **handshake TCP** para establecer la conexión.
4. Negocia **TLS**, que protege el canal y permite comprobar la identidad del servidor mediante su certificado.
5. Intercambia las solicitudes y respuestas **HTTP** dentro de ese canal protegido.

Es un ejemplo conceptual; no se ejecutó ninguna conexión. En HTTP/3 el establecimiento es diferente porque usa QUIC/UDP.

![[Recursos Visuales/Redes - TCP UDP puertos y OSI#Del nombre a la página]]

---
Reorganizado por tema el 20/10/2026 a partir de la guía existente: apuntes y ampliaciones previas, con sus fuentes y correcciones conservadas. No acredita práctica nueva.
