---
tipo: guia-de-estudio
curso: Seminario Hacking Ético
dia: 1
fecha_revision: 2026-10-20
autoria: asistente
estado: material-para-estudiar
---
# Día 01 · cómo una aplicación termina haciendo algo que no debería

La clase une dos demostraciones: **desviar un asistente de IA de su tarea** y **aprovechar fallos de una tienda web de laboratorio para leer datos y entrar como administrador**. El hilo común es la confianza: un sistema acepta algo que debería comprobar mejor.

No necesitás memorizar comandos para entenderla. Primero quedate con esto: **¿qué debía hacer el sistema?, ¿qué dato pudo controlar otra persona?, ¿qué hizo después y qué prueba lo demuestra?**

> [!info] Cómo leer esta guía
> Preparada por el asistente el 20/10/2026 a partir del video local, su transcripción automática y capturas de los momentos importantes. Las explicaciones pequeñas, analogías, defensas y preguntas son ampliaciones didácticas, no citas del docente. Los minutos remiten al archivo completo, incluida su cuenta regresiva inicial. No se ejecutó el laboratorio.

## 1. De qué trató, explicado sin vueltas

Imaginá una tienda con un vendedor, una recepción y un archivo de clientes:

- **El vendedor de cómics es el asistente de IA.** Debe responder sobre la tienda. En la demo consiguen que haga tareas ajenas a ese propósito.
- **La recepción es la aplicación web.** Recibe mensajes del navegador y decide qué mostrar y a quién dejar pasar.
- **El archivo es la base de datos.** Guarda usuarios, productos y pedidos. Un fallo de la aplicación permite consultar información que el visitante no debería obtener.
- **La segunda comprobación de identidad es el MFA.** Aunque alguien conozca la contraseña, debería faltar otra prueba antes de entrar. La práctica muestra que ese paso puede fallar si está mal implementado.

La tienda usada se llama **Patitas Felices**. Es el escenario preparado para la demostración, no una web elegida al azar. El objetivo del hacking ético es encontrar y explicar fallos con autorización para poder corregirlos.

En la introducción también se explica que la IA ayuda tanto a atacantes como a defensores y abre problemas nuevos. Se mencionan perfiles como **Blue Team** (defensa), **Red Team** (evaluación ofensiva con autorización) y **Purple Team** (colaboración entre ambos). Para este día, lo útil es entender que estudiar cómo falla un sistema también sirve para protegerlo.

## 2. Las palabras necesarias

| Palabra | Qué significa acá |
| --- | --- |
| Vulnerabilidad | Un defecto que permite romper una propiedad de seguridad, por ejemplo leer datos ajenos. |
| Explotar un fallo | Usar ese defecto y comprobar su efecto. Un mensaje de error aislado todavía no demuestra todo el impacto. |
| Navegador o cliente | La parte desde la que una persona interactúa con la web. Sus mensajes se pueden modificar. |
| Servidor | La parte que recibe las peticiones y debe aplicar las comprobaciones de seguridad. |
| HTTP | El formato de intercambio de peticiones y respuestas que se observa en la práctica. |
| Cabecera HTTP | Un campo que acompaña al mensaje, como `User-Agent`. No es necesariamente un dato verdadero. |
| Base de datos / SQL | El lugar organizado donde se guardan datos / el lenguaje usado para consultar bases relacionales. |
| API | Una interfaz con la que un programa pide información o acciones a otro. Una web puede usarla por detrás de sus pantallas. |
| Sesión / cookie | El estado con que la aplicación reconoce una interacción / un dato que el navegador guarda y suele reenviar para asociarse a esa sesión. |
| MFA | Autenticación multifactor: comprobar identidad mediante factores distintos. Pedir contraseña y luego un código es un ejemplo habitual, si se implementa correctamente. |

Ya tenés el contexto de IP, puertos y cliente/servidor en [[Temas/Conceptos basicos/Conceptos Basicos]]. En esta clase el foco pasa de **cómo llegan los mensajes** a **qué hace la aplicación con ellos**.

