# Ubicación y fotos del sitio en dos columnas

Cambio visual local: agrupar LocationPicker e ImageUploader en creación y edición de sitios. Una columna en móvil, dos columnas iguales desde 768 px; minmax(0,1fr), hijos con min-width:0 y texto con overflow-wrap para que respeten el grid. Sin cambios de contratos, estados ni dependencias.

Verificación: puertas typecheck/lint/test/build y casos de navegador existentes en 320/375/768/1280, ES/EN, añadiendo comprobación geométrica de columnas. Revisión adversaria independiente. Skills normativas no disponibles en el catálogo; no se atribuye su uso.

Resultados: typecheck/lint/test/build salida 0; 69 archivos y 469 pruebas pasan. Lint conserva 5 avisos previos. Navegador: 8/9 casos pasan en primera ejecución; 768 px ES agotó los 30 s esperando el selector inicial antes de las aserciones. Reejecución aislada del caso: 1/1 pasa. Sin desbordamiento en 320/375/768/1280 y geometría de columnas comprobada en ES/EN. Capturas existentes 023 actualizadas; inspección visual de 1280 confirma textos ajustados y columnas alineadas.

Revisión independiente audit_media_grid: PASA CON RESERVAS, sin bloqueos en el diff final. Un wrapper duplicado transitorio se detectó y corrigió antes de build/E2E. Sin cambios de payload. No probado: Safari/iOS físico, zoom 200 %, carga Cloudinary real. No commit/push/PR.
