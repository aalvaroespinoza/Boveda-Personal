# Conceptos básicos

[[00_Ciberseguridad|Inicio]]

## Primero: cuatro preguntas distintas

| Pregunta | Concepto | Ejemplo |
| --- | --- | --- |
| ¿Qué nombre recuerdo? | Nombre de dominio | `servidor.example` |
| ¿A qué dirección de red me dirijo? | IP | `192.0.2.10` |
| ¿A qué servicio quiero llegar? | Puerto y transporte | `443/TCP` |
| ¿A qué interfaz entrego la trama en este enlace? | MAC | La de la puerta de enlace si el destino está en otra red |

Pensá en una IP como la dirección de un edificio y en el puerto como el punto de atención que buscás dentro. Es una analogía: la MAC corresponde a la comunicación en el enlace local, no a otra forma de escribir la misma dirección.

Un **cliente** inicia una solicitud y un **servidor** atiende un servicio. Son roles de programas: una misma computadora puede cumplir ambos.


## Consultar por tema

- [[Temas/Conceptos basicos/IP|IP]]
- [[Temas/Conceptos basicos/MAC|MAC]]
- [[Temas/Conceptos basicos/DNS|DNS]]
- [[Temas/Conceptos basicos/TCP y UDP|TCP y UDP]]
- [[Temas/Conceptos basicos/Modelo OSI|Modelo OSI]]
- [[Temas/Conceptos basicos/Subnetting|Subnetting]]

## Cómo usar esto al estudiar un problema

Si una web no abre, separá las preguntas: **¿tengo conexión de red?, ¿resuelve el nombre?, ¿se puede llegar al servicio?, ¿se establece TLS?, ¿responde HTTP?** Una falla en una etapa no demuestra la causa de las demás.

Por ejemplo, una respuesta HTTP `404` significa que llegaste a un servidor que respondió que no encontró el recurso solicitado. No equivale a no tener conexión. Un aviso de certificado se refiere a la validación TLS y requiere revisar el mensaje; no demuestra por sí solo un ataque.

Esto sirve para razonar antes de probar herramientas. Los ejemplos de esta guía son conceptuales: no se ejecutaron escaneos ni conexiones.


## Repaso: explicalo con tus palabras

1. ¿Qué distingue IP, MAC y puerto? Inventá un ejemplo con un cliente y un servidor.
2. ¿Por qué `/24` no significa lo mismo que “toda IPv4 tiene tres números de red”?
3. Dibujá SYN, SYN-ACK y ACK. Con secuencias iniciales 100 y 500, ¿por qué aparecen 101 y 501?
4. ¿Qué hace UDP si se pierde un datagrama? ¿Qué podría agregar una aplicación?
5. ¿Por qué TCP establecido no significa datos cifrados?
6. Explicá el recorrido DNS → conexión → TLS → HTTP. ¿Qué cambia con HTTP/3?
7. Ubicá IP en la capa 3, TCP/UDP en la 4 y HTTP/SSH en la 7. Explicá qué función hace cada uno.

> [!tip] Respuestas breves para comprobarte
> IP direcciona en red; MAC participa en el enlace; puerto distingue extremos de servicios. `/24` fija 24 bits de red. SYN consume una posición de secuencia. UDP no retransmite por sí solo. TCP no cifra. HTTP/3 usa QUIC sobre UDP, con seguridad integrada; no sigue el handshake TCP mostrado.

Para practicar comandos de consulta, conectá esta guía con [[Temas/Linux/03_Linux_Comandos_Herramientas]]. Los esquemas y exploradores están en [[Recursos Visuales/00_Indice visual]].



Separación por temas: 20/10/2026. La guía anterior íntegra, incluido el registro histórico de Notion, se conserva fuera de la bóveda y en el respaldo.
