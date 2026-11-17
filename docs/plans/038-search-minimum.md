# Mínimo general de búsqueda

Regla compartida: texto vacío permite restablecer listado; texto no vacío requiere 3 caracteres tras trim. Conservar debounce 300ms en catálogos/global y 350ms usuarios. Aplicar a texto de categoría, no IDs de filtros. Bloquear búsquedas cortas de URL en catálogos antes de list; no tocar contratos ni filtros locales sin red.

Tests primero: debounce y mínimo juntos, cancelación al acortar, borrar para restablecer, global sin peticiones cortas y usuarios. Verificar typecheck, lint, test, build. Skills normativas no disponibles en la sesión (búsqueda previa); no se simula su uso.
