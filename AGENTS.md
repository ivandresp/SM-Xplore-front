# AGENTS.md — SM-Xplore Frontend

SPA del proyecto **SM-Xplore** (plataforma de gestión turística para Santa Marta).
Consume el backend de microservicios Spring WebFlux de
`C:\Users\USUARIO\Documents\Mis GitProyectos\SM-Xplore` (repo independiente).
Alias de referencia de OpenCode: `backend` (declarado en `opencode.json`).

Rama de trabajo: **`develop`**. `main` solo tiene la plantilla inicial.

## Comandos

```bash
npm run dev        # Vite en http://localhost:5173 (proxy /api -> gateway)
npm run typecheck  # tsc -b
npm run lint       # oxlint
npm test           # vitest run
npm run test:watch # vitest
npm run build      # typecheck + build de producción
npm run preview    # sirve dist/
npm run figma:sync # sincroniza tokens/wireframes
```

## Stack

- React 19 + TypeScript 6 (`strict`, `verbatimModuleSyntax`)
- Vite 8, alias `@/` -> `src/`
- `react-router-dom` 7 (rutas en `src/routes/router.tsx`)
- `zod` para validar respuestas del API
- `vitest` + `@testing-library/react` + `jsdom` (sin `jest-dom`; usar `textContent` y `toBeTruthy`)
- CSS Modules + design tokens en `src/index.css`
- Oxlint (no ESLint)

No hay `react-query` todavía: la sesión es estado de cliente en `AuthProvider`.

## Estructura

```text
src/
├─ components/<Nombre>/   # <Nombre>.tsx + .module.css + index.ts (API pública)
├─ layouts/               # PublicLayout, AppLayout
├─ pages/<dominio>/       # una página por vista, default export
├─ hooks/                 # hooks reutilizables (use*)
├─ services/              # httpClient + un módulo por dominio (+ *.test.ts)
├─ context/               # AuthProvider y su contexto
├─ routes/                # router y guards
├─ config/                # navegación y etiquetas de rol/estado
├─ types/                 # contratos compartidos
└─ utils/                 # funciones puras
```

Reglas:

- Componentes: **named export** + `index.ts`. Páginas: `default export`.
- Imports: externos -> `@/` -> relativos -> hojas de estilo.
- No crear `utils/` genéricos: añadir a `format.ts`, `errors.ts` o al dominio.

## Contrato de API

Gateway nginx único: `http://127.0.0.1:8088/api/v1` (TLS autofirmado en `:8443`).
En dev, el proxy de Vite evita CORS. Nunca llamar a los puertos de cada servicio.

| Ruta | Servicio |
| --- | --- |
| `/api/v1/auth/**`, `/api/v1/users/**`, `/api/v1/public/**`, `/api/v1/admin/users/**` | ms-01 |
| `/api/v1/security-reports/**` | ms-02 |
| `/api/v1/activities/**`, `/api/v1/events/**`, `/api/v1/reservations/**`, `/api/v1/reviews/**` | ms-03 |
| `/api/v1/catalog/**`, `/api/v1/sites/**`, `/api/v1/services/**` | ms-04 |
| `/api/v1/recommendations/**` | ms-05 |

Reglas:

- Toda llamada pasa por `src/services/httpClient.ts`. Nunca `fetch` suelto en componentes.
- Un módulo por dominio; el path que recibe `httpClient` es relativo a `VITE_API_URL`.
- Los servicios validan la respuesta con `zod` y `parseResponse` (`services/validate.ts`)
  antes de devolverla.
- Variables de entorno: solo `VITE_*`, tipadas en `src/types/env.d.ts`.

## Investigar el backend (obligatorio antes de tipar o llamar algo)

**Regla:** si un dato no está en este archivo, se lee del repositorio `backend`,
nunca se supone. Un contrato inventado cuesta más que una búsqueda.