## 3. Primera demostración: el asistente de cómics

### Lo que debía pasar

El asistente Ada, del escenario de 0xWord Comics, tiene una tarea limitada: ayudar con el catálogo. Cuando le preguntan directamente si puede programar, inicialmente rechaza salir de ese tema.

Un **prompt** es una instrucción o texto que recibe el modelo. Las instrucciones que configuran su función buscan orientar sus respuestas, pero no equivalen por sí solas a un control de permisos del servidor.

### Lo que se muestra

Alrededor de **00:45:32–00:51:33**, Chema Alonso prueba una secuencia:

1. Confirma que el asistente puede responder sobre cómics.
2. Empieza a pedir cambios en el formato de la respuesta.
3. Usa esa conversación para intentar obtener contenido ajeno al catálogo. Un intento se rechaza y otro, reformulado, funciona.
4. El asistente termina generando un programa y luego contenido como una receta.
5. Muestra otra interfaz que reutiliza el asistente por una API. La idea es que alguien podría aprovechar recursos pagados por la tienda para fines ajenos.

**Resultado observado:** el asistente sale de la función que tenía asignada. Esto no demuestra que se haya tomado control del servidor, leído toda su información o conseguido permisos ilimitados.

### La idea que tenés que entender

**Prompt injection** es introducir contenido que desvía al modelo de las instrucciones que debería seguir. Puede llegar directamente por el chat o indirectamente dentro de un documento, correo o página que el asistente procesa. **Jailbreak** se usa para intentos de superar restricciones del modelo; los términos se relacionan, aunque no describen todos los casos de la misma forma.

Ejemplo propio: le pedís a un asistente que resuma un correo. El correo contiene una orden dirigida al asistente. Si trata esa orden como autoridad en vez de como texto a resumir, cruza una frontera de confianza. No toda petición para cambiar el formato constituye un ataque: en la demo importa que ese cambio consigue desviar la tarea.

La consecuencia depende de lo que el sistema permita hacer: generar texto fuera de tema y disponer de herramientas con acceso a datos tienen impactos diferentes. Para reducir el riesgo hacen falta permisos acotados, validaciones y límites fuera del modelo. Fuente de la ampliación: [OWASP · Prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/).

## 4. Segunda demostración: la tienda por dentro

### El recorrido normal

Cuando abrís una página, tu navegador pide un recurso. El servidor consulta lo necesario y devuelve una respuesta. En la práctica ponen **Burp Suite como proxy**, es decir, un intermediario configurado para observar ese intercambio.

