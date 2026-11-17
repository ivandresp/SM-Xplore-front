# Corrección del menú Explorar

El usuario aclara que Mis viajes y Mis reservas se conservan en el menú de Explorar. Restituir enlaces /itinerario y/mis-reservas junto a Home y4catálogos. Mantener este menú al entrar a viajes/reservas y detalle de reserva para poder navegar entre ambos; no agregar enlaces al menú habitual ParaTi/Explorar/Reportes/Perfil. No tocar rutas ni permisos.

Actualizar pruebas unitarias y E2E del bloque052 a menú7 para Explorar, recorrido de ambos enlaces y Home. Es un cambio de navegación/restitución ya autorizado. Verificar typecheck/lint/test/build y E2E33 usando config existente. Auditoría. Skills normativas ausentes según búsqueda previa.

## Evidencia final

Regresiónantes10fallos/7pasan; focalesfinal3archivos25tests aprobados. Typecheck/lint/build exit0 (build2.54s). Suite general579/582,3fallos intermitentes de catálogo previos. Navegador comando configtourist-navigation reporterline --grep tourist →14passed29.3s exit0; recorre7opciones,viajes,reservas yHome en375/768/1280 ES/EN,legacy/login/logout yreportes turista. Intento previo conregex ^tourist noseleccionótests; filtro corregido sin tocarproducto. Auditor PASA. No probado backend real, datos reales de reserva ni lector de pantalla. Skills normativas ausentes.
