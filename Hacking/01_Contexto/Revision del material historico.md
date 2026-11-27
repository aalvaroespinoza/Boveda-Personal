# Revisión del material histórico

La transcripción conserva lo dicho. Esta nota señala errores o afirmaciones que necesitan revisión antes de convertirse en material de estudio. No es una auditoría exhaustiva de cada comando del PDF.

## Correcciones de aprendizaje
- **awk:** en `La máquina se llama Lame y es nivel Fácil`, `$5` es `Lame` y `$9` es `Fácil`. El número de campo depende de la entrada real, no del tipo de dato.
- **Conteos:** filtrar un prefijo textual no valida una dirección IP completa. Contar líneas tampoco cuenta IPs únicas.
- **Porcentajes:** buscar una IP con puntos sin escapar puede producir coincidencias ajenas. Conviene comparar el campo completo y contemplar archivos vacíos. Ver [[Temas/Linux/07_Texto_y_tuberias_Gemini]].
- **Markdown:** `# Título` es un encabezado y `#etiqueta` es una etiqueta. El carácter también aparece en enlaces a secciones, como `[[Nota#Sección]]`; no tiene solo dos usos.
- **IPv4:** cuatro octetos suman 32 bits. El corte entre red y host depende del prefijo: tres octetos de red corresponde a `/24`, no a toda IPv4.
- **IPv6:** ocho grupos de 16 bits en la forma completa. `/64` es habitual en LAN, pero no describe todos los prefijos ni todos los tipos de dirección. Ver [RFC 4291](https://www.rfc-editor.org/rfc/rfc4291).
- **MAC:** no es necesariamente inmutable, globalmente única ni identificable por fabricante: hay direcciones administradas localmente y aleatorizadas.

## Diagnósticos antiguos no demostrados
El PDF atribuye fallos a drivers, mirrors, keyrings, archivos de arranque, incompatibilidades de dotfiles o al proceso del fondo de pantalla sin aportar siempre evidencia suficiente. Tratar esas causas como hipótesis.

No se deduce el modo de arranque ni el disco correcto solo por un nombre, una bandera `boot` o una capacidad mencionada. Las rutas `/boot`, `/boot/efi` y `/efi` tampoco son intercambiables sin revisar el montaje y el cargador.

## Procedimientos que deben revisarse antes de reutilizar
- Borrado de particiones y formateos: el historial no autoriza repetirlos.
- Eliminación manual de `/usr/bin/paru` o de un bloqueo de Pacman: requiere diagnóstico y comprobar procesos/propiedad de archivos.
- Secuencias de instalación con `pacman -Sy`: revisar el estado de actualización del sistema y la documentación vigente; no copiarlas como mantenimiento rutinario.
- `paru-bin` y `yay-bin`: empaquetar un binario no equivale a recompilar su código fuente para la biblioteca local.
- Responder siempre «sí» a un instalador o ejecutar scripts remotos como administrador: cada opción tiene efectos concretos que deben entenderse.
- Repetir reinstalaciones o vaciar todas las cachés sin identificar el error puede destruir evidencia y hacer perder trabajo.

## Qué se aprendió del proceso
La frase «ya está perfecto» no sustituye una verificación. Registrar: mensaje exacto → evidencia → hipótesis → cambio → resultado. Las preferencias estéticas siguen siendo válidas; el pedido actual se centra en aprender y organizar apuntes.