![[Recursos Visuales/Seminario - Limites de confianza#Qué permite ver el proxy]]

Ejemplo propio, deliberadamente pequeño:

```http
GET /catalogo HTTP/1.1
Host: tienda.invalid
User-Agent: NavegadorDeEjemplo
```

- `GET`: pedir un recurso.
- `/catalogo`: qué recurso se pide.
- `Host`: a qué servidor va dirigido.
- `User-Agent`: qué cliente declara estar enviando el mensaje. Se puede cambiar; no acredita identidad ni permisos.

En un caso normal, la salida esperada sería la respuesta del catálogo. Este mensaje ilustrativo no se envió a ningún servidor.

### Fallo A: una cabecera llega a una consulta SQL

La **inyección SQL** ocurre cuando la aplicación mezcla entradas controlables con instrucciones SQL de forma insegura. Parte de lo que debía ser un dato termina alterando una consulta. La vulnerabilidad está en cómo la aplicación construye y usa la consulta; la cabecera no es peligrosa por existir.

Una búsqueda segura pregunta «mostrame el producto con este identificador» manteniendo separado el dato de la instrucción. Una búsqueda insegura construye el texto de la consulta pegando lo que recibió, y abre la posibilidad de modificar su significado. La defensa principal es usar **consultas parametrizadas**: estructura e información se pasan separadas. [OWASP · prevención de inyección SQL](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).

En el video, el punto de entrada es la cabecera **`User-Agent`** de una petición. La parte relevante no está en el formulario visible. Esto enseña que una aplicación también procesa datos que viajan por detrás de la pantalla.

La cadena mostrada, explicada por su propósito:

1. **Recorrer la tienda y crear una cuenta de prueba.** Permite obtener una petición con el contexto de una sesión.
2. **Ver y guardar una petición con Burp.** Así se ve lo que realmente envía el navegador.
3. **Usar sqlmap para comprobar la inyección.** La herramienta automatiza pruebas; no vuelve vulnerable una aplicación sana por ejecutarla.
4. **Identificar la base y sus tablas.** En pantalla aparece SQLite y tablas como productos, pedidos y usuarios.
5. **Consultar la tabla de usuarios.** Se muestran datos de cuentas, incluido el usuario administrador y su contraseña de laboratorio.

**Resultado observado:** lectura de registros de usuarios a través del fallo. No fue una adivinación de contraseñas. Sí había una cuenta de prueba y una petición con sesión; lo que no conocía al comenzar eran las credenciales administrativas. En la tabla aparecen contraseñas legibles: a 01:12:11 el docente aclara que las dejó así para simplificar el laboratorio. No hay que confundir eso con descifrar un hash. Guardar contraseñas sin un mecanismo adecuado de hash para contraseñas añade otro problema. Un hash de contraseña es un resultado calculado para verificarla sin guardar su texto original; no es un cifrado que se revierta con una clave. Si alguien obtiene hashes, puede intentar adivinar contraseñas y comparar resultados; el hash no vuelve inocua una filtración. [OWASP · almacenamiento de contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

### Fallo B: la segunda verificación no protege el acceso

Conocer usuario y contraseña permite superar la primera comprobación. La cuenta administrativa todavía muestra una pantalla que pide un código de seis dígitos.

En la parte final se observa una respuesta con el campo `mfa_required`. Mediante una regla de Burp se cambia el valor que recibe el navegador, de `true` a `false`, y después se muestra el panel de administrador.

Pensalo así: **cambiar el cartel que dice «falta el código» no debería abrir la puerta**. El servidor tiene que recordar que el segundo factor está pendiente y negar los recursos protegidos aunque el navegador intente otra cosa.

![[Recursos Visuales/Seminario - Limites de confianza#Una pantalla de código no basta]]

**Qué demuestra:** esa implementación permite acceder tras alterar el flujo mostrado. No significa que todo MFA se pueda desactivar editando una respuesta. No se inspeccionó aquí el código del laboratorio; la causa interna exacta no puede atribuirse a una función concreta solo por ver la pantalla. La comprobación debe hacerse en el servidor y cubrir los recursos protegidos. [PortSwigger · fallos en MFA](https://portswigger.net/web-security/authentication/multi-factor).

## 5. Para qué servía cada herramienta

| Herramienta vista | Su función en la clase |
| --- | --- |
| VirtualBox | Ejecutar una máquina virtual: una computadora virtual dentro de otra. |
| Kali Linux | El sistema desde el que el docente trabaja, con herramientas de seguridad disponibles. No es un requisito universal para aprender hacking. |
| Docker y laboratorio descargado | Levantar la aplicación vulnerable preparada para practicar, WebinarShop (`webinarshop.tar`, visible alrededor de 01:00). Un contenedor y una máquina virtual son tecnologías distintas. |
| Burp Suite | Observar peticiones y respuestas; en la demostración también modificarlas. |
| sqlmap | Automatizar pruebas de inyección SQL y, ante el fallo encontrado, consultar información. |

No necesitás instalar todo esto para leer esta guía. No se descargaron ni desplegaron las herramientas de ataque ni la máquina vulnerable durante esta revisión.

## 6. Qué conviene corregir al interpretar la clase

Aclaraciones del asistente, **20/10/2026**, apoyadas en las fuentes enlazadas y en lo visible en el video. No son errores que se te atribuyan a vos.

- **Identificar SQLite no prueba por sí solo una vulnerabilidad.** Cerca de 01:09:30 se presenta conocer el motor como un fallo en sí mismo. Es una pista técnica; la evidencia relevante del ejercicio es poder alterar consultas y leer datos sin el permiso correspondiente. [OWASP · inyección SQL](https://owasp.org/www-community/attacks/SQL_Injection).
- **`Mozilla` no equivale a Firefox.** Cerca de 01:08:36 se usa esa palabra para identificar el navegador. Chrome y otros también la incluyen por compatibilidad; además, la cabecera se puede modificar. No se usa como prueba de identidad. [MDN · User-Agent](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/User-Agent).
- **IA y SQL no se atacan del mismo modo.** Se parecen en que información controlada desde fuera influye en una decisión; cambian el mecanismo, las pruebas y las defensas. Prompt injection no es ejecutar SQL mediante palabras.
- **Una respuesta fuera de tema no demuestra un compromiso completo.** El alcance se mide por los datos o acciones realmente obtenidos.
- **MFA sigue siendo una protección útil.** La demostración rompe una implementación defectuosa. La presencia de una pantalla adicional tampoco prueba que esa protección esté bien aplicada.
- **Un laboratorio no autoriza otros objetivos.** El permiso corresponde al entorno preparado. Los comandos mostrados no se ejecutaron sobre tu equipo ni sobre servicios externos.
- **Las cifras y promesas laborales de la introducción son contexto del seminario.** No se verificaron como datos de mercado ni garantizan empleo. Tampoco hace falta aprender ahora cada término de IA que se menciona para comprender estas dos demos.

## 7. Comprobate en diez minutos

Sin volver al texto, respondé en [[Diario/2026-10-20/2026-10-20 - Apunte|tu hoja del Día 01]]:

1. ¿Qué debía hacer Ada y qué resultado mostró que se había desviado? ¿Eso demuestra acceso al servidor?
2. ¿Por qué también puede haber una inyección SQL en `User-Agent`, aunque nadie lo escriba en un formulario?
3. Si el navegador dice que ya no hace falta MFA, ¿qué debería comprobar el servidor antes de mostrar datos administrativos?

> [!tip]- Respuestas para comprobarte después de intentar
> 1. Debía ayudar con cómics; terminó generando contenido ajeno al catálogo. Eso demuestra desviación de tarea, no control completo del servidor.
> 2. Es una entrada controlable que la aplicación puede usar. Si se mezcla de forma insegura con SQL, puede alterar una consulta. La defensa separa datos e instrucciones.
> 3. Que esa sesión completó realmente los factores requeridos y tiene permiso para cada recurso. Cambiar una respuesta vista por el navegador no debería conceder acceso.

Si podés explicar esas tres ideas con un ejemplo propio, ya captaste la parte principal del día. La práctica técnica es otro paso y se registra solo cuando realmente la hagas.

## 8. Dónde volver en el video

| Minuto aproximado del archivo | Qué encontrarás |
| --- | --- |
| 00:00–00:22:10 | Espera inicial y cuenta regresiva. |
| 00:22:10 | Presentación de Mario Álvarez y del curso de tres días. |
| 00:26:20 | Participación de Chema Alonso y contexto de ciberseguridad e IA. |
| 00:38:18 | Problemas y riesgos de modelos de IA; introducción a jailbreak y prompt injection. |
| 00:45:32 | Demostración del asistente de cómics. |
| 00:55:24 | Cambio a la práctica de la tienda, entorno y herramientas. |
| 01:06–01:14 | Petición guardada, inyección SQL y consulta de datos. |
| 01:14–01:19 | Verificación adicional y acceso administrativo. |
| 01:20–01:23:20 | Cierre del ejercicio y continuación del seminario. |

Los cortes son orientativos, no capítulos oficiales. Para localizar una frase usá [[Cursos/Seminario Hacking Etico/Dia 01/Fuente y transcripcion - Dia 01|la fuente y transcripción]].

[[Cursos/Seminario Hacking Etico/00_Seminario|Volver al seminario]] · [[Cursos/00_Seguimiento de cursos|Mis cursos]]