| Qué busco | Dónde |
| --- | --- |
| Endpoints | `microservices/ms-0N-*/src/main/java/**/infrastructure/adapter/in/**/*Controller.java` |
| DTOs request/response | `**/dto/**` y `**/application/dto/**` |
| Enums de dominio | `**/domain/model/**` |
| Códigos de error | `ApiExceptionHandler.java` de cada servicio |
| Contratos de eventos Kafka | `contracts/events/*.json` |
| Rutas del gateway | `deploy/gateway/README.md` |

Los **DTOs son el contrato real**; los JSON Schema de `contracts/` describen eventos
Kafka internos, no respuestas HTTP. El backend no expone OpenAPI.

## Contratos verificados (2026-11-07, ms-01)

- **Error: RFC 7807 `ProblemDetail`** `{type, title, status, detail, instance, code, errors?}`.
  `code` es el identificador estable (`INVALID_CREDENTIALS`, `EMAIL_ALREADY_EXISTS`,
  `TOO_MANY_ATTEMPTS` con `retryAfterSeconds`, `ACCOUNT_NOT_ACTIVE`, `INVALID_MFA_CODE`,
  `INVALID_MFA_CHALLENGE`, `MFA_ENROLLMENT_REQUIRED`, `INVALID_RESET_TOKEN`, ...).
  `errors` solo aparece en validaciones de campos.
- **Login es una unión.** `LoginResult{accessToken, tokenType, expiresInSeconds, expiresAt,
  mfaRequired, mfaChallengeToken}`. Con MFA: `accessToken` es `null` y el segundo paso va por
  `POST /api/v1/auth/mfa/verify`. **No hay refresh token**: al vencer se vuelve a `/auth/login`.
- **Usuario:** `UserView{id, fullName, email, phone, role, status, profile, signedUpAt, authVersion}`.
  `status` llega en español: `ACTIVO | BLOQUEADO | SUSPENDIDO | ELIMINADO`.
  `profile` es polimórfico y **sin discriminador**: el tipo del record lo dice `role`.
- **Roles:** `TOURIST | GUIDE | SERVICE_PROVIDER | DESTINATION_MANAGER | ADMIN`.
  Solo hay registro público de turista (`/auth/register/turista`) y prestadora
  (`/auth/register/prestadora`); guías y gestoras los crea un admin.
- **`PATCH /api/v1/users/me` no acepta `email`** (solo nombre, teléfono y campos de perfil).
- **Paginación: dos formas, no una.** ms-02 devuelve `{content, nextCursor, hasNext}`
  (`CursorPage<T>` en `types/securityReport.ts`); ms-03 y ms-04 devuelven
  `{content, page, size, total, totalPages}` (`PageResponse<T>` en `types/common.ts`,
  validado con `pageSchema()`). **`size` máximo 100** (`MAX_PAGE_SIZE`); fuera de 1..100
  o `page < 0` -> 400. Las colecciones cortas (`/reservations/tourists|guides|by-item`)
  sí devuelven **array pelado** con `limit` (no `size`), acotado por el backend.
- **`ReservationStatus` no es único.** ms-03: `CONFIRMED | CANCELLED | NO_SHOW`;
  ms-04: `PENDING | CONFIRMED | CANCELLED`.
- **Una reserva guarda un solo ítem.** `ReservationRequest` lleva `itemType` + `itemId`;
  no existe `/reservation-items`. El precio lo calcula el backend desde el catálogo
  (`total = unitPrice × numberOfPeople`): el cliente nunca lo envía.
  Solo se reservan `ACTIVITY` y `EVENT`; los servicios no son reservables.
- **No hay listado de reservas por prestadora** (solo por guía, por turista y por ítem),
  ni acciones `confirm`/`reject`: la reserva nace `CONFIRMED` y solo se puede cancelar,
  marcar asistencia o marcar no-show.
- **Reportes de seguridad (ms-02)** usan `title` + `description` (no `text`) y el listado
  global exige `status`.
- **El backend arma enlaces al front**: `forgot-password` envía
  `http://localhost:5173/reset-password?token=...`. Esa ruta debe existir.

