# Salida ante errores de autenticación

JWT_TTL lo define ms01, por defecto30min configurable; no modificarlo. Clasificar errores por ApiError.status401, con botón Cerrar sesión/Sign out, logout existente, limpieza de token/caché y navegación /login replace aun si logout falla. Bloquear dobleclick mientras se cierra.403/500/red mantienen Reintentar; no convertir errores de login o geolocalización en salidas de sesión.

Usuario confirmó que ocurre en varias pantallas: integrar39vistas/componentes que ofrecían reintentosHTTP, preservando validaciones locales, traducción, borradores, paginación y guardas existentes. useApiErrorState conserva causa original separada del texto; Dashboard/búsqueda conservan causa en su estado. No inferir sesión desde frases traducidas. Comentarios de reportes401también permiten salir.

Aceptación:401inicial/inline,403/500/red, traducción/reset de causa, logoutlento/dobleclick/fallido, sesiónlocalcaducada enrecomendaciones/reportes/catálogosen375/1280 con retorno login y sinrepetirconsulta protegida. Auditoría adversaria e independiente, gates y navegador. No se cambia backend ni almacenamiento ni política de caché.
