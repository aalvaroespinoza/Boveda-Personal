# OSI: recorrido de los datos

Diagramas de la ampliación del 2026-09-11, para [[Temas/Conceptos basicos/Modelo OSI#Modelo OSI: ordenar lo que ya aprendiste]]. Complementan el mapa de siete capas existente; no representan una captura real de tráfico.

## Encapsulación paso a paso

```mermaid
flowchart TD
    A["Contenido de aplicación<br/>Por ejemplo, un mensaje HTTP"]
    A -->|"TCP añade su cabecera"| B["Segmento TCP<br/>Cabecera TCP + contenido"]
    B -->|"IP añade su cabecera"| C["Paquete IP<br/>Cabecera IP + segmento TCP"]
    C -->|"Ethernet añade cabecera y FCS"| D["Trama Ethernet<br/>Cabecera Ethernet + paquete IP + FCS"]
    D -->|"La capa física transmite"| E["Señales por cable, fibra o radio"]
```

Cada envoltura transporta lo anterior. **FCS** es una comprobación de errores de la trama. Al recibir, se interpretan y retiran las envolturas correspondientes. En HTTPS sobre TCP, TLS protege el mensaje HTTP antes de transportarlo por TCP. Se omiten opciones, segmentación y fragmentación para concentrarnos en las capas.

## Qué cambia al pasar por un router

```mermaid
flowchart TD
    A["Primer enlace: PC → router<br/>MAC: PC → R1<br/>IP: 192.0.2.10 → 198.51.100.20<br/>TTL: 64"]
    A --> R["Router: examina el destino IP<br/>Consulta la ruta y reduce el TTL<br/>Construye una nueva trama"]
    R --> B["Segundo enlace: router → servidor<br/>MAC: R2 → servidor<br/>IP: 192.0.2.10 → 198.51.100.20<br/>TTL: 63"]
```

**R1 y R2** representan las MAC de dos interfaces diferentes del router. Es un ejemplo IPv4 con dos enlaces Ethernet, un router y sin NAT, túneles ni fragmentación. El servidor está directamente conectado al segundo enlace. Las IP de los extremos permanecen; las cabeceras de enlace cambian y el paquete IP también cambia en campos como TTL y su checksum.

## OSI y TCP-IP

```mermaid
flowchart LR
    A["OSI 7, 6 y 5<br/>Aplicación, presentación y sesión"] --> B["TCP/IP<br/>Aplicación"]
    C["OSI 4<br/>Transporte"] --> D["TCP/IP<br/>Transporte"]
    E["OSI 3<br/>Red"] --> F["TCP/IP<br/>Internet"]
    G["OSI 2 y 1<br/>Enlace y física"] --> H["TCP/IP<br/>Enlace o acceso a red"]
```

Correspondencia didáctica aproximada con la representación de **cuatro capas** de TCP/IP. Algunos cursos separan física y enlace y muestran cinco. Las funciones no desaparecen por agruparlas de otra manera.
