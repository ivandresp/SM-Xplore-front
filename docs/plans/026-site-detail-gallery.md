# Ficha de sitio: ubicación y fotos

Eliminar tarjetas independientes de latitud/longitud y mostrar sus valores en ¿Cómo llegar? mediante lista de definición. Mantener tarjeta Zona. Colocar galería/portada y mapa en una fila desde1000px; en móvil/tablet apilados. Grid scoped a esta ficha, sin cambiar otras páginas de catálogo.

La API ya devuelve photosUrls y sitesApi los mapea a photoUrls. Actualmente solo se lee índice0. Añadir SitePhotoGallery: portada inicial primera foto, acordeón nativo details/summary cuando hay>1; miniaturas como botones con aria-pressed para elegir portada; sin autoplay. Cero fotos mantiene mensaje existente, una foto sin acordeón. Cambiar sitio remonta galería. Sin cambios API/dependencias.

Pruebas previas: ficha coordenadas dentro de Cómo llegar, galería0/1/varias y selección. Puertas typecheck/lint/test/build, navegador375/768/1280 con teclado y geometría, auditor readonly independiente. Skills normativas ausentes catálogo/herramienta, no se atribuye su uso. Mantener cambios previos categorías en ambos repos sin tocarlos.

## Evidencia final

- Regresión previa: test de ficha falla por no encontrar Latitud dentro de Cómo llegar; test de galería falla import inexistente. Después:4 pruebas focalizadas pasan.
- `npm run typecheck && npm run lint && npm test -- --maxWorkers=2 && npm run build` → exit0;72 archivos/487 pruebas. Cinco avisos lint previos ajenos al bloque. Build SiteDetailPage5,86kB (2,20gzip), índice273,21kB (84,86gzip). Sin dependencias añadidas.
- `E2E_BROWSER_EXECUTABLE=…/chromium-1254/chrome-linux64/chrome npx playwright test --config playwright.site-detail.config.ts --reporter=json` →8 casos esperados/0inesperados/0omitidos/0inestables,9,81s. Verifica0/1/3fotos, Enter en summary, Space en miniatura, selección conservada al colapsar, coordenadas solo en Cómo llegar y geometría desktop/apilado en375/768/1280 ES/EN. Cero desbordamiento horizontal. Claro/oscuro. Capturas026 inspeccionadas en1280; fotos SVG etiquetadas de prueba, tiles OSM reales reutilizados en memoria por el test.
- Auditor adversario independiente audit_media_grid: PASA CON RESERVAS, sin bloqueos; ejecutó4 pruebas focalizadas, revisó coordenadas, reset por keysite, native details, estados interactivos y encapsulado CSS. Sin cambios en catalog.module.css compartido.
- Skills normativas de planificación, diseño, implementación, pruebas y verificación no disponibles en catálogo/herramienta; no se simula su uso. Se aplicaron plan/spec, test rojo, puertas, navegador y revisión manual independiente. Skills disponibles imágenes/Sites/OpenAI/mascotas no aplican a esta modificación React local.
- No probado: Safari/iOS físico, lector de pantalla/zoom200%, URL de imagen rota y navegación entre sitios sin recarga. API de navegador simulada; sin cargas/escrituras reales. No se cambió contrato ni backend en este bloque. Cambios previos de categorías conservados. Sin commit/push/PR/merge.
