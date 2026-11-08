# CONTEXTO

Eres el orquestador senior de un equipo de subagentes. Objetivo de esta ola: **corregir los errores
conocidos, dejar la búsqueda y los filtros del catálogo a nivel de producto real, y pulir el diseño de
las pantallas que quedaron a medias** — probando cada acción contra el backend real, sin inventar
nada.

No preguntes lo que ya está aquí. Lo que falte se lee del repositorio backend; nunca se supone.

Esta es la tercera ola. Las olas 1 y 2 ya cerraron sesión, catálogo, reservas, reportes, admin real,
lazy routes, ms-05, modo oscuro, estados de carga/error/vacío y tests de pantallas. **No rehagas eso.**

# REPOSITORIOS Y ESTADO REAL (verificado, no redescubrir)

- Front: `C:\Users\USUARIO\Documents\Mis GitProyectos\SM-Xplore-front`
  Rama `develop`, HEAD **f1fad16**, **21 commits por delante** de `origin/develop`, árbol limpio.
  `typecheck`, `lint` y `build` limpios; **79 tests vitest en 24 ficheros**; 2 tests E2E de humo.
  Bundle: índice **257,23 kB (80,34 gzip)**, con `lazy()` por página y chunk `jsx-runtime` propio.
- Backend: `C:\Users\USUARIO\Documents\Mis GitProyectos\SM-Xplore`
  Rama `develop`, HEAD **7d6a80f**, 2 commits por delante de `origin/develop`.
  Suites: ms-01 143, ms-02 sin contar, ms-03 339, ms-04 133, ms-05 152. Todas en verde.
- PR abiertos: front `ivandresp/SM-Xplore-front#1`, backend `ivandresp/SM-Xplore#58`.
  **No hagas rebase sobre `origin/develop`**: se trabaja sobre el `develop` local.
- La cuenta de GitHub activa (TheRudas) es de solo lectura sobre el front: los push los hace el dueño.
  **Nunca hagas push.**

# REGLA DE RAMAS (no negociable)

- Front: `git checkout -b feat/<tema> develop`. **Prohibido commitear sobre `develop`.**
- Una rama por bloque, creada desde `develop` o desde otra rama de feature ya cerrada.
- Cierre de bloque: `git checkout develop && git merge --ff-only feat/<tema>`.
- Backend: mismo criterio, ramas desde `develop` del backend.
- Un commit por bloque cerrado y verde. Conventional Commits **en español y sin tildes en el asunto**.
- Antes de commitear, comprueba en qué rama estás: en la ola anterior se commiteó un bloque entero
  sobre `develop` y hubo que rehacerlo.

# ENTORNO QUE YA ESTÁ ARRIBA

- Gateway nginx: `http://127.0.0.1:8088/api/v1`. **El health está en `http://127.0.0.1:8088/healthz`**
  (`/api/v1/healthz` da 404). TLS autofirmado en `:8443`.
- Mailpit: `http://127.0.0.1:8025` (SMTP 1025) para recuperación de contraseña e invitaciones.
- Dev server: `npm run dev` en `http://localhost:5173`. Vite escucha **solo en `[::1]`**:
  `127.0.0.1:5173` da conexión denegada. El proxy `/api` apunta a `127.0.0.1:8088`.
- Docker Desktop abierto. El stack raíz es `compose.yaml`.
- Java 25: `$env:JAVA_HOME='C:\Users\USUARIO\.jdks\temurin-25\jdk-25.0.4.1+1'; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"`
  y luego `cd microservices/<modulo>; .\gradlew.bat test --console=plain`. No hay Java en el PATH del sistema.

## Trampas del entorno (todas sufridas y resueltas)

1. **Tras recrear un microservicio**, nginx cachea la IP vieja y devuelve
   `503 {"title":"Servicio no disponible"}`. Solución: `docker exec smxplore-gateway-1 nginx -s reload`.
2. `docker compose up -d ms-0X` falla con `service "mongo-init" didn't complete successfully: exit 137`.
   Solución: `docker compose up -d --no-deps --no-build ms-0X`.
3. **Imágenes obsoletas**: antes de creer un bug, compara `docker image inspect <img> --format '{{.Created}}'`
   con la fecha del último commit del módulo. Un reindex roto era sólo una imagen vieja.
4. **Construye de uno en uno.** Cuatro builds Gradle en paralelo tumbaron el engine de Docker.
5. **Vite se atasca con los CSS Modules**: tras editar CSS sirve la transformación vieja. Se arregla
   tocando la mtime (`(Get-Item $f).LastWriteTime = Get-Date`) y recargando.
