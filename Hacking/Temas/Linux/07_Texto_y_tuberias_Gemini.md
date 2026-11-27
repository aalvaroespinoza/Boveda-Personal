---
aliases: ["awk", "cut", "Tuberias"]
---
# Texto y tuberías: repaso del chat

Relacionado: [[Temas/Linux/03_Linux_Comandos_Herramientas]], [[Temas/Linux/04_Linux_Procesos_Redirecciones]]. Fuente histórica: páginas 1–4 de [Contexto Gemini completo](<file:///D:/Documentos/Hacking%20-%20Material%20guardado%202026-10-20/Archivo/Contexto%20Gemini%20completo.md>).

## Una tubería transporta la salida
`|` conecta la salida estándar de un comando con la entrada del siguiente. No modifica por sí misma el archivo original.

```mermaid
flowchart LR
 A[Registros] --> B[cut o awk: extraer un campo]
 B --> C[grep: filtrar coincidencias]
 C --> D[wc -l: contar líneas]
```

## cut: elegir un campo por separador
```bash
printf '%s\n' 'ana:1000:/home/ana' | cut -d ':' -f 1
```
Resultado: `ana`. `-d` elige el delimitador y `-f 1` el primer campo. Con `-d ' '`, cada espacio es un separador; varios espacios no se agrupan.

## awk: trabajar con campos y condiciones
```bash
printf '%s\n' 'ana    1000    /home/ana' | awk '{print $3}'
```
Resultado: `/home/ana`. Por defecto separa campos por espacios en blanco; `$0` es el registro completo, `$1` el primer campo, `NF` el número de campos y `$NF` el último.

```bash
printf '%s\n' '' 'nombre maquina Active' | awk 'NF {print $NF}'
```
Resultado: `Active`; omite la línea vacía.

## Extraer, filtrar y contar
Ejemplo de archivo `logs`, con tres campos y sin encabezado:
```text
09:00 ana 170.85.10.45
09:01 bob 192.168.1.10
09:02 ana 170.1.2.3
```

```bash
cut -d ' ' -f 3 logs | grep '^170\.' | wc -l
```
Resultado: `2`. `^` exige el inicio de la línea y `\.` un punto literal. El conteo es de registros coincidentes; no de direcciones diferentes.

Si el archivo tiene espacios variables:
```bash
awk '{print $3}' logs | grep '^170\.' | wc -l
```

## Porcentaje de registros de una IP exacta
Este ejemplo supone que la tercera columna contiene la IP y que cada línea no vacía es un registro válido:
```bash
awk 'NF {total++; if ($3 == "170.85.10.45") n++}
END {if (total) printf "%.2f%%\n", 100*n/total; else print "Sin registros"}' logs
```
Resultado con el ejemplo: `33.33%`. La igualdad compara el campo entero; no confunde puntos con comodines de una expresión regular.

## Para comprobar que lo entendiste
¿Por qué no usarías el mismo `-f 3` si las IPs estuvieran al principio? ¿Qué cambia al quitar `wc -l`? ¿Qué pasaría si dos registros tienen la misma IP?


## Explorar el ejemplo — añadido 2026-09-09
![[Recursos Visuales/Linux - Tuberias interactivas]]
