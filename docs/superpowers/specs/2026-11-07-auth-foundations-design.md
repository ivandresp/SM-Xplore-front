# Fundaciones de autenticación — diseño

Fecha: 2026-11-07
Rama: `develop`

## Intención

La app tenía la autenticación maquetada: contratos inventados, `localStorage`,
sin MFA, sin recuperación de contraseña y con un guard que expulsaba al usuario
en cada recarga. Este cambio la conecta al backend real (ms-01) y deja la sesión
lista para que las vistas por dominio trabajen sobre contratos verificados.

## Goals

- `httpClient` interpreta el `ProblemDetail` (RFC 7807) del backend: `status`, `code`, `detail`, `errors`.
- `authApi` con las rutas reales: login, MFA, registro de turista y prestadora, forgot/reset password.
- Sesión en `sessionStorage` con vencimiento local; sin refresh token (el backend no lo ofrece).
- `AuthProvider` hidrata la sesión con `GET /users/me` y expone el challenge de MFA.
- `RequireAuth` no redirige mientras la sesión guardada se está validando.
- `LoginPage` con el segundo paso de MFA; `/reset-password` operativa (el backend envía ese enlace).
- `RegisterPage` con los dos registros que existen, sin selector de cinco roles.
- Tests de `httpClient`, `authApi`, `LoginPage` y `ResetPasswordPage`.

## Non-goals

- No se instala `react-query`: la sesión es estado de cliente. El primer slice de datos lo introduce.
- No se cablea el resto de `/users/**` ni `/admin/users/**`: esos endpoints del front son ficticios (fase 2).
- No se añade refresh token, ni cookies `httpOnly`: exigirían cambios en ms-01.
- No se toca el diseño visual: se reutilizan `AuthShell`, `Field` y los tokens actuales.

## Constraints

- Gateway único en `http://127.0.0.1:8088/api/v1`; en dev, proxy de Vite desde el mismo origen.
- Los roles del backend portan `TOURIST`, `ADMIN`, ...; el estado de cuenta llega en español
  (`ACTIVO | BLOQUEADO | SUSPENDIDO | ELIMINADO`).
- El perfil (`UserView.profile`) no lleva discriminador: se deduce de `role`.
- `PATCH /users/me` no acepta `email`.

## Approaches considerados

1. **Fundaciones con sesión** (elegido). Arreglar contratos + sesión real y dejar el resto para fases
   posteriores. Coste: no entrega pantallas nuevas de producto, pero todo lo que venga después se apoya
   en tipos y errores correctos.
2. **Vertical slice de catálogo.** Entrega valor visible antes, pero sobre un `httpClient` que descarta
   los errores del backend y un guard que rompe la sesión.
3. **Esqueleto de rutas.** Solo estructura; no valida ningún contrato.

Se eligió 1 porque los otros dos habrían construido sobre contratos que el backend contradice.

## Decisiones

- **Token en `sessionStorage`**, guardando `{token, expiresAt}`. Mismo riesgo de XSS que `localStorage`,
  pero la sesión no sobrevive al cierre de la pestaña y el vencimiento permite cortar antes de la llamada.
- **Reintento anónimo ante 401** solo si la petición llevaba token: así la hidratación detecta tokens
  revocados y los endpoints públicos siguen respondiendo.
- **`AuthUser`** (forma real de `UserView`, unión discriminada por rol) convive con el `UserResponse`
  heredado del panel de administración. Unificarlos exige corregir las pantallas de admin, cuyos
  endpoints aún no existen; queda como deuda de fase 2.
- **Validación con zod** en el borde de `services/`: un cambio de contrato se ve al instante y no
  como una etiqueta vacía en pantalla.
- **MFA en el mismo formulario** con un segundo paso, no una ruta aparte: el challenge vive en memoria
  del provider y no debe sobrevivir a una recarga.

## Deuda conocida

- `UserResponse`, `usersApi` y las pantallas de admin siguen usando los contratos antiguos.
- `UserStatus` en inglés sigue existiendo para ese mismo conjunto de tipos.
- El bundle supera los 500 kB (aviso de Vite); se resuelve con `lazy()` por página en la fase de rendimiento.
