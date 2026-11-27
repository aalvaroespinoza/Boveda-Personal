---
id: dec-cifrado-respaldo
tipo: decision
estado: pendiente
creado: 2026-11-26
origen: auditoria_de_boveda
revisado:
fuentes: []
---
# Decisión pendiente · cifrado y respaldo

## Hecho comprobado

El script de respaldo exige una contraseña externa de al menos 12 caracteres y cifrado AES; ya no crea un ZIP sin cifrar.

## Decisión requerida

Elegir si se cifra Remotely Save, se excluyen finanzas del sync o se postergan las finanzas. Esta elección no puede inferirse sin conocer la política de uso y la contraseña administrada por Álvaro.

## Siguiente verificación

La dependencia pyzipper ya está instalada. Ejecutar el respaldo con la contraseña fuera de la bóveda y restaurar en una carpeta separada.
