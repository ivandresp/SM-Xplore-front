# Tarjeta de atractivo y miniaturas visibles

SiteCard: sustituir article/botón detalle por un único Link que abarca foto, nombre y zona. Eliminar coordenadas. Link nativo para teclado, nueva pestaña y navegación, con estados hover/active/focus-visible y sin interactivos anidados.

SitePhotoGallery: eliminar details/summary; miniaturas siempre visibles debajo de Foto x de N cuando N>1. Mantener portada seleccionable y casos0/1. Retirar CSS muerto del acordeón. Sin cambios API, datos, mapas ni otras tarjetas de actividades/eventos/servicios.

Actualizar pruebas existentes y añadir contrato de enlace completo sin coordenadas, test rojo antes. Verificar typecheck/lint/test/build, navegador catálogo+galería375/768/1280 teclado, auditor independiente. Skills normativas no disponibles en catálogo/tool; no se atribuye uso. Conservar cambios previos.

Resultados: rojo previo2 fallos (enlace completo inexistente y details aún presente),2 casos previos pasan. Puerta typecheck/lint/test/build exit0; cinco avisos lint previos. Navegador11 casos esperados/0inesperados/0omitidos/0inestables en13,50s; galería375/768/1280 ES/EN,0/1/N fotos, selección Space; catálogo mismas anchuras con Enter en375, clic foto768 y clic zona1280 abren detalle. Sin botón anidado ni coordenadas en tarjeta; sin overflow horizontal, resize1280→375 sigue verificado. Capturas026 actualizadas y028 catálogo; inspeccionadas1280 y375.

Auditor audit_media_grid readonly PASA CON RESERVAS, sin bloqueos; revisó Linknativo completo, falta de interactivos anidados, estados CSS, miniaturas visibles y controles accesibles. No probado Safari/iOS físico, Ctrl+clic/nueva pestaña manual, zoom200%/lector de pantalla ni imágenes rotas. Navegador usa fixtures de API/fotos marcadas de prueba y tilesOSM reales; sin escrituras externas. Skills normativas indisponibles, no se simula uso; revisión manual independiente. Sin cambios backend, dependencias, commit/push/PR.
