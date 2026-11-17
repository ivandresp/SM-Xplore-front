# Mapa como portada del evento

Eliminar placeholder Sin fotos disponibles. Mover sección Ubicación al primer bloque de la columna izquierda, antes de Descripción/Información, sin duplicado. Mantener mensajes sitio inexistente/fallo consulta y reservas intactos. Mapa rectangular ancho completo de la columna y alto16:9 mínimo220/máximo512, ancho máximo1024; medir con ResizeObserver y cleanup, sin deformar tiles.

Extender MapPreview con width/height opcionales y mercatorFrame alto opcional, conservando size/defaults cuadrados para consumidores existentes. Test previo de geometría rectangular/tamaño y actualización test ficha orden/placeholder. Sin APIs/deps nuevas. Puertas frontend typecheck/lint/test/build y navegador375/768/1280, resize y fallos404/500/mapa. Auditor independiente. Skills normativas indisponibles catálogo/tool; no se simula uso. Cambios anteriores conservados.

Resultados: test ficha previo1fallo/2pasan por placeholder aún presente. Mapa rectangular red3fallan/34pasan, luego37/37. Puerta orquestador `npm run typecheck && npm run lint && npm test -- --maxWorkers=2 && npm run build` exit0;73 archivos/491 pruebas, cinco avisos lint previos. Build exit0 (473ms).

Navegador `… npx playwright test --config playwright.event-detail.config.ts --reporter=json`:20 esperados/0inesperados/0omitidos/0inestables,22,34s. Incluye9 casos evento y11 regresiones de catálogo/ficha de sitios. Evento375/768/1280 ES/EN, mapa ancho completo antesDescripción, altura proporcional, región única sin placeholder, controles personas/reserva presentes, sin overflow; resize1280→375 y errores404/500/tiles offline preservan mensajes y enlace. Mapas rectangulares mantienen centro y cobertura por pruebas matemáticas, tiles256 sin estirar. Capturas030 inspeccionadas1280; fixtures marcadas de prueba, OSM real.

Auditor independiente audit_media_grid: PASA CON RESERVAS, sin bloqueos; ejecutó50 pruebas focalizadas MapPreview/mercator/EventDetail/LocationPicker. Revisó compatibilidad size, proyección rectangular, observer con cleanup y sin cambios a reservas. No probado Safari/iOS físico, zoom200%/lector pantalla, reservas con backend real ni resize continuo/red lenta. API simulada en navegador, sin escrituras externas.

Skills normativas de implementación, diseño, planificación, pruebas y verificación indisponibles catálogo/herramienta; no se atribuye uso. Plan/spec, pruebas rojas, puertas y revisión manual independiente ejecutadas. Sin dependencias ni contratos nuevos, sin backend/cambios previos tocados, sin commit/push/PR/merge.
