# Elegir ubicación de sitios de una zona en OpenStreetMap

Petición: reemplazar escritura de latitud/longitud por selección visual del punto y guardar sus números en el backend.

Contrato leído: ms-04 `.../dto/site/CreateSiteRequest.java:23–24` y `UpdateSiteRequest.java:22–23`: Double latitude [-90,90] y longitude [-180,180], ambos obligatorios. `sitesApi.toBody` conserva esas claves. No cambia API ni se añaden dependencias.

Diseño:
- LocationPicker controlado con value {latitude,longitude}|null y onChange; alta sin selección inicial. Vista inicial Santa Marta o primer sitio existente de la zona; edición centrada en el sitio actual. Clic/toque elige punto; arrastre mueve vista sin modificar selección; flechas mueven vista y Enter/Espacio confirman centro.
- Zoom +/−, navegación cardinal y reintento, objetivos 44 px. Sin captura de rueda ni geocodificación. Selección deshabilitada si faltan tiles para evitar marcar a ciegas. Fallo de mapa no borra el resto del formulario ni una selección previa.
- Reutilizar MapPreview: tamaño responsive, opción de ocultar su marcador, desplazamiento visual durante arrastre sin solicitudes por movimiento, estado de carga comunicado al selector. Su API anterior mantiene defaults. Marcador del selector proyecta el valor elegido respecto a la cámara; mover/zoom no cambian números elegidos.
- Mercator: inversa de proyección y tamaño de viewport configurable. Verificar centro, bordes, coordenadas cero e ida/vuelta.
- ZoneFormPage: sustituir campos numéricos en alta y edición por LocationPicker, estados de punto numérico y payload intacto. Bloquear guardar sin punto, conservarlo tras error y reiniciar solo tras alta exitosa.

Orden: tests matemáticos/selector y de payload → implementar → puertas typecheck/lint/test/build → navegador 375/768/1280 con clic/arrastre/teclado/zoom/offline → auditoría adversaria y de contrato separadas.

Fuera de alcance: Leaflet/MapLibre, búsqueda de direcciones/Nominatim, geolocalización automática, cambiar proveedor OSM, permisos/sesión. Decisión de mapas ya autorizada por petición explícita y resuelta con motor existente; no dependencia nueva. Skills normativas no disponibles según búsqueda previa, no se afirma haberlas usado.

## Evidencia final

- `npm run typecheck && npm run lint && npm test -- --maxWorkers=2 && npm run build`: salida 0; 69 archivos y 469 pruebas pasan. Lint conserva cinco advertencias previas ajenas al cambio. Pruebas añadidas: inversa Mercator 3, selector 10, MapPreview 2 y formulario 6; se observó rojo antes de implementar matemática y formulario.
- `E2E_BROWSER_EXECUTABLE=…/chromium-1254/chrome-linux64/chrome npx playwright test --config playwright.location.config.ts --reporter=json`: 9 esperados, 0 inesperados, 0 omitidos, 0 inestables, 27,08 s. Métricas en `docs/diseno/023-site-picker-metrics.json`; casos reproducibles en `e2e/site-location-picker.spec.ts`.
- Chromium en 320/375/768/1280 px, ES/EN, modo oscuro y emulación táctil: clic/toque, arrastre, zoom, teclado, carga incompleta, reintento, error POST/PUT y persistencia del borrador. POST/PUT interceptados verifican los números exactos, incluido cero; no se probó escritura contra backend real. Tiles OSM reales reutilizados en memoria por el test, sin introducir caché en la aplicación.
- Desbordamiento inicial medido a 375 px: 64 px ES y 39 px EN; tras ajustar min-width/grid/flex-wrap locales: 0 px en todas las anchuras verificadas. Durante arrastre: 0 nuevas solicitudes de tiles hasta soltar. Capturas: `docs/diseno/023-site-picker-{375,768,1280}.png`.
- Build: ZoneFormPage 15,40 kB (4,95 gzip); índice 272,64 kB (84,71 gzip). Sin dependencias nuevas.
- Auditor adversario independiente `audit_logo`: PASA CON RESERVAS, sin bloqueos; revisó proyección, foco, carga, arrastre y CSS. Auditor de contrato en contexto limpio `audit_site_contract`: PASA CON RESERVAS, sin defectos de contrato/persistencia, ejecutó las 6 pruebas del formulario. Reservas: sin Safari/iOS físico, lector de pantalla, zoom 200 %, nombres extremos ni backend real; expiración de sesión y rechazo por rol fuera del cambio.
- Skills normativas (`systematic-debugging`, `test-driven-development`, `verification-before-completion`, `ui-ux-pro-max`, `ponytail-review`, `code-reviewer`, `the-fool`, `brainstorming`, `writing-plans`): no disponibles en el catálogo/entorno; no se atribuye su uso. Se documentaron plan/diseño, pruebas previas, verificación y revisión independiente sin ellas. No aplican las skills disponibles de imágenes, OpenAI, plugins o Sites a este cambio local de formulario.
- Entrega local en `fix/better-ui`; sin commit, push, PR ni merge.
