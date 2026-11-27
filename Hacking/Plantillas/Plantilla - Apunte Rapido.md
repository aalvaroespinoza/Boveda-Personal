<%*
const fecha = tp.date.now("YYYY-MM-DD");
const hora = tp.date.now("HH:mm");
const diarioPath = `Diario/${fecha}/${fecha} - Apunte.md`;

const apunte = await tp.system.prompt("Escribe o pega tu apunte rápido:", "");
if (apunte && apunte.trim().length > 0) {
    let archivo = tp.file.find_tfile(diarioPath);
    if (!archivo) {
        // Buscar si existe el archivo
        const archivoBuscado = app.vault.getAbstractFileByPath(diarioPath);
        if (archivoBuscado) {
            archivo = archivoBuscado;
        } else {
            const template = tp.file.find_tfile("Plantillas/Plantilla - Entrega diaria.md");
            archivo = await tp.file.create_new(template, `${fecha} - Apunte`, false, `Diario/${fecha}`);
        }
    }
    
    const contenido = await app.vault.read(archivo);
    const textoAgregar = `- **[${hora}]** ${apunte.trim()}\n`;
    
    const marcador = "## Mis notas — escribí todo acá";
    let nuevoContenido;
    if (contenido.includes(marcador)) {
        nuevoContenido = contenido.replace(marcador, `${marcador}\n\n${textoAgregar}`);
    } else {
        nuevoContenido = `${contenido}\n\n${textoAgregar}`;
    }
    
    await app.vault.modify(archivo, nuevoContenido);
    new Notice(`Apunte rápido guardado en el día de hoy [${hora}]`);
}
-%>
