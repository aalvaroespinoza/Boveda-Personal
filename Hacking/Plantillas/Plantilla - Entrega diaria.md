<%*
const fecha = tp.date.now("YYYY-MM-DD");

const temas = [
  "03 / Reconocimiento (Nmap)",
  "01 / Linux",
  "02 / Conceptos básicos",
  "04 / Laboratorios en Docker",
  "05 / Servicios y CMS",
  "06 / Enumeración y explotación",
  "07 / OWASP y web",
  "08 / Escalada de privilegios",
  "09 / Buffer overflow",
  "10 / Máquinas y material adicional",
  "Seminario Hacking Ético",
  "Otro / Repaso general"
];

const temaSeleccionado = await tp.system.suggester(temas, temas, false, "Selecciona el tema o etapa que estás estudiando hoy:");
const detalleClase = await tp.system.prompt("¿Qué clase, video o minuto vas a retomar?", "Clase ... · min ...");

let tagTema = (temaSeleccionado || "estudio")
  .toLowerCase()
  .replace(/^[0-9]+\s*\/\s*/, "")
  .replace(/\s+/g, "-")
  .replace(/[^a-z0-9\-]/g, "");
-%>
---
fecha: <% fecha %>
curso: Hack4u - Introducción al Hacking
etapa: "<% temaSeleccionado || 'General' %>"
tags:
  - estudio
  - hack4u
  - <% tagTema %>
---
# Entrega diaria · <% fecha %>

**Curso / clase / actividad / minuto para retomar:**
- **Tema / Etapa:** <% temaSeleccionado || 'General' %>
- **Clase / Minuto:** <% detalleClase || 'Sin especificar' %>

**Continuación de:** (enlazá el apunte anterior si seguís la misma clase; si no, dejalo vacío)

## Mis notas — escribí todo acá

<% tp.file.cursor() %>

## Dudas y dónde sigo



---
Con esto alcanza. Si usaste ayuda o solo viste una demostración, anotarlo ayuda a revisar bien.
Subí este Markdown o un PDF a [Entregas de Drive](https://drive.google.com/drive/folders/16R_I9KT7L3GNTArD77_xb8BIsPrwrZmO). Adjuntá los archivos importantes: los enlaces locales no los suben solos.
Tu diario queda intacto. La revisión reúne lo ya trabajado en [[Cursos/Hack4u/Introducción al Hacking · Mi apunte|el apunte central]], con las correcciones identificadas y un PDF de devolución.