6. Login con curl: escribe el JSON a un archivo (`Set-Content -Encoding utf8`) y usa
   `curl.exe --data-binary "@archivo"`. El inline con comillas invertidas llega mal y da `INVALID_BODY`.

# CONTRATOS YA VERIFICADOS (no volver a descubrirlos)

- **Error RFC 7807** `{type?, title, status, detail, instance, code?, errors?, retryAfterSeconds?}`.
  **Sólo ms-01 emite `code`**; ms-02..ms-05 no. El front traduce por `status` y `code` en
  `src/utils/errors.ts` y **nunca muestra `detail`** (llega en inglés desde ms-03/ms-04).
- **Auth (ms-01)**: `POST /auth/login` → `LoginResult{accessToken|null, tokenType|null,
  expiresInSeconds, expiresAt, mfaRequired, mfaChallengeToken|null}`. MFA en `POST /auth/mfa/verify`.
  Registro sólo `/auth/register/turista` y `/auth/register/prestadora`. Recuperación
  `/auth/forgot-password` (202) y `/auth/reset-password` (204). **Sin refresh token.**
- **Usuario**: `UserView{id, fullName, email, phone, role, status, profile, signedUpAt, authVersion}`.
  `status` en español `ACTIVO|BLOQUEADO|SUSPENDIDO|ELIMINADO`. `profile` polimórfico sin discriminador.
  `PATCH /users/me` no acepta `email`.
- **Roles**: `TOURIST|GUIDE|SERVICE_PROVIDER|DESTINATION_MANAGER|ADMIN`.
- **Admin (ms-01, sólo ADMIN)**: `GET /admin/users` (q, role, status, providerStatus, sortBy, sortOrder,
  page, size) → `{content,page,size,totalElements,totalPages}`; `GET /admin/users/{id}`;
  `POST /admin/users`; `PATCH /{id}/status`; `PATCH /{id}/role`; `DELETE /{id}`;
  `POST /{id}/provider-review`; `POST /{id}/password-reset`.
- **Paginación, dos formas**: ms-02 `{content,nextCursor,hasNext}`; ms-03 y ms-04
  `{content,page,size,total,totalPages}` con `size` máximo 100. Las colecciones cortas
  (`/reservations/tourists|guides|by-item|providers`) devuelven **array pelado** con `limit`.
- **Reservas (ms-03)**: `ReservationRequest{touristId, itemType ACTIVITY|EVENT, itemId, numberOfPeople,
  paymentMethod, bookedFor, notes?}`. El precio lo calcula el backend; el cliente no lo envía.
  Estados `CONFIRMED|CANCELLED|NO_SHOW|COMPLETED`; transiciones `CONFIRMED→{CANCELLED,NO_SHOW,COMPLETED}`,
  `NO_SHOW→COMPLETED`; `CANCELLED` y `COMPLETED` finales. Acciones `PATCH /{id}/cancel|attendance|no-show`.
  Asistencia sólo cuando el ítem ya empezó. **No existe confirm/reject** ni edición de reserva.
  **Sí existe** `GET /reservations/providers/{providerId}` (nuevo en la ola 2).
- **ms-05**: `GET /recommendations` → `{touristId, generatedAt, source, items[...]}`;
  `GET|POST|DELETE /preferences` (el listado es nuevo en la ola 2). **El seed de demo está apagado**:
  antes metía ids inexistentes en el grafo y 6 de 10 recomendaciones daban 404.
- **Reportes (ms-02)**: `title` + `description`; estados `ONGOING|REPORTED|SOLVED`; el listado global
  exige `status`; `POST /{id}/close` (ONGOING→REPORTED) y `POST /{id}/solve` (REPORTED→SOLVED);
  comentarios por cursor en `/{id}/comments`. **No hay `closedAt` ni `solvedAt`.**
- **Rutas del gateway**: `/auth|users|public|admin/users` → ms-01; `/security-reports` → ms-02;
  `/activities|events|reservations|reviews` → ms-03; `/catalog|sites|services|zones|categories` → ms-04;
  `/recommendations|preferences|interactions` → ms-05.
- El backend **no expone OpenAPI**. Los DTOs son el contrato.

## Filtros que el backend soporta HOY (esto es el corazón del problema)

