# Zoom y ficha compacta del reporte

Petición: acercar el mapa, quitar identificador y situar fecha de creación junto al autor.

- Añadir controles opcionales +/− a MapPreview, activados solo en el detalle del reporte. Zoom acotado a 0..19 usando mercator existente; coordenadas/centro constantes. Sin librería ni proveedor nuevo.
- Controles de 44 px, etiquetas ES/EN, límites disabled y teclado nativo. Deben quedar fuera de role=img para ser accesibles. Reiniciar al cambiar ubicación/zoom inicial y limpiar timeout al cambiar nivel.
- Fecha en un elemento time junto al nombre del autor, con flex-wrap para móvil. Quitar solo fila de identificador y fila separada de creación; conservar ubicación, última actualización e historial.
- Tests primero: zoom cambia tiles, respeta límites, mantiene controles fuera de imagen y no aparece por defecto; fecha/autor comparten fila y no hay identificador en ficha. Puerta typecheck/lint/test/build y navegador 375/768/1280.

Sin cambios de contratos/API, geolocalización, estado del reporte ni dependencias. Se respetan cambios locales del bloque 021. Skills normativas no disponibles por búsqueda de sesión; no se afirma su uso. Revisión por auditor separado.

## Evidencia (2026-11-16)

- Antes del cambio: tests focalizados nuevos/adaptados → 4 fallos/12 pasan. Con zoom y ficha compacta → 16/16 pasan.
- Auditor detectó que A→B→A recuperaba un nivel anterior. Se reprodujo con el test extendido (1 fallo/12 pasan). Corrección: MapContent interno con key por ubicación/zoom inicial/controles; estado y temporizador se reinician al cambiar esos datos. Idioma fuera de la key. Focalizados 16/16 pasan después.
- Puerta final: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` → exit 0. Lint conserva cinco advertencias previas. Suite final `npm test -- --maxWorkers=2` → 67 archivos/448 pruebas pasan.
- MapPreview expone zoomControls opcional, false por defecto. Controles +/− fuera del role img, con etiquetas ES/EN y límites 0..19. Tests comprueban límites y reinicio bidireccional por ubicación/zoom inicial. Keys de tiles incluyen frame para reemplazar elementos al cambiar nivel; timeout se limpia al accionar zoom.
- En el reporte se habilitan controles. Las filas Autor/Creado/Identificador (3) pasan a una fila de autor + time; ubicación y última actualización se conservan. El identificador continúa disponible internamente para API, sin mostrarse.
- Navegador Chrome for Testing con sandbox contra producción: seis casos (375/768/1280 × ES/EN; oscuro a 768). Botones 44×44, teclado Enter acerca 14→15 y aleja 15→14, tiles reales cargados, nombre y fecha en misma fila con la fixture, identificador ausente y overflow 0. Bloqueo de tiles tras acercar a 16 activa fallback con enlace; no rompe la ficha.
- API/sesión mediante fixtures, con título y descripción de prueba. Respuestas de tiles reutilizadas en memoria del arnés para no duplicar descargas. Métricas `docs/diseno/022-report-zoom-metrics.json`; capturas ES `022-report-zoom-{375,768,1280}.png`. Inspección visual directa de 375 px.
- Bundle: MapPreview JS 4,50 kB/1,94 gzip (antes 3,66/1,68); CSS 2,37/0,81 (antes 1,55/0,64). ReportDetailPage 8,81/2,84. No dependencias nuevas.
- Auditor independiente: PASA CON RESERVAS tras corregir el reinicio. Teclado/viewports se verificaron después por el principal. No se atribuye al auditor la ejecución de navegador ni la suite.
- Skills usadas: ninguna; no disponibles systematic-debugging, writing-plans, test-driven-development, react-expert, typescript-pro, ui-ux-pro-max, web-design-guidelines, verification-before-completion, ponytail-review, code-reviewer, the-fool y security-reviewer según búsqueda de sesión. Descartadas API/backend/caché/animación y librerías de mapas nuevas: no aplican al alcance.
- No probado: Safari/iOS, lector de pantalla, zoom del navegador 200 %, eventos de red deliberadamente retrasados durante cambios rápidos, acciones contra backend real. Los controles nativos +/− funcionan por clic/tacto/Enter; no se añadió gesto de pinza ni captura de rueda.
- Rama fix/better-ui, cambios locales sin commit/PR; pendiente GitHub/review manual. Se mantienen los cambios locales del bloque 021.
