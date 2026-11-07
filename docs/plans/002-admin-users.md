# Plan 002 — Administración de usuarios con el contrato real

Rama: `feat/admin-users` (desde `develop`).
Contrato: `ms-01-users-and-anomalies`, `AdminUserController` (`/api/v1/admin/users`),
`UserController`, `PublicUserController`. DTOs leídos del backend, no supuestos.

## Pasos

1. **Contratos**: reescribir `types/user.ts` con `UserSummaryView` (lista), `UserView` (detalle,
   reutiliza `AuthUser`), `ProviderRegistrationStatus` (`PENDIENTE|APROBADO|RECHAZADO`),
   `UserStatus` = `ACTIVO|BLOQUEADO|SUSPENDIDO|ELIMINADO`, requests de creación, cambio de estado,
   cambio de rol y revisión de prestadora. El perfil público usa
   `PublicProfileView{id, fullName, role, profile}`.
2. **Servicio**: `usersApi` conserva `me/updateMe/logout` y sustituye lo inventado por
   `list` (paginado con `totalElements`), `getById`, `create`, `changeStatus`, `changeRole`,
   `remove`, `reviewProvider`, `requestPasswordReset` (sin cuerpo, 202) y `getPublicProfile`
   (`GET /public/users/{id}`, solo guías y prestadoras). Validación con zod y `parseResponse`.
3. **Etiquetas**: borrar los mapas en inglés (`STATUS_*`, `REGISTRATION_*`) y usar
   `ACCOUNT_STATUS_*` y `PROVIDER_STATUS_*` nuevos.
4. **Listado**: `UsersPage` con filtros y paginación en servidor (`q`, `role`, `status`,
   `providerStatus`, `sortBy`, `size=10`), sin recortar en cliente.
5. **Detalle**: `UserDetailPage` con acciones reales: estado (con motivo), rol (con los campos
   obligatorios del rol destino), restablecer contraseña por correo, eliminar cuenta con aviso
   irreversible y enlace a la revisión de prestadora.
6. **Prestadoras**: `ProviderApprovalPage` sobre `/provider-review` con decisión y motivo.
7. **Crear usuario**: `CreateUserPage` para guía, gestora y administrador
   (`POST /admin/users`, invitación por correo).
8. **Perfiles públicos**: `GuideProfilePage` y `ProviderProfilePage` con `PublicProfileView`
   (sin correo ni teléfono: el endpoint público no los expone).
9. **Reserva recibida**: quitar la consulta inventada del turista; mostrar solo `touristId`.
10. **Tests**: `usersApi` (lista paginada, requests), `UsersPage` (filtros/paginación) y
    `UserDetailPage` (acciones contra el contrato).
11. **Verificación**: `npm run typecheck && npm run lint && npm test && npm run build`.

## Criterio de terminado

- Ninguna llamada a `/users/{id}`, `/users/{id}/approve-*`, `/users/guides/{id}` ni
  `/users/providers/{id}`: todas las rutas usadas existen en ms-01.
- `UserStatus` y `RegistrationStatus` ya no tienen valores en inglés en el front.
- La lista de usuarios pagina y filtra en el servidor contra `totalElements`.
- Restablecer contraseña no envía una contraseña: dispara el correo de ms-01 (visible en Mailpit).
- El perfil público no promete correo ni teléfono que el backend no entrega.
