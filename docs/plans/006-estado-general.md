# Estado general — 2026-11-07

## Bloques cerrados en esta sesión

| Rama | Commit | Contenido |
| --- | --- | --- |
| `feat/admin-users` | `20ca5c1` | `usersApi` y pantallas de administración contra `/admin/users/**`, `UserStatus`/`ProviderRegistrationStatus` en español, perfiles públicos reales (`/public/users/{id}`). |
| `fix/gateway-admin-users` (backend) | `7dfdabe` | El gateway exponía `/admin/users` con barra final y devolvía 301/500; sin barra responde bien. |
| `feat/lazy-routes` | `860918f` | `lazy()` por página, `Suspense` en los layouts; desaparece el aviso de bundle. |
| `feat/recomendaciones` | `531ccdf` | ms-05: lista de recomendaciones, registro de vistas (`/interactions/view/...`) en las cuatro fichas, ítem «Para ti». |
| `feat/e2e-roles` | `1fb7744` | Recorrido real con los cinco roles y siete correcciones de contrato o de mensaje. |

`develop` del front queda en `1fb7744`. Backend `develop` en `7dfdabe`.

## Verificado contra el gateway real (`http://127.0.0.1:8088/api/v1`)

- Turista: login, registro, reservar actividad, cancelar, mis reservas, itinerario,
  reportar, comentar, recomendaciones y `POST /interactions/view` (204).
- Guía: crear y publicar actividad, editar precio, pausar, disponibilidad, reservas
  recibidas, marcar asistencia (deja la reserva en `COMPLETED`).
- Prestadora: crear servicio, gestionar precio y fotos, publicar y despublicar.
- Gestora: crear zona, crear/editar/publicar sitios, crear evento y posponerlo, cerrar y
  resolver reportes, comentar.
- Admin: listar y filtrar usuarios, detalle, crear guía con invitación, cambiar estado y
  rol, enviar enlace de recuperación, eliminar (anonimiza).
- Correos reales en Mailpit: invitación y recuperación.

## Acciones sin cobertura

- Confirmar asistencia con una reserva futura: el backend exige que el ítem ya haya
  empezado; se probó el bloqueo previo y el éxito con la fecha pasada.
- Aprobar o rechazar prestadoras desde el panel de gestora: el endpoint real exige rol
  `ADMIN`; la pantalla está en el panel de administración.
- Modificar reserva: el backend no expone cambio de ítems ni de fechas.
- Editar evento: `PUT /events/{id}` no existe; solo estado y afluencia.
- Reindexado de ACTIVITIES/EVENTS en ms-05: devuelve 400 «Type mismatch» en el backend
  (bug abierto, no bloquea el front porque las tarjetas enlazan a la sección).

## Deuda restante

1. Pulido visual con capturas antes/después (el recorrido E2E validó función, no estética).
2. Pruebas de integración de las pantallas restantes (hoy hay 46 tests: servicios, login,
   reset, usuarios y detalle de usuario).
3. Datos de humo en la base local: actividades «Snorkel E2E», «Snorkel Asistencia E2E» y
   «Snorkel Pasado E2E», servicio «Hotel E2E», zona y sitio E2E, evento E2E, usuarios
   `guia.e2e@`, `gestora.e2e@` y `prestadora.smoke@`. La actividad del 1 de noviembre
   quedó publicada y no se pudo pasar a inactiva (ms-03 devuelve 400 al cambiar estado de
   esa actividad concreta).
4. `docs/plans/005-react-query-evaluacion.md`: no se migra, con el motivo y cuándo revisarlo.

## Riesgos asumidos

- El backend tarda entre 20 y 60 s en la primera escritura de catálogo (ms-04) y en el
  primer listado de reportes; la UI muestra «Guardando…»/«Cargando…» sin timeout propio.
- El índice de ms-05 no está sincronizado con ms-03/ms-04: sus `itemId` pueden no existir.
