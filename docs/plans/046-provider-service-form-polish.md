# Ajustes de formulario de servicio

Badge AppLayout SERVICE_PROVIDER: Prestadora móvil (<900px), nombre completo desktop. Categorías del formulario: list('SERVICE') y filtrar scope SERVICE. Atractivo cambia a Atractivo mas cercano. Política mantiene DOM móvil y se coloca desktop fila4col2 junto capacidad, bajo precio, mediante wrapper grid (dos columnas desde620).

ImageUploader compartido: círculo visible de quitar al60% del anterior (44px→26.4px), conservar objetivo táctil44 mediante botón transparente y span visible. Mantener hover/active/focus/disabled. Sin alterar subida.

Prueba de categorías primero en tests de creación; demás cambios son presentación reversible, sin tests que repliquen CSS. Verificar suites existentes, typecheck/lint/test/build y auditor. Skills normativas ausentes según búsqueda previa.

## Verificación

Typecheck, lint y build exit0. Focales:3 archivos/12 tests exit0. Regresión previa:6 casos de creación fallaban con categorías sin scope. Suite general546/548,2fallos de catálogo (ExplorePage/ServiceListPage) de timing ya observados anteriormente. Auditor PASA por inspección. Sin medición real de badge móvil, grid desktop ni control de eliminación en navegador. Skills normativas ausentes, sin simular uso.
