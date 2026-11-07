# Plan 004 — Recorrido E2E con cada rol contra el gateway real

## Pasos

1. Sembrar cuentas de guía y gestora desde `/admin/users` y fijar su contraseña con la
   invitación de Mailpit.
2. Recorrer el flujo de guía: crear actividad, publicar, editar precio, pausar,
   disponibilidad, reservas recibidas y asistencia.
3. Recorrer el flujo de prestadora: crear servicio, gestionar, publicar y despublicar.
4. Recorrer el flujo de gestora: crear zona, crear y editar sitio con categoría y
   capacidad, publicar sitio, crear evento y posponerlo, cerrar y resolver reportes y
   comentar.
5. Recorrer el flujo de admin: listar, filtrar, crear usuario, cambiar estado, cambiar
   rol, enviar enlace de recuperación y eliminar.
6. Recorrer el flujo de turista: reservar, cancelar, itinerario y reportar.
7. Corregir cada hallazgo y volver a pasar la puerta.

## Hallazgos y correcciones

- `utils/errors.ts` mostraba el `detail` crudo del backend (inglés) en 409 y en el resto
  de estados. Ahora traduce por `code` estable y cae a mensajes en español.
- El detalle de reserva recibida ofrecía asistencia antes de la fecha reservada: el
  backend respondía 409 en inglés. Se deshabilita con una nota que dice cuándo estará.
- `ReservationStatus` no incluía `COMPLETED`, que es el estado que deja la asistencia:
  la acción funcionaba pero el parseo fallaba y la UI mostraba error. Se añadió el estado,
  su etiqueta («Asistió») y el filtro.
- `POST /sites` y `PATCH /sites/{id}` no coincidían con el backend: exige `categoryId` y
  `maxCapacity`, y la edición es `PUT`, no `PATCH`. Además el wire usa `photosUrls`.
  Se corrigió el servicio y el formulario de zona (categoría y capacidad, publicar y
  despublicar sitios).
- `ServiceFormPage` avisaba de «categoría, zona y atractivo» aunque solo faltara uno.
- La gestora no tenía forma de abrir el detalle de un reporte para comentar: se añadió
  `/app/reportes/:reportId` con el mismo componente y enlace desde el listado.
- Copias desactualizadas: la reserva decía que «la prestadora confirma o rechaza» y el
  reporte decía que «resolver no existe». Ambas afirmaciones eran falsas.

## Criterio de terminado

`npm run typecheck && npm run lint && npm test && npm run build` en verde y cada acción
probada contra `http://127.0.0.1:8088/api/v1` con una sesión real.

## Acciones sin cobertura

- Confirmar asistencia con una reserva futura: el backend exige que el ítem haya
  empezado, así que solo se probó el camino con la fecha ya pasada (exitoso) y el
  bloqueo previo (la nota).
- Aprobar prestadoras como gestora: el endpoint real es `hasRole('ADMIN')`; la pantalla
  vive en el panel de administración.
