# Seleccionar ubicación del reporte en mapa

Reemplazar geolocalización por LocationPicker existente (OSM) sin nuevas dependencias ni decisión de proveedor. value inicialnull: centrar Santa Marta no adjunta punto hasta selección explícita. Ubicación sigue opcional por SecurityReportRequest.java:14; enviar mismo objeto latitude/longitude y omitirlo sin selección. Se puede cambiar/quitar; conservar al cambiar texto/errorenvío. Deshabilitar picker al guardar; fallo/carga de mapa no bloquea envío sin ubicación. Sin prompts geolocalización ni inputs coordenadas. Fotos/validaciones/rutas intactas.

Tests primero: selección real con teclado, ausencia petición GPS, quitar, fallo mapa, conservación/edición/reintento; mantener tests fotos/título. Eliminar tests de GPS del formulario ya obsoletos y hookGPS sin consumidores con sus tests. Gate typecheck/lint/test/build y auditor adversario. Navegador375/768/1280 con tiles simulados para seleccionar punto y enviarpayload. No backend nuevo; DTO verificado en repo sololectura. Skills normativas ausentes, ninguna cargada. La elección OSM/picker ya fue autorizada y usada en proyecto, no se abre decisión nueva.

## Evidencia

Red inicial4fallos/7pass por mapa ausente. Focal final21/21 (formulario11+picker10), selección/quitar/fallo/persistencia y edición con payload real; se conserva cobertura fotos/validación. Mock de MapPreview solo simula tiles ready/error, picker real conserva cálculo/estado; activación de botón con detail0 reproduce click de teclado (keyDown aislado no dispara click nativo en jsdom).

Typecheck/lint/build exit0. Build índice274,63kB/85,11gzip. Suite588/593: fallos en RegisterPage(3), ExplorePage y SiteListPage; no se afirma suite verde ni se modifican esos tests. Se retiran11tests de hookGPS sin consumidores y2casos netos del formulario por cambio de requisito (13→11), manteniendo tests de fotos/validación.

Auditor audit_table PASA por inspección. No probado backend real, tiles reales en todos los navegadores, Safari/iOS ni gestos táctiles físicos. Skills normativas ausentes, ninguna cargada. Sin dependencias/endpoint nuevo; selección OSM reutiliza decisión previa del proyecto. git diff --check sin errores.

Playwright final34/34 (1,9min): nuevo flujo en375/768/1280 selecciona/quita/mueve punto con teclado y envía coordenadas;375 verifica conservar selección y texto tras500yreenviar. Contador GPS permanece0. Sin overflow. Captura /tmp/report-location-map-375.png revisada; tiles simulados como en otras pruebas de mapa.