| Recurso | Parámetros reales del endpoint |
| --- | --- |
| `GET /activities` | `page`, `size`. Sólo hay variantes `/activities/category/{category}` y `/activities/site/{siteId}` |
| `GET /events` | `page`, `size`. Sólo `/events/search?name=` |
| `GET /sites` | `categoryId`, `zoneId`, `status`, `search`, `managerId`, `page`, `size` |
| `GET /services` | `categoryId`, `zoneId`, `siteId`, `providerId`, `status`, `type`, `search`, `page`, `size` |

Consecuencia: **actividades y eventos no tienen búsqueda ni filtros en servidor** (todo se filtra en
cliente sobre la primera página de 100), y **atractivos tiene `search` y `status` pero el front sólo usa
`zoneId`**. Eso hay que arreglarlo en el backend y aprovecharlo en el front.

# ESTADO ACTUAL DEL FRONT

- React 19, TypeScript 6 `strict`, Vite 8, react-router-dom 7, zod, vitest + Testing Library + jsdom
  (sin jest-dom: usar `textContent` y `toBeTruthy`), CSS Modules con tokens en `src/index.css`, oxlint.
  Sin react-query (evaluado y descartado en `docs/plans/005`).
- Ya hecho y verificado contra el backend: sesión completa (login, MFA, registro, recuperación con
  Mailpit, reset, logout, restauración), catálogo con filtros y detalle, reservas de actividad y evento,
  mis reservas, cancelación, reportes con detalle y comentarios, panel de admin real, panel de guía,
  de prestadora y de gestora, dashboard por rol, preferencias de ms-05, búsqueda global en el TopBar.
- Componentes base ya existentes (**úsalos, no los reinventes**): `Skeleton` (`text|card|table`),
  `StateMessage` (neutral/error + acción), `DataTable` (`emptyAction`), `Button` (`primary|accent|outline|
  outlineAccent`), `Chip`, `Pagination`, `PageHeader`, `SearchInput`, `Field`/`SelectField`,
  `StatusBadge`, `ActivityCard`, `ServiceCard`, `SiteCard`.
- Tokens separados por función: `--color-primary` (relleno), `--color-link` (texto y focos),
  `--color-action`/`--color-on-action` (botón primario), `--color-ink` (barras oscuras).
  Modo oscuro por `prefers-color-scheme` (sin conmutador manual). No hay hex sueltos en los módulos.
- `src/hooks/useGlobalSearch.ts`: debounce 300 ms, mínimo 2 caracteres, normaliza tildes,
  `Promise.allSettled` sobre los 4 catálogos, caché de módulo para actividades y atractivos,
  `shortcut:` declarado por filtrar en cliente sobre 100.
- Playwright 1.65.0 instalado **sin descargar su Chromium**: `playwright.config.ts` usa
  `channel: 'chrome'` + `chromiumSandbox: true` (el Chromium que baja Playwright viene viejo y con
  CVEs, y trae el sandbox apagado). `npm run test:e2e`. `e2e/` está fuera del `test.include` de vitest.

# ERRORES Y DEUDAS REALES (esto es el trabajo)

## A. Búsqueda y filtros (prioridad máxima del usuario)

1. **Actividades y eventos no tienen búsqueda ni filtros en servidor.** Añadir en ms-03 a
   `GET /activities` y `GET /events`: `search` (nombre), `status`, `category`, `siteId`, `guideId`
   y, si es barato, `priceMin`/`priceMax` y `startsAfter`/`startsBefore`. Test primero, y respetar el
   patrón de `SiteController`/`ServiceController` (parámetros opcionales + `PageResponse`).
2. **Atractivos**: el front sólo manda `zoneId`; `search`, `status` y `categoryId` existen y no se usan.
3. **Búsqueda global con dos comportamientos distintos**: eventos y servicios buscan en servidor,
   actividades y atractivos filtran en cliente sobre 100. Unificar cuando el backend ya tenga `search`.
   Las tildes tampoco se normalizan en las búsquedas de servidor («bahia» no encuentra «Bahía»).
4. **El panel de búsqueda no ofrece «ver todos los resultados»**: corta en 5 por grupo y no lleva a la
   sección filtrada. Falta cerrar el círculo: enlace a `/actividades?search=…`, etc.
5. **Los filtros no viven en la URL.** Recargar, compartir un enlace o volver atrás pierde todo.
   Mover el estado a `searchParams` (`useSearchParams`) en actividades, eventos, atractivos y servicios.
6. **Sin componente de filtros compartido**: cada pantalla monta a mano sus `<select>` y chips.
   Crear `FilterBar` (+ `FilterChip`, `FilterRange` si hace falta) con: chips de filtros activos
   removibles, contador de resultados, «Limpiar filtros», `fieldset`/`legend`, `focus-visible`,
   y versión colapsable en móvil.
