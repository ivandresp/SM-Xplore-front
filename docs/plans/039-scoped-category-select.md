# Categorías por scope

Alcance: filtros de actividades/eventos y formularios de creación. Usar SelectField agrupado por GENERAL y ACTIVITY/EVENT, cargando todas las páginas con categoriesApi.listPage. Enviar nombre, no UUID, porque ms-03 recibe String category. No modificar edición ni backend.

Contratos leídos: ms-04 CategoryController.java:94-104 (scope, page/size), CategoryScope.java:3-9; ms-03 ActivityRequest.java:18 y EventRequest.java:20 (category string), controllers de ambos listados (String category).

Regla: categoría de catálogo elegida directamente; no aplicar debounce ni longitud mínima de búsqueda de texto. Nombre mantiene debounce y mínimo. Creación requiere selección; carga/error/vacío visibles en el campo, con reintento de carga. Verificar tests del componente, integración filtros y creación, puertas typecheck/lint/test/build y auditoría independiente.

Skills normativas no instaladas en esta sesión (búsqueda previa), ninguna se simula.

Hallazgo de auditoría: ms-04 permite nombres de categorías sin máximo; ms-03 admite hasta 50 caracteres. Se valida ese límite en ambos formularios antes del POST, con mensaje explícito y sin truncar nombres. Tests de regresión fallaron antes del fix (2) y se vuelven a ejecutar con las puertas.
