# Plan 001 — Fundaciones de autenticación

Diseño: `docs/superpowers/specs/2026-11-07-auth-foundations-design.md`

## Pasos

1. **Tooling de pruebas**: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`;
   bloque `test` en `vite.config.ts`; scripts `test` y `test:watch`; `vitest/globals` en `tsconfig.app.json`.
2. **Contratos**: `ProblemDetail` en `types/common.ts`; `types/auth.ts` con `LoginResult`, `AuthUser`,
   requests de registro y `UpdateMyProfileRequest`.
3. **Cliente HTTP**: mensaje desde `detail`/`title`, `code` y `fieldErrors` en `ApiError`, reintento
   anónimo solo si había token.
4. **Sesión**: `authToken.ts` con `sessionStorage` y vencimiento; `authApi.ts` con rutas reales y zod;
   `usersApi.me/updateMe/logout`.
5. **Provider**: hidratación con `/users/me`, `isRestoring`, `mfaChallenge`, `completeMfa`, `cancelMfa`.
6. **Guards**: `RequireAuth` espera la hidratación.
7. **Pantallas**: `LoginPage` con MFA; `ResetPasswordPage` en `/reset-password`; `RegisterPage`
   con turista/prestadora; `MyProfilePage` con `PATCH /users/me` y correo no editable.
8. **Tests**: `httpClient` (ProblemDetail, 204, 401 con y sin token), `authApi` (unión MFA, contrato roto),
   `LoginPage` (flujo MFA completo), `ResetPasswordPage` (token, validación, enlace inválido).
9. **Verificación**: `npm run typecheck && npm run lint && npm test && npm run build`.

## Criterio de terminado

- Ningún `fetch` fuera de `httpClient`.
- Las cuatro rutas de auth usadas por la UI existen en `AuthController`/`MfaController`.
- Un 401 con token cierra la sesión; un 401 sin token no.
- `/reset-password?token=...` funciona con el enlace que genera ms-01.
