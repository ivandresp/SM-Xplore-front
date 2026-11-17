# Ubicación del reporte en mapa

Petición: en Ficha del reporte sustituir coordenadas visibles por OpenStreetMap cuando hay ubicación.

Contrato leído: `../SM-Xplore/microservices/ms-02-security-reports/src/main/java/com/smxplore/securityreports/infrastructure/adapters/in/web/dto/SecurityReportResponse.java:14` lleva LocationDto; LocationDto.java:8–9 contiene latitude/longitude. No hay cambios de wire ni peticiones de API.

Reutilizar MapPreview existente, pasando ubicación y título. Mantener «Sin ubicación registrada» cuando falta. Retirar también la repetición numérica en la cabecera del detalle. Se heredan marcador, atribución, carga, reintentos y fallback offline; sin dependencias ni proveedor nuevo. No tocar altas/listados de reportes ni permisos.

Adaptar pruebas existentes con/sin ubicación antes del cambio; verificar typecheck/lint/test/build y viewports 375/768/1280. Skills normativas no disponibles según búsqueda de sesión, no se atribuye su uso. Auditor separado al finalizar.

## Evidencia (2026-11-16)

- Test adaptado antes del cambio: 1 fallo/2 pasan (mapa ausente). Tras integrar MapPreview: suite completa `npm test -- --maxWorkers=2` → 67 archivos/445 pruebas pasan. Pruebas de detalle cubren mapa dentro de dd Ubicación, atribución, ausencia de coordenadas visibles y reporte sin ubicación.
- `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` → exit 0. Cinco advertencias previas de lint, ninguna nueva.
- MapPreview recibe latitude/longitude y título; location null no monta mapa. Sin cambios en MapPreview, servicios, CSS, permisos ni estado del reporte.
- Navegador Chrome for Testing con sandbox contra build de producción: nueve casos (375/768/1280 × mapa cargado/sin ubicación/tiles bloqueados), overflow horizontal 0 en todos. Mapas reales de OSM cargaron cuatro tiles por caso; se reutilizaron las respuestas en memoria del arnés para no repetir descargas del proveedor. Sin ubicación: cero tiles. Tiles bloqueados: ocho intentos (dos por tile), fallback y enlace a OpenStreetMap visibles; la ficha permanece accesible.
- API de reportes y sesión interceptadas mediante fixtures. Capturas con título/descripción de prueba, no datos reales: `docs/diseno/021-report-map-{375,768,1280}.png`. Inspección visual directa de 375 px. Métricas: `docs/diseno/021-report-map-metrics.json`.
- Build: ReportDetailPage 8,89 kB/2,81 gzip; MapPreview compartido 3,66/1,68 y CSS 1,55/0,64. Índice 272,60/84,71. No nuevas dependencias.
- Auditor separado: PASA CON RESERVAS, sin bloqueos por lectura. Sus reservas de viewports/carga/fallo de tiles se comprobaron posteriormente en navegador por el principal.
- Skills usadas: ninguna; no disponibles systematic-debugging, writing-plans, test-driven-development, react-expert, typescript-pro, ui-ux-pro-max, web-design-guidelines, verification-before-completion, ponytail-review, code-reviewer, the-fool y security-reviewer. Descartadas API/backend/caché/animación porque se reutiliza un mapa existente y no se altera el contrato.
- No probado: Safari/iOS, lector de pantalla, zoom 200 %, comentarios/cambios de estado contra backend real. Sin cambios de dichas acciones.
- Rama fix/better-ui, cambios locales sin commit/PR; pendiente flujo de GitHub y review manual. No se tocó develop.
