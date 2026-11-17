# Mapa y cómo llegar en la ficha

Dos columnas independientes en escritorio: galería/zona/actividades a izquierda; mapa/Cómo llegar/eventos a derecha. Así Cómo llegar sigue al mapa sin esperar altura de galería. Móvil apila columnas. Mapa mide ancho disponible con ResizeObserver y pasa tamaño real a MapPreview (máximo512), evitando recorte de coordenadas en móvil. Sin modificar proyección ni API.

Verificación: pruebas existentes de ficha/galería, añadir aserción de orden/tamaño en navegador375/768/1280 ES/EN; puertas typecheck/lint/test/build y revisión independiente. Skills normativas indisponibles en catálogo/tool; no se atribuye su uso. Cambios anteriores conservados.

Resultados: typecheck/lint/test/build exit0;72 archivos/487 pruebas, cinco avisos lint previos. Build ficha6,20kB (2,35gzip). Navegador8 casos pasan,0 fallos/omitidos/inestables,9,97s;375/768/1280 ES/EN, claro/oscuro, orden mapa→direcciones→eventos y ancho mayor300px (antes256). Redimensionar1280→375 actualiza mapa a300..350px y no desborda. Galería y0/1foto conservan pruebas. Capturas026 actualizadas e inspección visual1280 confirma eliminación del hueco entre mapa/direcciones/eventos. API simulada; tiles OSM reales.

Auditor audit_media_grid readonly PASA CON RESERVAS: observer sin ciclo evidente, cleanup correcto, hooks aislados y orden verificado por código; limitación de tamaño/resize cubierta después por navegador. No probado Safari/iOS físico, zoom200%/lector de pantalla, redimensionado repetido con red limitada. No cambio backend, dependencias, commit/push/PR. Skills normativas indisponibles, revisión y verificación manual sin simular uso.
