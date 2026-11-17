# Card de catálogo de servicios

Seguir ActivityCard/SiteCard: Link sobre toda superficie a /servicios/:id, sin botón anidado, estilos hover/active/focus existentes. Mantener foto, nombre, categoría, tipo y precio; eliminar solo nombre prestadora. Categoría visible bajo título incluso sin foto; tipo y precio en footer compacto. Sin API ni dependencias nuevas.

Actualizar prueba existente de catálogo para confirmar datos y enlace, sin tests que repliquen CSS. Puertas typecheck/lint/test/build y auditoría. Skills normativas ausentes según búsqueda previa.

## Verificación

Regresión previa: prueba de catálogo fallaba al no existir enlace con nombre del servicio. Focal final4 archivos/10tests aprobados. La prueba espera con waitFor enlace/datos/resumen final para no observar transición de loading. Typecheck/lint/build exit0. Suite general545/548:3fallos temporales de ExplorePage/SiteListPage ya observados; ServiceListPage pasa. Auditor PASA. No probado teclado en navegador, fallo real de imágenes ni geometría móvil con nombres largos. Skills normativas ausentes.
