# Itinerario con atractivos

Añadir SITE al modelo local, sin ampliar ReservationItemType ni API. Selector de fecha obligatorio en ficha del atractivo y editable en itinerario; límites from/to del viaje cuando existen. Fecha local a mediodía para conservar el día sin conversión UTC. Atractivos sin precio ni reserva; filtrar explícitamente ACTIVITY/EVENT tanto en resumen como antes de crear reservas. Corregir textos de servicios. Mantener almacenamiento existente.

Contrato confirmado: ReservationItemType.java ms-03 solo ACTIVITY/EVENT; ReservationRequest.java usa ese enum. Sin cambios de backend. Skills normativas no instaladas/herramienta skill ausente; no se finge uso. Pruebas primero para filtro y metadatos; integración para itinerario mixto y atractivo solo, selección/edición y persistencia. Gates y auditor adversario al final. No cambiar cuentas, almacenamiento por usuario ni contratos.

## Evidencia final

- Antes: modelo local ACTIVITY/EVENT; sin selector de visita ni SITE. Dos pruebas nuevas del hook fallaron antes del cambio (filtro inexistente y etiqueta Evento).
- Después: 10/10 focales (hook, itinerario mixto/solo atractivos, ficha de atractivo, persistencia, límites de fecha y cambio de rango).
- Playwright: 19/19 en39,6s; itinerario probado en375/768/1280, sin overflow, fecha persiste tras recargar, se reordena por día, aviso al acortar viaje y corrección. Capturas /tmp/itinerary-sites-{375,768,1280}.png; móvil revisada.
- typecheck exit0; lint exit0 con avisos existentes; build exit0, índice275,43kB (85,43gzip). git diff --check sin errores.
- Suite general final583/586: fallos ExplorePage (Caminata por Tayrona), EventListPage y SiteListPage (esqueleto tras carga rápida). Fuera del delta; no se desactivaron ni modificaron esas pruebas.
- Auditor audit_table PASA tras corregir el hallazgo de fechas fuera del rango al acortar el viaje: aviso neutral y Guardar deshabilitado, sin mover visitas automáticamente.
- Skills normativas de planificación/TDD/React/diseño/verificación/auditoría ausentes; ninguna cargada. Skill Sites descartada: cambio local en repositorio existente, no servicio Sites. Sin nuevas dependencias, endpoints ni contratos de backend.
- No probado: backend real (API simulada en pruebas), Safari/iOS, zoom200%/lector de pantalla. Permanece limitación previa de almacenamiento local con clave compartida por navegador; sin cambios de sesión/caché.
