# Toolbar y separación de reportes

Wrapper local alrededor FilterBar con12px margen inferior abierto/cerrado. Mover acción del PageHeader a actions de FilterBar: Button accent circular44px, icono+ y nombre accesible Nuevo reporte, navega reportsPath/nuevo. Conserva colores e interacción del Button existente. No cambia datos ni bloqueo backend de062. Tests existentes y navegador375/768/1280 para misma fila, forma/tamaño y separación antes/después desplegar; sin nuevos unitarios para CSS. Skills normativas ausentes, ninguna cargada.

Verificación: typecheck/lint/build exit0. Suite588/591, fallos previos en ExplorePage/SiteListPage/EventListPage. Auditor audit_table PASA por inspección; separación entre cards sigue1px. Sin cambios de contrato ni permisos. No probado backend real, zoom200% ni lector de pantalla. Skills normativas ausentes, ninguna cargada. git diff --check sin errores.

Playwright turista25/25 (1,0min): verificación en375/768/1280 de misma fila, diámetro>=44px y gapentre10y16px cerrado/abierto; botón navega a /reportes/nuevo. Captura /tmp/report-response-375.png revisada: icono+ circular accent a la derecha y12px bajo toolbar. Sin overflow.

Playwright panel20/20 en32,4s: Nuevo reporte abre dentro del shell guía/prestadora en español/inglés; navegación móvil conserva panel. Sin cambios posteriores de implementación.
