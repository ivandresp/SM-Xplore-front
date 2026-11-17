# Itinerario con atractivos

Añadir SITE al modelo local, sin ampliar ReservationItemType ni API. Selector de fecha obligatorio en ficha del atractivo y editable en itinerario; límites from/to del viaje cuando existen. Fecha local a mediodía para conservar el día sin conversión UTC. Atractivos sin precio ni reserva; filtrar explícitamente ACTIVITY/EVENT tanto en resumen como antes de crear reservas. Corregir textos de servicios. Mantener almacenamiento existente.

Contrato confirmado: ReservationItemType.java ms-03 solo ACTIVITY/EVENT; ReservationRequest.java usa ese enum. Sin cambios de backend. Skills normativas no instaladas/herramienta skill ausente; no se finge uso. Pruebas primero para filtro y metadatos; integración para itinerario mixto y atractivo solo, selección/edición y persistencia. Gates y auditor adversario al final. No cambiar cuentas, almacenamiento por usuario ni contratos.
