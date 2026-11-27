---
aliases: ["Bash", "xxd", "strings", "sponge"]
---
Cuando un archivo no sea legible, lanzale un `strings`. Para listar unicamente las cadenas de caracteres imprimibles.

Utiliza el comando `xxd` para transformar cualquier cosa a hexadecimal. Luego con un `-d` en el argumento lo puedes deshacer.

Utiliza el comando `sponge` para sobrescribir un archivo con los filtros deseados.
`Ej: cat test | awk '{print $3}' | sponge test`



## Revisión técnica — 2026-09-09
Se conserva arriba la redacción original. **Para revertir `xxd` se usa `-r`, no `-d`.** `strings` muestra secuencias imprimibles que encuentra; no descifra datos ni soluciona una denegación de permisos.

![[Recursos Visuales/Linux - Bytes y hexadecimal]]

## Por qué aparece sponge
`sponge` (paquete moreutils) consume toda su entrada antes de escribir. Tu ejemplo permite leer y reemplazar `test`; no lo sustituyas por `awk '{print $3}' test > test`, porque la redirección puede vaciar el archivo antes de leerlo. Primero guardá una copia y comprobá la salida del filtro; una salida vacía también puede reemplazar el contenido. [Manual de sponge](https://manpages.debian.org/bookworm/moreutils/sponge.1.en.html).

Para entender qué entrega el filtro: [[Temas/Linux/07_Texto_y_tuberias_Gemini]].
