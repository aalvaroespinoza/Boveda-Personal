---
aliases: ["OSI", "TCP IP"]
---
# Modelo OSI

[[00_Ciberseguridad|Inicio]] · [[Temas/Conceptos basicos/Conceptos Basicos|Conceptos básicos]]

## Modelo OSI: ordenar lo que ya aprendiste

Ahora que conocés IP, MAC, TCP, UDP y puertos, podemos ubicarlos en un mismo mapa. **OSI divide las funciones de comunicación en siete capas.** No es un programa que instalás ni siete dispositivos por los que deba pasar un mensaje.

> [!info] Ampliación para estudiar
> Este desarrollo combina tus apuntes con documentación de Internet revisada el 2026-09-11. Las explicaciones y ejemplos añadidos no se atribuyen al docente. La [versión previa](<file:///D:/Documentos/Hacking%20-%20Material%20guardado%202026-10-20/Archivo/Versiones%20de%20apuntes/2026-09-11%20-%20Conceptos%20Basicos%20antes%20de%20ampliar%20OSI.md>) está conservada.

### El mapa completo

![[Recursos Visuales/Redes - TCP UDP puertos y OSI#Las siete capas OSI]]

Al enviar, pensá **de 7 a 1**; al recibir, **de 1 a 7**. Cada capa utiliza los servicios de la inferior. Dos capas equivalentes interpretan las reglas de su protocolo; los datos viajan mediante los niveles inferiores.

| Capa | Pregunta para recordarla | Palabra clave |
| --- | --- | --- |
| **7. Aplicación** | ¿Qué servicio o intercambio necesita el programa? | HTTP, DNS, SSH |
| **6. Presentación** | ¿Cómo se representan e interpretan los datos? | Formato |
| **5. Sesión** | ¿Cómo se organiza el diálogo? | Coordinación |
| **4. Transporte** | ¿Qué aplicaciones se comunican y con qué garantías? | TCP/UDP, puertos |
| **3. Red** | ¿A qué destino IP y por qué siguiente salto? | Encaminamiento |
| **2. Enlace** | ¿Cómo entrego una trama en este enlace? | MAC, trama |
| **1. Física** | ¿Cómo transporto los bits como señales? | Medio y señal |

### Capa 1 — Física: hacer llegar señales

Transporta bits mediante señales eléctricas, ópticas o de radio. Cable, fibra, conectores y transmisión inalámbrica pertenecen a esta parte del problema. Un **hub** repite señales; no elige el destino a partir de una IP.

**Ejemplo:** si un cable está desconectado, cambiar el puerto de una aplicación no repara el enlace. En Wi-Fi, interferencia o mala señal pueden degradarlo; eso no demuestra por sí solo una falla de DNS.

Ethernet incluye especificaciones tanto de física como de enlace: no hay que encerrar toda una tecnología en una única capa. [IEEE 802.3](https://www.ieee802.org/3/).

### Capa 2 — Enlace: llevar una trama por el enlace

Organiza la comunicación en **tramas**. En Ethernet se usan direcciones **MAC** y una comprobación de errores llamada **FCS**. Un switch Ethernet de capa 2 aprende asociaciones entre MAC y puertos para reenviar tramas; ante ciertos destinos desconocidos o de difusión puede enviarlas por varios puertos.

**Ejemplo:** para llegar a un servidor de otra subred, tu PC entrega la primera trama al router. La IP de destino sigue identificando al servidor; la MAC de destino local es la del siguiente salto.

> [!important] Corrección del manuscrito
> Detectar una trama dañada no equivale a corregirla. El comportamiento depende de la tecnología: no podemos prometer que esta capa entregue siempre información sin errores.

Las **VLAN** separan dominios de difusión lógicos en una red conmutada. No hace falta configurarlas todavía: basta entender que compartir un switch físico no implica compartir el mismo dominio de capa 2. [IEEE 802.1Q](https://www.ieee802.org/1/pages/802.1Q.html).

### Capa 3 — Red: elegir el siguiente salto

IP aporta direcciones y permite encaminar paquetes entre redes. Un **router** consulta rutas para decidir por dónde reenviar; normalmente no determina de antemano todo el recorrido. IP también se usa cuando los dos equipos están en la misma subred.

**Ejemplo:** `192.0.2.10/24` quiere comunicarse con `198.51.100.20`. Son redes diferentes; con una ruta por defecto adecuada, usa su puerta de enlace. Para un vecino de su propia subred, normalmente puede enviar directamente por el enlace.

En IPv4, **TTL** limita la vida del paquete y se reduce al reenviarlo; ayuda a evitar que un paquete circule indefinidamente en un bucle. En IPv6 existe **Hop Limit**. [Encaminamiento de hosts, RFC 1122](https://datatracker.ietf.org/doc/html/rfc1122#section-3.3.1) y [routers IPv4, RFC 1812](https://www.rfc-editor.org/rfc/rfc1812).

### Capa 4 — Transporte: comunicar aplicaciones

TCP y UDP distinguen extremos mediante puertos. **TCP** ofrece un flujo de bytes ordenado con mecanismos de recuperación; **UDP** entrega datagramas sin esas garantías propias. La capa de transporte no significa automáticamente “entrega asegurada”.

**Ejemplo:** el cliente usa `53000` y el servicio web escucha en `443`. Las IP y puertos de ambos extremos permiten distinguir esta conexión TCP de otras.

Dos ideas adicionales de TCP:

- **Control de flujo:** evita que el emisor sobrepase la capacidad anunciada por el receptor.
- **Control de congestión:** adapta el envío a las condiciones de la red; no es lo mismo que proteger el búfer del receptor.

No hace falta memorizar sus algoritmos ahora. Ubicalos como funciones de TCP, sin trasladarlas automáticamente a UDP. [TCP, RFC 9293](https://www.rfc-editor.org/rfc/rfc9293).

### Capa 5 — Sesión: organizar el diálogo

En OSI coordina el diálogo entre participantes, incluida su organización y sincronización. No es simplemente “el registro de logs”.

**Ejemplo conceptual:** dos participantes acuerdan puntos de sincronización para retomar un intercambio desde un estado conocido. Que una descarga real se reanude depende de los protocolos y del programa; OSI no agrega esa función mágicamente.

**No confundas:** una sesión iniciada en una web suele mantenerse mediante mecanismos de aplicación, como cookies o tokens. El uso de la palabra “sesión” no la convierte automáticamente en una implementación de la capa 5.

### Capa 6 — Presentación: entender la representación

Trata cómo expresar e interpretar los datos. Codificación de caracteres, serialización y compresión ayudan a entender esta función.

**Ejemplo:** dos programas pueden recibir los mismos bytes, pero mostrarlos mal si interpretan de forma distinta la codificación del texto. **Codificar no es cifrar:** convertir texto a UTF-8 o Base64 no lo vuelve secreto.

El cifrado se asocia a presentación en muchas explicaciones didácticas, pero puede existir en distintas capas reales. TLS protege comunicaciones; no hay que forzarlo a una casilla OSI como si fuera una regla universal. [TLS 1.3, RFC 8446](https://www.rfc-editor.org/rfc/rfc8446).

Las definiciones de sesión y presentación se contrastaron con [ITU-T X.200, apartados 7.2 y 7.3](https://www.itu.int/rec/T-REC-X.200-199407-I/en).

### Capa 7 — Aplicación: pedir un servicio

Aquí ubicamos protocolos como HTTP, DNS, SMTP, FTP y SSH. El navegador utiliza HTTP; no por eso toda su interfaz gráfica constituye la capa 7.

**Ejemplo:** una solicitud HTTP pide un recurso y el servidor responde con un estado y contenido. Recibir `404` indica que hubo una respuesta HTTP que no ofrece ese recurso; no equivale a “no hay Internet”. Un servicio puede devolver ese estado también para no revelar si el recurso existe. [HTTP, RFC 9110](https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.5).

### Encapsulación: agregar las envolturas necesarias

Una **cabecera** contiene información de control. **Encapsular** consiste en transportar los datos de una capa dentro de la unidad de la inferior; algunas tecnologías también agregan información al final. **Desencapsular** es interpretar y retirar esas envolturas al recibir.

![[Recursos Visuales/OSI - Recorrido de los datos#Encapsulación paso a paso]]

| Nivel del ejemplo | Nombre habitual de la unidad | Qué información aporta |
| --- | --- | --- |
| Aplicación | Mensaje o datos | Significado de la solicitud o respuesta |
| TCP / UDP | Segmento TCP / datagrama UDP | Puertos y campos propios del transporte |
| IP | Paquete o datagrama IP | IP origen y destino |
| Ethernet | Trama | MAC, tipo de contenido y comprobación FCS |
| Física | Bits representados por señales | Transmisión por el medio |

No se crea necesariamente un paquete por cada mensaje: un mensaje grande puede ocupar muchos segmentos y paquetes. Esta es una forma de leer la estructura; no una garantía de correspondencia uno a uno. [Arquitectura de Internet, RFC 1122](https://datatracker.ietf.org/doc/html/rfc1122#section-1.1.3).

### Un ejemplo completo: de una PC a un servidor

Imaginá dos redes Ethernet unidas por un router, sin NAT ni túneles:

1. La PC `192.0.2.10/24` tiene como puerta de enlace `192.0.2.1`.
2. El servidor `198.51.100.20/24` está en la otra interfaz del router, cuya IP es `198.51.100.1`.
3. La PC construye un paquete destinado al servidor y una trama destinada a la interfaz local del router.
4. El router recibe esa trama, consulta la ruta IP y construye otra trama para el segundo enlace.
5. El servidor recibe los datos y los entrega a las capas superiores y al servicio correspondiente.

![[Recursos Visuales/OSI - Recorrido de los datos#Qué cambia al pasar por un router]]

**Para recordar:** las direcciones IP de los extremos permanecen en este ejemplo; las MAC pertenecen a cada enlace. El paquete IP no queda idéntico: cambian TTL y, en IPv4, su checksum. NAT y túneles introducirían otros cambios. Un switch de capa 2 ordinario no reduce el TTL por reenviar una trama. [RFC 1812](https://www.rfc-editor.org/rfc/rfc1812).

### OSI y TCP/IP: dos maneras de organizar funciones

OSI es una referencia conceptual. La arquitectura de Internet suele describirse con cuatro capas; también verás una versión didáctica de cinco que separa física de enlace.

![[Recursos Visuales/OSI - Recorrido de los datos#OSI y TCP-IP]]

La agrupación es aproximada. Una aplicación real puede encargarse de representación, estado de sesión y lógica del servicio. Por eso no necesitás encontrar un programa diferente para cada capa OSI. [RFC 1122, sección 1.1.3](https://datatracker.ietf.org/doc/html/rfc1122#section-1.1.3).

### Usarlo para diagnosticar y aprender seguridad

Estas son **preguntas de investigación**, no diagnósticos automáticos:

| Lo que observás | Qué revisar primero | Qué no concluye por sí solo |
| --- | --- | --- |
| No hay enlace físico | Cable, interfaz y señal | Que el servicio remoto esté caído |
| No se alcanza la puerta de enlace | Configuración IP, prefijo, enlace y rutas | Que el problema sea siempre capa 3 |
| Un nombre no resuelve | DNS, caché y acceso al resolutor | Que “toda Internet” esté caída |
| Una conexión TCP no se establece | Ruta, filtrado, servicio y puerto | Una causa única por falta de respuesta |
| Hay aviso de certificado | Nombre, fecha y cadena de confianza | Que exista necesariamente un ataque |
| Hay respuesta HTTP 404 | Recurso solicitado y aplicación | Que no haya conectividad |

En seguridad, asociá el mecanismo con lo que realmente protege: TLS protege un canal; un firewall puede filtrar direcciones, puertos u otros datos; los permisos de la aplicación deciden qué puede hacer un usuario. Una capa no sustituye a las demás y un equipo puede trabajar en varias: por ejemplo, un switch multicapa también puede enrutar.

### Mini ejercicio OSI con respuestas

Antes de mirar las respuestas, explicá en voz alta:

1. ¿Qué cambia al pasar del primer enlace Ethernet al segundo?
2. ¿IP desaparece si ambos equipos están en la misma subred?
3. ¿Qué diferencia hay entre flujo y congestión en TCP?
4. ¿Base64 protege un secreto?
5. ¿Una cookie de sesión es automáticamente capa 5?
6. ¿Un HTTP 404 demuestra que el cable está desconectado?

> [!tip]- Respuestas para comprobarte
> 1. Las cabeceras de enlace; en el ejemplo también TTL y checksum IPv4, pero no las IP de los extremos.
> 2. No. IP sigue participando en esa comunicación.
> 3. Flujo protege la capacidad del receptor; congestión adapta el envío a la red.
> 4. No: es una representación, no cifrado.
> 5. No: normalmente es un mecanismo de aplicación.
> 6. No: obtuviste una respuesta HTTP.

**Tu práctica:** dibujá PC → router → servidor y anotá qué IP, MAC y puerto mirarías en cada parte. Después reconstruí las capas de abajo hacia arriba sin copiar la tabla.

### Fuentes de esta ampliación

Se priorizaron fuentes primarias: **ITU-T X.200** para OSI; **IEEE 802.3 y 802.1Q** para Ethernet y redes conmutadas; **RFC 1122, 1812, 9293, 8446 y 9110** para arquitectura y comportamiento de protocolos. Los enlaces están junto a las explicaciones correspondientes. Los ejemplos y diagramas son didácticos y no se ejecutaron como tráfico real.

---
Reorganizado por tema el 20/10/2026 a partir de la guía existente: apuntes y ampliaciones previas, con sus fuentes y correcciones conservadas. No acredita práctica nueva.