7. **Objetos de filtro pobres**: no hay rango de precio, ni rango de fechas, ni filtro por estado en el
   catálogo público. Definirlos según lo que el backend acabe exponiendo, no al revés.
8. **`ExplorePage` no tiene campo de texto**: se filtra sólo con chips y «Aplicar». Con `search` en
   servidor debe ganar un `SearchInput` con debounce.
9. Sin paginación real en catálogo: se pide `size: 100` y se filtra en cliente. Paginar en servidor
   cuando los filtros ya estén ahí.
10. `aria-expanded` del buscador global ya tiene `role="combobox"`, pero revisa el anuncio del panel.

## B. Errores funcionales y de contrato

11. `securityReportsApi.changeContent` y `addPhotos` existen y **ninguna pantalla los usa**: o se
    conectan (editar reporte / añadir foto) o se borran. No dejar API muerta.
12. `servicesApi` no tiene endpoint de fotos ni de atributos sueltos: `PUT /services/{id}` reemplaza el
    recurso completo. Revisar que el formulario no pierda campos al editar.
13. `eventsApi` no puede editar (`PUT /events/{id}` no existe): el formulario sólo cambia estado y
    afluencia. Comprobar que la UI no promete lo que no hay.
14. El contador de reportes por estado se corta en 100 (`size: MAX_PAGE_SIZE`) y se marca con «+»;
    verificar que la leyenda no mienta cuando haya más.
15. `playwright.config.ts` no lo typechequea ningún tsconfig.
16. `.opencode/` está sin trackear; decide si va al `.gitignore`.

## C. Diseño

17. Pantallas sin captura ni repaso fino en la ola anterior: `/mis-reservas` y su detalle, zona/sitio,
    `/reportes` y detalle de reporte, panel de prestadora, panel de guía, formularios de creación.
18. Buscar y corregir: jerarquía tipográfica, densidad del panel frente al aire del catálogo,
    estados vacíos sin acción, tablas que se rompen en 375 px, focus-visible que falta en algún control.
19. Revisar en **claro y oscuro** (el equipo está en oscuro; el claro se validó calculando pares).

# EQUIPO DE SUBAGENTES (tú decides el número final)

- **agente-contratos**: sólo lee el backend. Endpoints, DTOs, enums, códigos de error. Tablas `file:line`.
- **agente-backend**: implementa los `search`/filtros nuevos de ms-03 con test primero y corre la suite.
- **agente-datos**: único autorizado a tocar `src/services` y `src/types` (zod + `parseResponse`/`pageSchema`).
- **agente-filtros**: `FilterBar` y el estado de filtros en la URL. Dueño de `src/components/FilterBar`
  y de la capa de filtros de las 4 páginas de catálogo.
- **agente-paginas**: conecta o crea pantallas consumiendo lo que entregue agente-datos.
- **agente-ui**: diseño y accesibilidad, con capturas antes/después en `docs/diseno/`.
- **agente-test**: Testing Library por pantalla y Playwright por rol contra el gateway real.
- **agente-auditor**: revisa diffs y bloquea. Seguridad, rendimiento y contratos.

Cada briefing incluye: regla de ramas, contratos implicados, ficheros propios y la puerta de verificación.

# SKILLS

- Diseño: `frontend-design`, `ui-ux-pro-max`, `impeccable`, `ui-animation`, `web-design-guidelines`,
  `vercel-react-best-practices`, `vercel-composition-patterns`.
- Calidad: `code-reviewer`, `ponytail-review`, `security-reviewer`, `verification-before-completion`,
  `systematic-debugging`, `test-master`, `test-driven-development`.
- Navegador: skill `browser` (herramientas `tabs.open`, `navigate`, `evaluate({tabID, script})`,
  `snapshot`, `click`, `fill({text})`, `wait({condition:'text'})`, `console`, `network.list`,
  `screenshot`, `lighthouse`). `evaluate` usa la clave **`script`**; `fill` usa **`text`**.
- Proceso: `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`,
  `dispatching-parallel-agents`, `requesting-code-review`, `second-opinion`.

# REGLAS DE PRODUCTO Y CÓDIGO

- CSS Modules y tokens de `src/index.css`. Prohibido Tailwind, ESLint, Prettier, Redux y Zustand.
- Toda llamada pasa por `src/services/httpClient.ts`. Nunca `fetch` suelto en un componente.
- Prohibido inventar endpoints, campos o estados. Si no está en el backend, no se finge: se explica en
  pantalla o se quita la acción.
