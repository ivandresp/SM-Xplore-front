# Detalle público de servicios

Común: quitar subtítulo del nombre; fusionar precio y contacto, texto solo contratación directa, enlace existente a perfil con label Contactar a la prestadora. Sin API ni contratos nuevos.

Mobile<768 conserva orden portada, descripción, propiedades, ubicación, tarjeta fusionada, reseñas. Tablet768..999 tarjeta/contacto junto a mapa bajo detalles. Desktop>=1000 portada a izquierda y rail contacto+mapa a derecha, mismo bottom; detalles y reseñas debajo. CSS Module exclusivo, sin alterar actividades/atractivos. Mapa adapta proyección a dimensiones reales con ResizeObserver usando MapPreview width/height existente, reserva atribución visible. Portada puede estirarse si hace falta para alojar tarjeta y mapa mínimo, sin desbordar.

Verificación: test existente detalle comprueba texto, única tarjeta, enlace y mapa; E2E responsive375/768/1280/1920 con APIs/tiles simulados mide posiciones y overflow; puertas typecheck/lint/test/build y auditoría. Skills normativas ausentes según búsqueda previa.

## Evidencia final

- Typecheck/lint/build exit0; build1.39s. Focales actuales3archivos/38tests aprobados. Suite general547/548: fallo de timing existente en ExplorePage (recarga4resultados).
- E2E command E2E_BROWSER_EXECUTABLE=…/chromium-1254/chrome-linux64/chrome npx playwright test --config playwright.service-detail.config.ts --reporter=line → stdout final 4 passed (9.8s), exit0. test-results/.last-run.json status passed y failedTests vacío. /tmp/service-detail-e2e.log corresponde al intento inicial fallido por entorno restringido, no a ejecución final escalada.
- Viewports375/768/1280/1920 verifican posiciones, alineación inferior y nooverflow; resize adicional desktop comprueba atribución y viewport dentro del contenedor. APIs e imágenes/tiles simulados. Inspeccionadas capturas /tmp/service-detail-375.png,768.png y1280.png.
- Auditor BLOQUEA inicial por nodo de atribución desconectado al remount de MapPreview; corregido consultando nodo vigente en medida y renovando observer al cambiar dimensiones. Revisión final PASA.
- No probado backend real/tiles OSM reales, lector de pantalla ni cambio idioma durante resize. Skills normativas ausentes, no se simula uso.
