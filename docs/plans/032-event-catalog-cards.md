# Tarjetas del catálogo de eventos

Sustituir filas horizontales por grid de tarjetas con estilo SiteCard: Link completo, Media fallback sin inventar poster, badge fecha sobre imagen, nombre/categoría/precio. Sin hora, lugar, aforo ni botón detalle. Eventos gratuitos muestran Gratis. Badge semántico time incluye fecha ISO/label completo y día/mes localizado. No cambiar filtros/paginación/API ni listado planificados que comparte estilos de filas.

Crear EventCard named+index/CSS Module; pruebas previas de contenido, enlace, fecha/precio. Retirar dateParts local y CSS usado solo por viejas filas de catálogo. Puertas typecheck/lint/test/build y navegador375/768/1280/1920 ES/EN, click/Enter y layout. Auditor independiente. Skills normativas indisponibles catálogo/tool; no se simula uso. Conservar cambios previos.

Evidencia: red previo importEventCard inexistente; después puerta typecheck/lint/test/build exit0,74 archivos/493 pruebas. Cinco avisos lint previos, línea EventListPage se desplaza por eliminar helper. Build índice273,25kB (84,88gzip), sin dependencias nuevas.

Playwright event-catalog:8 esperados/0inesperados/0omitidos/0inestables,13,20s;375/768/1280/1920 ES/EN, claro/oscuro,6 eventos fixture con nombres largos y unoGratis, badge localizado y fechaISO, sin datos extra ni botones, gridresponsive sin overflow. Enter375, clicfallback768 y cliccategoría desktop abren detalle. Capturas032 inspeccionadas1280. API simulada, sin posters inventados ni escrituras externas; mapas abortados en fixture tras navegar (fuera del caso catálogo).

Auditor readonly audit_media_grid PASA CON RESERVAS, sin bloqueos: Link nativo, contenido acotado, localización, estilos/grid, filtros/paginación y Planificados conservados; CSS retirado sin consumidores. No probado Ctrl+clic manual/Safari/iOS físico, fechas cercanas a medianoche con zonas horarias distintas ni zoom200%/lector pantalla. Skills normativas indisponibles, revisión manual sin simular uso. Sin contrato/backend ni commit/push/PR/merge.
