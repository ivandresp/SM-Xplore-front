# Detalle y panel de comentarios

Sustituir card Descripción por la ficha existente; retirar descripción del detalle como pide el usuario. Ficha/fotos en columna principal; comentarios en otra columna con gestión/historial existentes. Panel details abierto por defecto, summary con título/chevron. Lista con altura fija acotada y scroll interno, sin divisores. Formulario fuera del scroll; textarea rows1 crece con contenido hasta10rem, botón enviar44px dentro esquina superior derecha con nombre accesible. Mantener errores, paginación y contratos existentes, sin likes/replies/emojis/avatares.

Pruebas: estructura/collapse y publicación con borrado al éxito/preservación al error; navegador375/768/1280 con lista larga, alto estable tras paginación, textarea crece y se reinicia, formulario fuera del scroll, enlace #comentarios. Gates y auditor adversario. Skills normativas ausentes en entorno; ninguna cargada. Sin nuevos endpoints ni dependencias.

## Evidencia de implementación

Prueba inicial de estructura falló (seguía presente la descripción); implementación elimina esa card y mueve ficha y comentarios. Focales10/10 en2archivos, incluidos envío con trim, borrado al éxito y conservación del borrador ante error. Typecheck/lint/build exit0; lint conserva avisos previos. Suite general588/590: fallan SiteListPage y EventListPage (esqueleto tras carga rápida), ya registrados antes del delta.

Primer Playwright25/25 en53,6s: paginar10→20 mantiene altura de lista; formulario fuera del scroll, textarea crece y vuelve al alto inicial al enviar, panel plegable, sin overflow375/768/1280. Capturas /tmp/comments-panel-{375,768,1280}.png revisadas. Auditor detectó resize de textarea oculto; corregido con guard de visibilidad y recálculo al abrir, prueba de navegador ampliada. Auditor audit_table PASA por inspección tras corrección. Placeholder breve para mantener campo inicial en una línea.

No probado: backend real, Safari/iOS, lector de pantalla y zoom200%. Skills normativas especializadas no disponibles, ninguna cargada; no se necesitó generación de imágenes ni servicio Sites para este cambio de repositorio.

Verificación final tras corrección: Playwright25/25 en39,4s, incluida secuencia cerrar con borrador→resize→reabrir en375/768/1280. Build final exit0 (388ms). Sin errores de git diff --check.
