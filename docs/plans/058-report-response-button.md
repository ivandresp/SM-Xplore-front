# Cards de reportes y acceso a comentarios

Cambiar la acción de pie por Button outline con icono mensaje y conteo numérico, accesible como respuestas; mantener alineación derecha y quitar contador duplicado. Quitar coordenadas de card y mover badge a la línea de fecha. Navegar por reportsPath a detalle#comentarios; esperar carga del detalle para enfocar y desplazar sección con scroll-margin, sin cambiar permisos ni llamadas API.

Pruebas primero: acción con hash, ausencia de texto/coordenadas, badge en metadatos; detalle con hash hace scroll/foco tras cargar. Gates existentes, auditoría por inspección. Skills normativas ausentes según búsqueda previa, ninguna cargada; sin endpoints ni dependencias nuevos.

## Evidencia

Test rojo inicial:1fallido/3pasaron, no existía botón «Ver0respuestas». Focal final8/8 (2archivos); navegación al hash y scroll/foco tras carga cubiertos. Consulta del badge acotada a article para distinguirlo del filtro. Typecheck/lint/build exit0, lint mantiene avisos previos. Suite general585/588; mismos fallos ExplorePage, EventListPage y SiteListPage de bloques previos. Auditor audit_table PASA tras corregir consulta ambigua.

Primera ejecución navegador:21/22; los tres casos nuevos375/768/1280 pasan. Un fallo ENOENT de artefactos en menú768en porque lancé otra configuración simultáneamente, que también rechazó servidor5187 ocupado. Se repiten secuencialmente ambas configuraciones para obtener evidencia limpia. Captura /tmp/report-response-375.png revisada: botón a derecha y badge junto fecha.

No se modifica API ni conteo previo (número de comentarios cargados de la primera página; no hay nuevo endpoint de total). No probado backend real, lector de pantalla o Safari/iOS. Skills especializadas de planificación/TDD/UI/verificación/auditoría no disponibles; ninguna cargada. Sin dependencias nuevas.

Repetición secuencial final: guías/prestadoras20/20 en26,8s; turista22/22 en35,6s. Recorrido botón→detalle#comentarios→sección enfocada/heading en viewport aprobado en375/768/1280. Panel conserva navegación en español/inglés1280/1920. Sin conflictos en repetición. git diff --check sin errores.