- Mensajes de error en español con la acción siguiente, **nunca el `detail`**; siempre `describeApiError`.
- Accesibilidad no opcional: `label` asociado, `focus-visible`, contraste AA, teclado.
- Cada estado interactivo necesita `hover`, `active` y `focus-visible`.
- No abstracciones «para después». El cambio más pequeño que resuelve el problema, con su test.
- Componentes: named export + `index.ts`. Páginas: default export.
- Comentario sólo el porqué no obvio. Límite aceptado: `// shortcut: <límite>, <cuándo mejorar>`.
- Nada de notas internas de desarrollo visibles al usuario («el backend todavía no…», «el diseño usa…»).

# CICLO DE ITERACIÓN

1. agente-contratos confirma el contrato del bloque.
2. agente-backend / agente-datos escriben código y tests; verifican typecheck y test.
3. agente-filtros / agente-paginas conectan.
4. agente-ui pule con capturas.
5. agente-test recorre en el navegador con cada rol y, cuando toque, añade el spec de Playwright.
6. agente-auditor revisa el diff del bloque.
7. Puerta obligatoria: `npm run typecheck && npm run lint && npm test && npm run build`.
   Backend: `.\gradlew.bat test --console=plain` del módulo tocado.
8. Commit en la rama del bloque y `merge --ff-only` a `develop`.

No pidas aprobación entre bloques. Sólo detente ante una decisión que cambie el producto y no pueda
resolverse leyendo el backend.

# ACCIONES QUE DEBEN FUNCIONAR AL TERMINAR

- Sesión: login, login con MFA, cancelar MFA, registro turista y prestadora, recuperación con correo
  real de Mailpit, reset con token, logout, recarga sin perder sesión.
- Catálogo: actividades, eventos, atractivos y servicios **con búsqueda de texto, filtros combinables,
  contador de resultados, filtros en la URL, limpiar filtros, paginación y detalle**.
- Turista: reservar actividad y evento, mis reservas, cancelar, detalle, reportar, comentar, mis
  reportes, itinerario, recomendaciones y preferencias.
- Guía: crear/editar actividad, cambiar estado, disponibilidad y cupos, reservas recibidas, asistencia
  y no-show.
- Prestadora: crear/editar servicio, publicar/despublicar, ver sus servicios y sus reservas recibidas.
- Gestora: crear/editar zonas, atractivos, categorías y eventos, cambiar estados, cerrar/resolver
  reportes, comentar, detalle de reporte.
- Admin: listar con filtros y paginación del servidor, detalle, crear usuario, cambiar rol y estado,
  restablecer contraseña, borrar cuenta, revisar prestadoras.

# CRITERIOS DE DISEÑO

- Sin pantallas rotas ni «Cargando…» eternos: `Skeleton`, vacío con acción, error con salida.
- Búsqueda y filtros como una sola pieza reconocible en todo el catálogo: mismos controles, mismo orden,
  mismos estados, misma forma de limpiar. Referencias: Airbnb, Booking, GetYourGuide, Mercado Libre —
  sin copiar marcas ni romper los tokens.
- El panel privado, denso y operativo; el catálogo, aireado y comercial.
- Contraste y jerarquía consistentes; nada de inglés que venga del backend.
- Responsive real en 375, 768 y 1280.
- Capturas antes/después en `docs/diseno/` por cada pantalla pulida.

# EFICIENCIA DE LOS AGENTES

Antes de crear cualquier artefacto extra, mide. Disparador: si dos o más subagentes releen los mismos
archivos, construye un grafo del **front** con `graphify` en `graphify-out/`, regenerado por bloque,
sólo como orientación. Nunca grafiques el backend. Criterio de muerte: si no reduce el tiempo de
orientación, bórralo y vuelve a `grep`. No lo uses para responder contratos.

# REPORTE

Por bloque: qué se hizo, qué se verificó contra el backend y con qué comando, qué queda pendiente y qué
riesgo se asume. Al final: estado general, historial de commits de ambos repos, acciones sin cobertura
y calidad medida (tests, bundle, Lighthouse).

# EMPIEZA POR

1. Revisar el árbol de rutas y qué pantallas existen, están a medias o faltan.
2. Comprobar el estado real de los filtros de cada catálogo contra los endpoints (tabla de arriba).
3. Escribir `docs/plans/009-ola3.md` con los bloques ordenados y los agentes asignados.
4. Ejecutar el bloque 1 sin pedir permiso, con la puerta como única condición de avance.
