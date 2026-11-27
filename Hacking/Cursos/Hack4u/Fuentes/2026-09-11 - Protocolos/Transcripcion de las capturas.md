# Protocolos — transcripción de las capturas

Fuente: dos capturas manuscritas recibidas el 2026-09-11. Son material de estudio, no instrucciones para ejecutar. Revisión organizada: [[Temas/Conceptos basicos/Conceptos Basicos]]. Se transcribe el contenido legible, se normaliza puntuación y se anota la repetición literal; las correcciones están en el apunte revisado.

## Primera captura: TCP y comienzo de puertos

- **TCP:** es un protocolo orientado a conexión; los dispositivos lo utilizan para comunicarse a través de Internet. Esta frase aparece dos veces en el manuscrito.
- Proporciona verificación de errores.
- Garantiza la entrega de datos y que los paquetes se entreguen en el orden de envío.
- **Three-way handshake:** es un procedimiento para establecer conexión entre dos dispositivos. Fundamental para establecer una buena conexión TCP.
- Contiene 3 pasos: SYN, SYN-ACK, ACK. Sincronizan los números de secuencia y de reconocimiento de los paquetes entre los dispositivos.
- **21: FTP (File Transfer Protocol):** permite la transferencia de archivos entre sistemas.
- **22: SSH (Secure Shell):** un protocolo de red seguro que permite a los usuarios conectarse y administrar sistemas de forma remota.

![[Cursos/Hack4u/Fuentes/2026-09-11 - Protocolos/Screenshot_20260911_210511_com.huawei.hinote.jpg]]

## Segunda captura: otros puertos y UDP

- **23: Telnet:** un protocolo utilizado para la conexión remota a dispositivos de red.
- **80: HTTP (Hypertext Transfer Protocol):** el protocolo que se utiliza para la transferencia de datos en la World Wide Web.
- **443: HTTPS (Hypertext Transfer Protocol Secure):** la versión segura de HTTP, que utiliza encriptación SSL/TLS para proteger las comunicaciones web.
- **UDP:** es un protocolo sin conexión.
- No garantiza entrega de datos ni errores.
- Envía datos pero sin comprobar que se reciban correctamente.
- Al pie se alcanza a leer: “Modelo OSI: es un estándar para los protocolos de red. Tiene 7 capas”. El resto no aparece en la captura; la nota actual ya contenía tus siete capas y se conservaron.

![[Cursos/Hack4u/Fuentes/2026-09-11 - Protocolos/Screenshot_20260911_210514_com.huawei.hinote.jpg]]

El solapamiento de las capturas repite Telnet y HTTP; se transcribieron una sola vez. Las afirmaciones absolutas sobre TCP/UDP y la referencia SSL/TLS se conservan aquí como fuente y se precisan en la nota de estudio.
