# Tarjeta de filtros desplegable

FilterBar compartido: botón permanente Filtros con icono decorativo, fuera de la tarjeta. Cerrado inicial en todos los viewports. Ocultar tarjeta completa (campos, resumen, chips y limpiar), manteniendo controles montados y valores. aria-expanded/aria-controls en botón, hidden en tarjeta y regla CSS explícita para que display:flex no lo anule. Sin cambio de nombre al alternar.

Pruebas: estado inicial oculto, icono, toggle click/teclado, campos fuera del árbol accesible cerrados, valores conservados al reabrir, chips/limpiar abiertos; adaptar pruebas de catálogo a abrir antes de usar controles. Puertas typecheck/lint/test/build. Skills normativas no disponibles en sesión (búsqueda previa).
