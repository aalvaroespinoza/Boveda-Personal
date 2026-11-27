# Jerarquía del Sistema de Archivos Linux

El directorio raíz se simboliza con `/` y es el inicio de todo el árbol.

## Directorios Estáticos (Binarios y Configuración)
| Directorio | Descripción                                                                  |
| :--------- | :--------------------------------------------------------------------------- |
| **/bin**   | Binarios esenciales para todos los usuarios (ej: `ls`, `cat`). Es estático.  |
| **/sbin**  | Binarios de sistema, solo ejecutables por el **root** o administrador.       |
| **/boot**  | Archivos de arranque del sistema (Kernel, Grub). No compartible.             |
| **/etc**   | Archivos de **configuración** del sistema y programas.                       |
| **/lib**   | Librerías compartidas necesarias para arrancar binarios de `/bin` y `/sbin`. |
| **/opt**   | Software de terceros no nativo (ej: Chrome, Spotify, TeamViewer).            |
| **/usr**   | Contiene la mayoría de programas y librerías de usuario (solo lectura).      |

## Directorios Variables y de Usuario
| Directorio | Descripción |
| :--- | :--- |
| **/home** | Carpetas personales de los usuarios. Variable y compartible. |
| **/root** | El directorio personal exclusivo del usuario administrador (root). |
| **/var** | Archivos variables: **Logs**, correos, bases de datos. Sirve para detectar problemas. |
| **/tmp** | Archivos temporales necesarios para que los programas funcionen. |

## Hardware y Virtuales
| Directorio | Descripción                                                                  |
| :--------- | :--------------------------------------------------------------------------- |
| **/dev**   | Archivos que representan hardware (`sda` disco, `cdrom`, `audio`).           |
| **/proc**  | Sistema de archivos **virtual**. Información de procesos y ejecución en RAM. |
| **/sys**   | Información jerárquica del kernel, drivers y dispositivos.                   |
| **/mnt**   | Puntos de montaje para discos externos.                                      |
| **/media** | Puntos de montaje automático para extraíbles (USB, CD).                      |

## Revisión técnica — 2026-09-09
Se conservan las tablas originales. Estas precisiones corrigen sus simplificaciones:

- `/sbin` agrupa herramientas de administración, pero su ubicación no impide por sí misma ejecutarlas sin root; cada operación y permiso determina qué se permite.
- `/usr` puede montarse de solo lectura, pero no es obligatoriamente así. Las instalaciones y actualizaciones pueden modificarlo.
- `/mnt` es un lugar convencional de montajes temporales; los extraíbles pueden aparecer en `/media` u otras rutas según el sistema.
- `/dev` incluye dispositivos virtuales; no representa solo hardware físico. `/proc` expone información del kernel, no archivos ordinarios guardados en disco.

Referencia: [FHS 3.0](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html). “Estático” no significa que nunca cambie.

## Ver el recorrido
![[Recursos Visuales/Linux - Rutas y directorios]]
