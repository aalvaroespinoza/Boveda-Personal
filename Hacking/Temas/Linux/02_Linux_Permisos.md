---
aliases: ["chmod", "chown", "Permisos Linux"]
---
# Gestión de Permisos y Usuarios

## Lectura de Permisos (RWX)
Todo se basa en **R**ead, **W**rite, e**X**ecute.

| Símbolo | Significado | Valor Octal | Descripción |
| :---: | :---: | :---: | :--- |
| **r** | Lectura | 4 | Leer archivo o listar directorio. |
| **w** | Escritura | 2 | Modificar contenido. |
| **x** | Ejecución | 1 | Ejecutar script o entrar a carpeta. |

### Notación Octal (La Matemática)
Para asignar permisos rápidos, sumamos los valores:
* **7** = `4+2+1` (rwx - Todo)
* **5** = `4+0+1` (r-x - Lectura y Ejecución)
* **4** = `4+0+0` (r-- - Solo lectura)

**Ejemplo:** `chmod 755 CARPETA`
* Propietario: 7 (Todo)
* Grupo: 5 (Lectura/Ejecución)
* Otros: 5 (Lectura/Ejecución)

## Comandos de Usuarios y Grupos
* `chown usuario.grupo archivo`: Cambia el propietario y grupo de un archivo.
* `chmod`: Cambia los permisos.
    * `chmod o+w carpeta`: Da permiso de escritura (w) a otros (o).
    * `chmod u+x archivo`: Da ejecución al usuario.
* `useradd -d /home/pepe -s /bin/bash pepe`: Crea usuario definiendo home y shell.
* `passwd usuario`: Asigna o cambia contraseña.
* `id`: Muestra información de UID y GID del usuario actual.

## Revisión técnica — 2026-09-09
Se conserva el apunte original. Para un **directorio**, `w` permite modificar entradas (crear, borrar, renombrar); normalmente se necesita también `x`. Para atravesar una ruta se necesita búsqueda (`x`) en sus directorios. Leer un archivo y borrarlo son operaciones distintas. Fuente: [resolución de rutas](https://manpages.debian.org/bookworm/manpages/path_resolution.7.en.html).

La forma recomendada es `chown usuario:grupo archivo`, con **dos puntos**. Fuente: [chown](https://manpages.debian.org/bookworm/coreutils/chown.1.en.html).

`useradd -d` define la ruta de home; no garantiza crear el directorio. `-m` solicita crearlo. Ejemplo para un laboratorio donde corresponda crear esa cuenta: `sudo useradd -m -d /home/pepe -s /bin/bash pepe`. No fue ejecutado. Fuente: [useradd](https://manpages.debian.org/bookworm/passwd/useradd.8.en.html).

## Entender la suma
![[Recursos Visuales/Linux - Permisos visuales]]
