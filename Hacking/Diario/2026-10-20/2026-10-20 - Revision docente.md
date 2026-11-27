# 2026-10-20 · Revisión docente

Estado: revisión documental completa del material identificado al corte, con límites de verificación indicados al final. No acredita ejecución práctica ni dominio.
Inicio y corte: 20/10/2026, 20:00:52 -03 (23:00:52 UTC), America/Argentina/Buenos_Aires.
Tutoría del asistente, 20/10/2026. Se consultaron contexto/protocolo de Drive, AGENTS, portada y tres documentos de contexto locales.

## Entregas, versiones y autoría

1. **Subnetting — Machete!K23:O23**, [abrir fila](https://docs.google.com/spreadsheets/d/17CF5xfhPW8zIvF75St5F5LsKliFFU-L3YM8Sg1hv5b8/edit#gid=2003694523&range=K23:O23), ID `17CF5xfhPW8zIvF75St5F5LsKliFFU-L3YM8Sg1hv5b8`, modifiedTime `2026-10-20T13:36:31.233Z`, estable en relectura. Valores: `192.168.1.45/29 | 255.255.255.248 | 8 | 192.168.1.40 | 192.168.1.47`.
   Frente a la versión del 19/10 (`2026-10-19T21:16:04.472Z`), N23 pasó de .45 a .40 y O23 vacío pasó a .47. Máscara y 8 no cambiaron. Se revisan esos cambios; no se recorre otra vez la corrección de los diez casos previos. Valores y fórmulas leídos A1:O35; continuación K36:O1000 vacía. El protocolo recoge ejercicios declarados por el usuario; esta fila no declara procedimiento ni ayuda usada. Fecha real de resolución no declarada: modificación no equivale a fecha de estudio.

2. **Apunte local del 20/10**, `D:/Documentos/Hacking/Diario/2026-10-20/2026-10-20 - Apunte.md`, encabezado con fecha de estudio 20/10. Primera versión observada: LastWriteTimeUtc `2026-10-20T23:00:05Z`, 1305 bytes. Se revisa el texto leído de esa versión: introducción a reconocimiento, rangos de Nmap, gateway, abierto/cerrado y «Filtrado» aún vacío.
   **Cambio concurrente:** a las 23:04 se detectó otra versión de 1431 bytes, posterior al corte. No se reemplazó la nota viva ni se evaluó esa adición. El [texto observado conservado](https://drive.google.com/file/d/1cjvDYDzPxRyAcr6_bqLJ_6b-HUCGHWkk/view), ID `1cjvDYDzPxRyAcr6_bqLJ_6b-HUCGHWkk`, se subió después como copia documental del texto ya leído (modifiedTime `2026-10-20T23:05:12.276Z`). Esa subida no es una entrega posterior del estudiante. Es una captura textual normalizada, no una copia binaria certificada de la versión histórica: no se obtuvo su hash original antes del cambio. Hash SHA256 de la captura: `CDE2E7A6D193834ECCAE13147AA1252622FFF74A12C314D7039D0203803BB054`.
   Por su forma es un apunte de estudio; no declara qué es redacción propia, transcripción o ayuda de IA. No atribuyo cada explicación al docente ni al estudiante. No incluye salida ejecutada ni ejercicio propio de Nmap.

3. **Carpeta Entregas al consultar:** solo contenía la plantilla vacía ID `1Dvi5DHC_8gtMSmXcRYPxKPt4Ah835MtH`, modificada `2026-10-16T01:58:11.212Z`; excluida como entrega. La copia de Nmap anterior fue agregada por esta revisión.

Contexto ID `1Z4iK7AmUTrpLiCA9fe_aC-eN9aiA3-6M`, modificado `2026-10-19T00:07:28.612Z`; protocolo ID `12X0wSbITzzo91yaFumnlvq0K1Bs6fLKl`, modificado `2026-10-19T23:12:11.574Z`. [Devolución anterior](https://drive.google.com/file/d/17CDikTxQaluXlI6qzYMD8qe8sKhKP1xU/view) conservada, sin sobrescritura.

## Criterios según lo efectivamente estudiado

| Criterio | Fila 23, cambio revisado | Apunte introductorio de Nmap |
| --- | --- | --- |
| Exactitud conceptual | **parcial**: red .40 y broadcast .47 correctos; 8 es total, falta aclarar utilizables. | **parcial**: rangos bien elegidos; precisar conteo de puertos y lectura de Gateway. |
| Razonamiento y justificación | **sin evidencia**: no hay procedimiento para obtener los límites nuevos. | **sin evidencia**: enuncia opciones, pero no justifica un caso propio ni muestra decisiones. |
| Interpretación de resultados | **parcial**: ahora distingue la IP del host de la red; falta justificar extremos y qué cuenta M23. | **parcial**: diferencia abierto/cerrado; «Filtrado» está sin desarrollar en la captura evaluada. No hay salida real. |
| Aplicación al problema | **parcial**: completó límites correctos, sin explicar total/utilizables ni pertenencia de direcciones. | **parcial**: `-p1-18000` selecciona correctamente un rango en texto; sin evidencia de ejecución o interpretación propia. |

Los límites correctos son un acierto observable. La falta de procedimiento no prueba desconocimiento ni copia. No se evalúan técnicas avanzadas, evasión ni scripts todavía no evidenciados.

## Explicación integrada y correcciones

### Tu /29: límites ya corregidos; falta aclarar el conteo
Ubicación: Machete M23, encabezado M12 «Total Hosts», y cambios N23/O23. En /29 quedan 3 bits: 2³ = **8 direcciones totales**. En una subred IPv4 ordinaria dos representan red y broadcast: **6 utilizables**. El 8 es correcto como total; si la columna mantiene el significado de hosts utilizables usado por las filas previas, corresponde 6. No lo trato como falso sin aclarar ese encabezado.

Ejemplo progresivo: un /30 ordinario tiene 4 direcciones, 2 utilizables. En tu /29 el salto es 256 − 248 = 8. Los bloques cercanos empiezan en .32, .40 y .48; .45 cae en .40–.47. Por eso red .40, broadcast .47 y hosts .41–.46. Tus dos cambios coinciden. Falta demostrar cómo llegaste y distinguir lo contado. No se editaron tus respuestas.

Fuente: [RFC 1878, tablas de máscaras y rangos IPv4](https://www.rfc-editor.org/rfc/rfc1878.txt). La tabla es una referencia histórica para este cálculo ordinario; no se generaliza la resta de dos a /31 punto a punto ni /32.

### «Existen 65535 puertos»: separar espacio de números y rango de escaneo
Ubicación: primera frase técnica del apunte. Un campo de puerto de 16 bits admite **65536 números, 0–65535**, por protocolo de transporte; el 0 está reservado. Tu rango de Nmap **1–65535 sí contiene 65535 puertos**. Así, la cifra sirve para ese rango, pero necesita precisión si describe todo el espacio. TCP y UDP tienen espacios separados.

Ejemplo: de 1 a 3 contás tres números; de 0 a 3 contás cuatro. Con la misma idea se entiende por qué 65535 es el máximo y no la cantidad total de valores. Fuente: [RFC 6335 §6, espacios y rangos de puertos](https://www.rfc-editor.org/rfc/rfc6335#section-6).

Tu `nmap -p1-18000 [IP]` selecciona 1–18000 inclusive; `-p-` pide 1–65535. Esa selección no agrega UDP. [IP] es un marcador, no sintaxis literal para pegar. Esta última advertencia es preventiva, no prueba de un error ejecutado. Fuente: [Nmap: especificación de puertos](https://nmap.org/book/man-port-specification.html).

### Gateway: elegir la ruta por defecto, no cualquier celda
Ubicación: «es el que aparece en Gateway». Falta relacionarlo con la fila correcta. `route -n` muestra rutas con direcciones numéricas: no descubre por sí solo una única «IP del router». En el ejemplo IPv4 simple, la fila de destino 0.0.0.0 y máscara 0.0.0.0 representa la ruta por defecto; su Gateway es el siguiente salto para destinos sin ruta más específica.

Ejemplo ficticio:

```text
Destination    Gateway       Genmask        Flags Iface
0.0.0.0        192.0.2.1     0.0.0.0        UG    eth0
192.0.2.0      0.0.0.0       255.255.255.0  U     eth0
```

La puerta por defecto es 192.0.2.1. La segunda fila describe un enlace directo, sin gateway intermedio; no significa que «el router sea 0.0.0.0». Una máquina puede tener varias rutas, VPN o no tener ruta por defecto. Son límites preventivos: no se infiere tu configuración. El comando Linux se escribe `route -n`; el uso de mayúscula en prosa no prueba que hayas ejecutado «Route».
Fuente: [manual de route, opciones -n y columnas de salida](https://man7.org/linux/man-pages/man8/route.8.html).

### Estados: completar un hueco sin atribuir una confusión
Ubicación: «Abierto», «Cerrado» y «Filtrado» en la captura anterior al corte. Abierto/cerrado están orientados correctamente. **Filtrado estaba vacío**, no es una afirmación errónea. La explicación que sigue es ampliación docente de ese hueco; no evalúa el texto agregado después de las 23:00:52 UTC.

- **open:** un servicio acepta comunicaciones en ese puerto.
- **closed:** hay respuesta que permite concluir que no hay aplicación escuchando allí.
- **filtered:** Nmap no dispone de evidencia para decidir si está abierto por el filtrado de sondas o respuestas. No equivale a cerrado.

Un resultado ficticio de 22 abierto, 80 cerrado y 443 filtrado informa un servicio accesible en 22, ausencia de escucha en 80 en esa observación, e incertidumbre en 443. No identifica automáticamente una vulnerabilidad ni el producto exacto. Los estados dependen de la técnica y de dónde se observa. No hace falta memorizar ahora los otros estados de Nmap.
Fuente: [Nmap: estados de puertos](https://nmap.org/book/man-port-scanning-basics.html).

## Próximo bloque: tres consignas en total, 10 minutos

[Actividad del 21/10, sin respuestas](https://drive.google.com/file/d/1_6iB2EuBRyc-UNZja50GHThcziMVA73x/view). Retoma las dos preguntas pendientes y añade un único caso breve de Nmap. Reemplaza operativamente la actividad anterior, que no se borra. No añade obligaciones de laboratorio ni pide repetir el cuestionario aprobado.

### Soluciones y criterios docentes — consultar después de responder
1. Totales: las 8 direcciones del bloque. Utilizables: 6, al reservar red y broadcast en este /29 ordinario. Debe explicarlo con sus palabras y aclarar qué cuenta la columna.
2. Máscara 255.255.255.248; 3 bits de host; salto 8; red 192.168.1.40; broadcast .47; hosts .41–.46. .46 pertenece al mismo bloque; .48 inicia el siguiente. Debe mostrar saltos o bits y justificar extremos; copiar los valores no demuestra el procedimiento. Si usó ayuda, registrar qué parte.
3. 1–18000 inclusive, TCP en el comando ordinario mostrado, sin añadir UDP por `-p`. Interpretar open/closed/filtered como arriba; filtered no permite decidir escucha. Puerta por defecto 192.0.2.1 usando la fila destino/máscara 0.0.0.0. Se espera la referencia a la fila y a la incertidumbre, no solo la palabra «firewall».

## Conservación, organización y verificación

- Respaldo local previo de seis notas, fuera de la bóveda: `C:/Users/alvar/.codex/automations/actu-como-mi-tutor-de-ciberseguridad-cada-ejecuci-n-debe-corregir-mi-trabajo-r/run-2026-10-20/notas-antes-2026-10-20.zip`, verificado entrada por entrada contra SHA256 el 20/10 a las 23:04:21 UTC. ZIP SHA256: `F9DB6634F70DC2CACC90DEA397D4B284931C1020A02C4C728CF7EB8F6D9BB29C`. Incluye la versión viva posterior del apunte para conservación, no para evaluación.
- Captura de fuentes/valores/fórmulas fuera de la bóveda: `fuentes.json` junto al ZIP, SHA256 `6D768D2FF5578B4637EEDE4E036FA4C9C724CEDC2F5D732D036509BE1252429C`. Es hash de captura, no hash nativo de Sheets.
- [Respaldo completo del seguimiento](https://docs.google.com/spreadsheets/d/1WBI9yS9oPJiy6siqLTy5-kMJ6a2qjDCCDX8uUx0T3To/edit): seis pestañas confirmadas y A12:J16 releído con valores, notas, validaciones y formato coincidentes antes de escribir.
- Incorporación local de esta revisión: captura del apunte evaluado y de Machete junto al día; devolución junto al original; explicación de estados en Nmap, rangos y lectura de rutas en Nmap - Comandos, procedencia en Subnetting; enlaces en Inicio y Diario. Se conserva la nota viva y no se crean scripts ni plantillas.
- Seguimiento: solo FND-09 (fila 12) y REC-01 (fila 16). REC-01 se registra Revisado por disponibilidad de devolución, Hecho=FALSE conservado. FND-09 conserva En curso y su Hecho=TRUE ya presente al leer, referido a C11; no inferir que la práctica pendiente terminó. Los restantes checks y FND-10 se conservan. Historial en notas y copia previa.
- Hack4u consultado autenticado después del corte, durante esta revisión: 10%, 2/13 secciones, básicos 11/11, Reconocimiento 0/17, C11 Completada. Corrobora estado visible; no fecha de estudio ni de cambio. No es contradictorio que estés empezando Nmap y aún no esté completada la sección. No se pulsó Completar ni se inició/reinició cuestionario. El resultado aprobado es evidencia del 19/10 conservada, no una nueva calificación.
- Verificación documental y aritmética aislada con aserciones para /29. No se ejecutaron route, nmap ni comandos del apunte, ni se consultaron equipos reales. Fuentes técnicas primarias consultadas en web. Sin Calendar, otras tareas programadas ni cambios de plugins.
- Límites: no se comprueba desempeño práctico, autoría detallada, respuestas del cuestionario ni acceso desde ejecución cloud. Pendientes la adición local posterior al corte y la prueba visual en Obsidian/tablet. La captura textual del apunte no certifica bytes de su versión histórica. Formato del seguimiento comprobable por API; apariencia nativa no certificada.

La revisión se considera guardada solo al releer Drive y comprobar las incorporaciones locales y las filas escritas. El registro técnico de esta ejecución conserva ese resultado sin cambiar el historial del estudiante.
