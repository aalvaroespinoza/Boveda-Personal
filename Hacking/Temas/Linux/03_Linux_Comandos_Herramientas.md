---
aliases: ["Comandos Linux", "find", "grep", "tar", "gzip"]
---
# Comandos Esenciales de Linux

## Archivos y Directorios
| Comando | Acción | Notas |
| :--- | :--- | :--- |
| `ls -la` | Listar archivos | Muestra ocultos y detalles. |
| `cd` | Cambiar directorio | `cd ..` vuelve atrás. |
| `cp -r` | Copiar | `-r` recursivo para carpetas, `-p` mantiene permisos. |
| `mv` | Mover / Renombrar | Si el destino no existe, renombra. |
| `rm -r` | Borrar | `-r` borra directorios. Cuidado. |
| `mkdir` | Crear directorio | Crea una carpeta nueva. |
| `cat`, `more`, `head` | Ver contenido | `tail` ve el final. |
| `touch` | Crear archivo | O modificar fecha de acceso. |
| `ln -s` | Enlace simbólico | Crea un acceso directo. |

## Búsqueda (Find & Grep)
* `find . -name "texto*"`: Busca archivos por nombre recursivamente.
* `grep "texto" archivo`: Busca texto DENTRO de archivos.
* `file archivo`: Dice qué tipo de archivo es (binario, texto, imagen).

## Compresión
* `tar -cvvf archivo.tar carpeta`: Empaquetar (Comprimir).
* `tar -xvvf archivo.tar`: Desempaquetar.
* `gzip -d archivo.gz`: Descomprimir .gz.

## Redes
* `ifconfig`: Ver interfaces de red y tu IP.
* `ping`: Comprobar conexión enviando paquetes.
* `netstat -tulpn`: Ver puertos y conexiones.
* `nmap`: Escanear IPs y puertos abiertos.
* `dig DOMINIO`: Información DNS.

## Revisión técnica — 2026-09-09
- `cd ..` sube al directorio padre; `cd -` vuelve al anterior.
- `tar -cvvf archivo.tar carpeta` **empaqueta sin comprimir**. Para gzip: `tar -czvf archivo.tar.gz carpeta`. `c` crea, `z` comprime con gzip, `v` muestra archivos y `f` nombra el archivo resultante. [Manual de tar](https://manpages.debian.org/bookworm/tar/tar.1.en.html).
- La falta de respuesta a `ping` no demuestra por sí sola que un equipo esté apagado; puede haber filtrado. Los escaneos son prácticas para un entorno autorizado, no se ejecutaron al organizar esta bóveda.

## Elegir según la pregunta
| Quiero saber… | Ejemplo | Qué mirar |
| --- | --- | --- |
| Dónde estoy | `pwd` | Ruta actual |
| Qué nombres coinciden | `find . -name "texto*"` | Rutas bajo el directorio actual |
| Qué líneas contienen una palabra literal | `grep -F 'texto' archivo` | Líneas del contenido |

Los archivos y rutas de estos ejemplos deben existir. `find` busca nombres; `grep` inspecciona contenido.

Para entender rutas, usá [[Recursos Visuales/Linux - Rutas y directorios]]. Para seguir datos paso a paso:
![[Recursos Visuales/Linux - Tuberias interactivas]]
