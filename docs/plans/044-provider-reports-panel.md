# Reportes de prestadora dentro del panel

Causa reproducida por código: navigation.publicTo SERVICE_PROVIDER=/reportes abandona AppLayout. Reutilizar solución guía: nav /app/reportes; lista propia en PanelReportsPage; guards app permiten prestadora en lista/nuevo/detalle; legacy público redirige preservando query/hash.

No permisos de gestión nuevos. Backend ms02 SecurityConfiguration.java:70-80 limita global/counts/close/solve a admin/gestora; ReportAccessGuard.java:35-45 controla propiedad. APIs y permisos de backend intactos.

Tests rojos nav y selector/legacy con rol prestadora; actualizar E2E guía para cubrir prestadora, turistas permanecen públicos. Verificar typecheck/lint/test/build y navegador si binario disponible. Auditor adversario e independiente por guards. Skills normativas ausentes en sesión, no se simula uso. Conservar cambios previos de registro sin mezclarlos.

## Evidencia

- Regresión antes del fix: 5 fallos/11 aprobados en navegación y ReportRoutes. Después: 8 archivos/56 focales aprobados.
- Typecheck, lint y build exit0; lint conserva 5 avisos anteriores. Suite general 541/542, fallo temporal previo de EventListPage.test.tsx (esqueleto de primera carga).
- E2E production preview con Chromium local: 20/20 aprobados en 34.4s. Guía y prestadora1280/1920 ES/EN listado→detalle→volver→nuevo→cancelar→fallo500→reintento→éxito, sidebar presente y0consultas globales; legacy lista/detalle/nuevo query/hash; móvil375 sin overflow; turista público y staff gestión. API simulada, sinbackend real.
- Inspeccionada captura /tmp/service_provider-reports-1280.png: sidebar visible con Reportes de seguridad activo.
- Auditor adversario PASA; independiente PASA CON RESERVAS (backend real, token vencido y respuestas403/429 no ejercitados). Skills normativas ausentes, sin simular uso. No probado reporte ajeno con JWT real, sesión vencida durante envío ni lector de pantalla.
