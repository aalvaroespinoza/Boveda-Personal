# Redes: TCP, UDP, puertos y OSI

Recursos para [[Temas/Conceptos basicos/Conceptos Basicos]]. Diagramas añadidos el 2026-09-11 a partir de tus capturas y la revisión técnica. Son esquemas de estudio, no capturas de tráfico real.

## Handshake TCP

```mermaid
sequenceDiagram
    participant C as Cliente
    participant S as Servidor
    C->>S: 1. SYN — seq=100
    S->>C: 2. SYN + ACK — seq=500, ack=101
    C->>S: 3. ACK — seq=101, ack=501
    Note over C,S: Conexión establecida tras recibir el último ACK
```

Leé de arriba hacia abajo. Los números son inventados para aprender: cada extremo elige su secuencia inicial. El SYN ocupa una posición; por eso se confirma con **+1**. Este ejemplo no lleva datos en el handshake.

## TCP y UDP ante una pérdida

```mermaid
flowchart TD
    A["Se pierde información<br/>en la red"] --> T["TCP"]
    A --> U["UDP por sí solo"]
    T --> R["Detecta la pérdida y retransmite"]
    R --> O["Entrega bytes en orden<br/>si logra recuperarlos"]
    R --> F["La conexión<br/>puede fallar"]
    U --> N["No retransmite ni reordena"]
    N --> P["La aplicación decide<br/>cómo manejar la pérdida"]
```

**Ejemplo:** si falta una parte de un archivo, TCP puede recuperarla. En audio en vivo, la aplicación puede preferir continuar antes que reproducir una parte demasiado tarde. El comportamiento depende de la aplicación; no todo audio o video usa UDP.

## Una IP, distintos puertos

```mermaid
flowchart TD
    C["Cliente"] -->|"TCP hacia puerto 22"| S["SSH: acceso remoto"]
    C -->|"TCP hacia puerto 80"| H["HTTP: web sin TLS"]
    C -->|"TCP hacia puerto 443"| W["HTTPS: web con TLS"]
    S --- E["Mismo servidor: 192.0.2.10"]
    H --- E
    W --- E
```

Es un servidor de ejemplo con tres servicios configurados. La **IP** identifica el destino de red; el **puerto** permite distinguir servicios. Este dibujo usa TCP; HTTPS también puede usar HTTP/3 sobre QUIC/UDP.

## Las siete capas OSI

```mermaid
flowchart TD
    A["7. Aplicación: HTTP, FTP, SSH"] --> B["6. Presentación: formato y representación"]
    B --> C["5. Sesión: organizar el diálogo"]
    C --> D["4. Transporte: TCP, UDP y puertos"]
    D --> E["3. Red: IP y encaminamiento"]
    E --> F["2. Enlace: tramas y MAC en Ethernet"]
    F --> G["1. Física: bits mediante señales"]
```

Al **enviar**, seguí las flechas hacia abajo; al **recibir**, recorré las capas hacia arriba. OSI organiza funciones: los protocolos reales de Internet no encajan siempre de forma exacta en siete piezas separadas.


## Del nombre a la página

```mermaid
flowchart TD
    A["Nombre: servidor.example"] --> B["DNS o caché: obtener IP"]
    B --> C["Ruta IP hacia el servidor"]
    C --> D["TCP: conexión al puerto 443"]
    D --> E["TLS: proteger el canal"]
    E --> F["HTTP: solicitud y respuesta"]
    F --> G["El navegador procesa el contenido"]
```

Ejemplo de HTTPS sobre TCP, sin conexiones previas reutilizables. Las flechas indican el orden conceptual, no tiempos medidos. HTTP/3 usa QUIC/UDP y tiene otro establecimiento.