## Sesión

- `AuthProvider` guarda el JWT en `sessionStorage` (`services/authToken.ts`) con su vencimiento
  y lo revalida con `GET /users/me` al arrancar (`isRestoring`).
- `useAuth()` expone `user: AuthUser | null`, `isRestoring`, `mfaChallenge`, `login`,
  `completeMfa`, `cancelMfa`, `registerTourist`, `registerProvider`, `logout`, `updateSessionUser`.
- `AuthUser` (`types/auth.ts`) es el contrato real. `UserResponse` (`types/user.ts`) pertenece
  al panel de administración y **sigue con los contratos antiguos**: es deuda de fase 2.
- Un 401 con token cierra la sesión (`httpClient` -> `onUnauthorized`); sin token, no.

## Estilos

- Tokens en `:root` de `src/index.css`; no hardcodear hex.
- CSS Modules por componente. No añadir Tailwind ni librerías de UI.
- Dark mode por `prefers-color-scheme` con los mismos tokens.
- Cada estado interactivo necesita `:hover`, `:active` y `:focus-visible`.
- Accesibilidad no es opcional: labels asociados (`Field`/`SelectField` lo hacen),
  `aria-*` cuando haga falta, contraste AA, teclado.

## Flujo de trabajo

1. **Plan antes de código.** `brainstorming` -> `writing-plans` (`docs/plans/NNN-*.md`) ->
   diseño en `docs/superpowers/specs/` -> revisión -> implementación.
2. **Test antes del fix o feature** cuando la lógica no sea trivial.
3. **Verificar antes de declarar terminado**:
   `npm run typecheck && npm run lint && npm test && npm run build`.
4. Revisión final con `verification-before-completion` y `ponytail-review`.

## Deuda conocida

- `usersApi` y las pantallas de admin usan endpoints que no existen (`/users/{id}`,
  `/users/{id}/approve-*`, `/users/guides/{id}`): deben reescribirse contra
  `/api/v1/admin/users/**`. Es el único módulo con contratos inventados.
- Verificados contra el backend: `authApi`, `activitiesApi`, `zonesApi`, `sitesApi`,
  `servicesApi`, `eventsApi`, `categoriesApi`, `reservationsApi`, `securityReportsApi`.
- La prestadora no puede listar reservas recibidas (el backend no expone el endpoint) y
  los servicios no son reservables: `ReceivedReservationsPage` lo dice en pantalla.
- `servicesApi` no tiene endpoint de fotos, atributos ni precio suelto: `PUT /services/{id}`
  reemplaza el recurso completo. `eventsApi` no puede editar (`PUT /events/{id}` no existe).
- Todo ms-04 (`/categories`, `/zones`, `/sites`, `/services`) era de lectura cerrada; desde la rama
  `feat/ms-04-public-catalog-reads` del backend, `GET`/`HEAD` es `permitAll` (igual que ms-03) y solo
  la escritura exige rol. `GET /sites?managerId=…` anónimo devuelve 403.
- `Site` y `Zone` (`types/zone.ts`) son modelos de vista, no el wire: los servicios mapean
  `SiteResponse`/`ZoneResponse` (`photosUrls` -> `photoUrls`, `siteId` -> `id`).
- `UserResponse`, `UserStatus` y `RegistrationStatus` siguen con los valores antiguos.
- El catálogo filtra en cliente sobre un máximo de 100 registros: paginar en servidor
  cuando haya volumen.
- El bundle pasa de 500 kB: falta `lazy()` por página.

## No hacer

- No añadir ESLint, Prettier ni Tailwind (hay oxlint + CSS Modules).
- No añadir Redux/Zustand: primero `react-query` + Context.
- No llamar a los puertos directos de los microservicios ni hardcodear hosts.
- No guardar el token en `localStorage`.
- No inventar endpoints ni campos: se leen del repositorio `backend`.
- No crear abstracciones «para después».
