# Bóveda Personal

La portada de Obsidian abre `Inicio.md` con el complemento Homepage. `Hacking/` es una copia del material de estudio: el origen permanece intacto. La bóveda `Personal` anterior queda separada.

## Primer uso

1. Abrir esta carpeta como bóveda nueva de Obsidian en Windows.
2. **Remotely Save** está conectado a Dropbox dentro de esta bóveda y usa `/Apps/remotely-save/Boveda Personal`, separado del nombre de la bóveda Hacking. La primera sincronización la realizó el usuario el 26 de noviembre. El iPhone ya tiene Obsidian y Tailscale, y una edición con foto hecha allí llegó a Windows. Falta probar el trayecto Windows→iPhone y configurar la tablet Huawei. En Windows, la ejecución automática de Remotely Save todavía figura sin configurar; usar el botón de sincronizar hasta establecerla.
3. Abrir `Hacking/00_Ciberseguridad.md`. El estilo y los complementos existentes de Hacking se copiaron sin sus datos de conexión; comprobar el diseño y los enlaces. El acceso a su diario desde esa página abre el índice dentro de esta bóveda.
4. Crear un respaldo local con `python herramientas/respaldo.py`. El ZIP queda en una carpeta hermana de la bóveda.

## Finanzas · desde el 1 de diciembre de 2026

En Windows, registrar una vez cada saldo de apertura, por ejemplo:

```powershell
python herramientas/finanzas.py apertura "Mercado Pago" 0
python herramientas/finanzas.py apertura "ARQ" 0
python herramientas/finanzas.py apertura "Efectivo" 0
```

Reemplazar `0` por el saldo real de cada cuenta; no ejecutar estos ejemplos literalmente sin comprobarlo. Capturar comprobantes en `01 Entrada` y guardarlos en `07 Adjuntos/Finanzas`. Tras revisar importe, cuenta y fecha:

```powershell
python herramientas/finanzas.py agregar gasto "Mercado Pago" 1500.00 --categoria Comida --descripcion "Ejemplo" --comprobante "07 Adjuntos/Finanzas/ejemplo.jpg" --fecha 2026-12-01
python herramientas/finanzas.py saldos
```

Las transferencias entre cuentas propias usan `transferencia` y `--destino`. Cada semana comparar los saldos calculados con los saldos reales. Los ejemplos anteriores describen el formato; todavía no hay saldos ni movimientos reales cargados. La tarea «Registrar saldos iniciales de diciembre» quedó pendiente en Obsidian y Google Tasks con fecha 2026-12-01.

El panel local también permite registrar saldos iniciales, gastos, ingresos, transferencias y conciliaciones. Exige confirmar que se comprobó cada importe, cuenta y fecha antes de escribirlo en los CSV. La conciliación compara el saldo calculado con el real y guarda la diferencia en `datos/conciliaciones.csv`; no ajusta movimientos automáticamente. Los formularios se probaron con datos temporales; no hay saldos ni movimientos reales cargados.

## Google Tasks

El conciliador está en `herramientas/tareas_sync.py`. El proyecto existente **LifeOS Tasks** tiene habilitadas Google Tasks, Calendar, Gmail y YouTube Data API. El JSON del cliente OAuth de escritorio quedó en `%LOCALAPPDATA%\ObsidianPersonalSync\client_secret.json`, fuera de la bóveda. Google Tasks ya está autorizado: la primera conciliación creó/seleccionó la lista `Obsidian Personal` y terminó sin conflictos; no tocó las demás listas. Las dependencias Python están instaladas.

La tarea de Windows `Obsidian Personal - Google Tasks` ejecuta `python herramientas/tareas_sync.py` cada 15 minutos con la sesión activa. Una ejecución programada terminó con resultado 0. Si Windows está apagado, la conciliación espera hasta el próximo inicio. Los conflictos quedan en `08 Automatizacion/Conflictos de tareas.md`. El 26 de noviembre se comprobó el ida y vuelta real: dos tareas de prueba, una creada en Obsidian y otra en Google, llegaron al otro lado y su finalización se reflejó en ambos sentidos sin conflictos. Se conservaron completadas como registro de la prueba.

