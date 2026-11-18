# Acción de salida para errores de sesión

Backend confirma JWT_TTL defaultPT30M en ms01 application.yml63; login devuelve expiresAt. No se cambia duración ni transporte/guardas. Un401 no demuestra por sí solo TTL: puede ser revocación o falta de sesión.

Crear acción de error reutilizable que clasifique ApiError.status401 (sin comparar mensajes traducidos): botón Cerrar sesión, llama logout existente y vuelve /login replace, limpia token/caché también ante rechazo del logout. Otros errores conservan Reintentar. Loading bloquea dobleclic. Mantener causa tipada en pantallas integradas en vez de inferir desde texto. Pregunta async pendiente para identificar pantalla exacta; avanzar componente independiente. Pruebas primero401/403/500/red y logoutfallido/dobleclick, luego integración aviso inicial y recarga con contenido.

Sin cambios de contratos/backend/permisos. Auditor adversario y segunda inspección independiente por tratar salida de sesión. Skills especializadas ausentes, ninguna cargada. Gates y navegador con401/localexpiresAt caducado. Backend runtimeJWT_TTL no verificado (valor por defecto puede sobrescribirse).

## Ampliación confirmada por el usuario

Respuesta async: «En varias pantallas». Se extiende a todos los reintentos HTTP existentes en catálogos/detalles/listados/formularios/paneles, buscador global y selector de categorías. useApiErrorState mantiene mensaje traducible y causa HTTP por separado; setError conserva validaciones locales y limpia causa anterior, setApiError guarda la excepción original. No se compara texto para clasificar401. Dashboard y búsqueda preservan causa en su estado existente. Comentarios de reportes ofrecen acción ante401 también. Reintentos de geolocalización conservados (no son errores HTTP de sesión).

Traducción Cerrar sesión→Sign out añadida. Test diferido de logout confirma disabled/una llamada al dobleclic. Focal34/34 (6archivos), incluidos hooki18n/reset,401/403/500/red, logoutfallido, inicial de recomendaciones yreportes. Typecheck/lint/build exit0. Build índice274,62kB/85,12gzip. Sin cambios en AuthProvider/httpClient/authToken/contratos/TTL/permisos.

Suite general602/606: ExplorePage y SiteListPage fallos de catálogo conocidos; dos fallos en validación de RegisterPage bajo carga. Repetición aislada RegisterPage24/24 en21,62s (sin cambios a ese archivo). No se desactivan pruebas ni se declara suite verde.

Auditor adversario y auditor independiente revisan nueva cobertura global; traducción, dobleclic y comentarios401 corregidos tras observaciones. Skills normativas de depuración/TDD/React/seguridad/verificación/auditoría ausentes, ninguna cargada.

Navegador final31/31 (1,4min):6casos nuevos expiran expiresAt después de restaurar AuthProvider; recomendaciones con tarjetas/inline401, reportes y catálogo en375/1280 muestran Cerrar sesión (sin Reintentar), hacen una sola llamada fallida y llegan /login con sessionStorage vacío incluso si POST logout responde401. Captura /tmp/session-expired-recommendations-375.png revisada. El primer intento de estos6casos falló antes de expirar por fixture con categoryId/siteIdnull; corregido a strings según schema real y repetido sin cambios de producción.

Cobertura:39vistas/componentes con acciones HTTP migradas; solo permanecen reintentos de mapa/geolocalización fuera de ApiErrorAction. No se redirige automáticamente por nuevos timers ni se cambia política de401 del cliente. No probado JWT_TTL efectivo del despliegue, expiración real esperando30min, Safari/iOS ni todas las39integraciones individualmente. Se usa reloj simulado para reproducir el caso.

Auditor adversario PASA; independiente PASA CON RESERVAS sin bloqueantes. Reserva baja: si todas las fuentes de búsqueda global fallan, se conserva el primer error; un500 anterior a un401 muestra Reintentar porque el mensaje mostrado corresponde al500. No se cambia esa prioridad ni se fuerza logout por errores de permisos/red.

Repetición final de suite terminó con exit143 sin resumen; motivo no determinado. Se conserva evidencia de ejecución completa anterior602/606 y focal34/34 + Registeraislado24/24, sin afirmar suite general verde. git diff --check sin errores. No cambios de implementación después del E2E31/31.