El resumen local ya está programado en Windows a las 08:00 y el respaldo ZIP a las 20:00, con la sesión del usuario activa. Las tareas se llaman `Obsidian Personal - Resumen diario` y `Obsidian Personal - Respaldo`. La conciliación de Google Tasks se ejecuta cada 15 minutos; todavía falta probar una tarea real creada desde cada lado.

`herramientas/google_collect.py` ya está autorizado para leer Calendar, Gmail y YouTube. Gmail solo lee encabezados de hasta 40 mensajes no leídos y sugiere categorías; no modifica ni envía correo. Calendar lee la próxima semana; YouTube busca material de interés. Guarda la captura en `08 Automatizacion/Entradas`. La primera captura real no tuvo errores. La tarea `Obsidian Personal - Fuentes Google` se ejecuta diariamente a las 08:05 con la sesión activa y pasó una ejecución programada. El panel se inicia con `python herramientas/panel.py` y se abre en `http://127.0.0.1:4320`. Solo escucha en el equipo local; la ruta móvil pasa por Tailscale Serve privado.

El panel ya está activo en Windows y arranca con la sesión mediante un acceso directo en Inicio. Tiene inicio con portadas, vistas de tareas, investigación, proyectos, entrada, finanzas y actividad. Permite pegar mensajes o enlaces concretos de WhatsApp e Instagram en Entrada, sin acceso continuo a esas cuentas. Tailscale está conectado en la PC y Serve publica el panel en `https://alvaro.tail6efed3.ts.net/`, solo para los dispositivos de esta red privada. Funnel no está habilitado. Ya no pide una clave adicional: cualquier dispositivo autorizado en esta red privada puede abrirlo. El usuario confirmó que la URL cargó en iPhone. Falta instalar e iniciar Tailscale en la tablet Huawei.

Desde el panel se pueden crear proyectos con resultado, estado y próximo paso, y asociar tareas nuevas a ellos. La nota de tarea conserva un enlace de Obsidian al proyecto; el panel muestra su nombre y contexto.

El panel también admite una foto o PDF de hasta 8 MB de un apunte. Guarda el archivo original en `07 Adjuntos/Entrada` y crea una nota vinculada en `01 Entrada`, con la transcripción marcada como pendiente. Se probó con un archivo simulado; falta probar cámara y sincronización en los dispositivos reales.

## Web · Vercel y Supabase

La app web quedó implementada en `web/` con Next.js 15, login por magic link y Supabase como fuente operativa. Incluye migración SQL en `supabase/migrations/`, sincronizador local `herramientas/sync_supabase.py` y pruebas en `tests/test_sync_supabase.py`.

Verificado localmente: `npm run typecheck`, `npm run lint` y `npm run build` pasan; 10 pruebas Python pasan; sin Supabase configurado la app muestra una guía y no datos ficticios. **No hay proyecto Supabase, credenciales ni deploy reales todavía**, así que auth, RLS, migración aplicada, sync real y Vercel siguen pendientes. Los pasos manuales y las variables están en `web/README.md` y en [[00 Sistema/Migración web · Vercel y Supabase]].

El sync nunca borra notas ni sobrescribe en silencio: si local y remoto cambiaron, registra un conflicto visible. Solo lee notas `tipo: tarea`, `tipo: proyecto` y `tipo: entrada`; no toca `Hacking/`, finanzas, adjuntos ni Gmail histórico.

## Límites actuales

- Remotely Save ya sincronizó desde iPhone a Windows una edición de nota con foto; falta la prueba inversa y la tablet. Un respaldo posterior a esa foto se creó y verificó el 26/11.
- Google Tasks está autorizado, programado y verificado con una tarea real de prueba creada y completada en cada lado.
- Calendar, Gmail y YouTube ya tienen autorización OAuth y una captura real verificada. Instagram queda pendiente de definir para la cuenta de empresa; la personal y WhatsApp personal se capturan mediante compartir/exportar manualmente cuando haga falta.
- Los saldos iniciales y comprobantes requieren tus datos reales. El registro evita inventarlos.
- La lectura automática de comprobantes manuscritos o de billeteras no está activada; las plantillas conservan los originales y permiten revisión manual.
