# Brief 010 — Cerrar los riesgos abiertos de la ola 3

Fecha: 2026-11-08. Este documento es el encargo completo para el subagente de hardening.
Léelo entero antes de tocar código. No preguntes lo que ya está aquí: lo que falte se lee de los
repositorios.

## Repositorios y estado de partida

- Front: `C:\Users\USUARIO\Documents\Mis GitProyectos\SM-Xplore-front`
  `develop` = `228e52f` (= `origin/develop`), árbol limpio. `origin` = `ivandresp/SM-Xplore-front`.
- Backend: `C:\Users\USUARIO\Documents\Mis GitProyectos\SM-Xplore`
  `develop` = `e2c9076`; rama actual `feat/ms-03-catalog-filters` = `7ad94d3`, publicada, con el
  **PR #60 abierto** (`https://github.com/ivandresp/SM-Xplore/pull/60`). `origin` =
  `ivandresp/SM-Xplore`. La cuenta `gh` es **TheRudas** y tiene escritura.
- `develop` del backend está **protegido**: rama → push → PR → revisión humana. No se puede
  autoaprobar. `develop` del front **no** está protegido.
- No tocar las ramas backend `docs`, `microservicios`, `Wireframe-Mockups` ni el PR #60 salvo lo
  indicado en el bloque 5.

## Entorno

- Docker Desktop y el stack `compose.yaml` están arriba. Gateway:
  `http://127.0.0.1:8088/api/v1`; health en `http://127.0.0.1:8088/healthz`.
- Mailpit: `http://127.0.0.1:8025` (SMTP 1025).
- Dev server del front: `http://localhost:5173` (Vite escucha en `[::1]`; `127.0.0.1:5173` no).
- Credenciales de admin: `admin@smxplore.local` / `ChangeMe123!`.
- Java 25:
  `$env:JAVA_HOME='C:\Users\USUARIO\.jdks\temurin-25\jdk-25.0.4.1+1'; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"`.
  No hay Java en el PATH del sistema.
- Tests backend por módulo: `cd microservices/<modulo>; .\gradlew.bat test --console=plain`.
  Los tests con Testcontainers necesitan Docker.
- Front: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.
- **Trampas ya sufridas**: tras recrear un microservicio, `docker exec smxplore-gateway-1 nginx -s reload`
  (si no, 503 por IP vieja); `docker compose up -d --no-deps --no-build ms-0X` cuando el
  `mongo-init` falle; comparar la fecha de la imagen antes de creer un bug; construir de uno en uno;
  Vite sirve CSS Modules viejos tras editarlos (tocar la mtime y recargar); para curl de login,
  escribir el JSON a un archivo y usar `--data-binary "@archivo"`.

## Reglas de trabajo (no negociables)

1. **Front**: `git checkout -b <rama> develop`; prohibido commitear sobre `develop`. Cierre:
   `git checkout develop && git merge --ff-only <rama> && git push origin develop`. Borra la rama
   local si quedó mergeada.
2. **Backend**: rama desde `develop`; push; PR a `develop`. Nunca push directo a `develop`.
3. Un commit por bloque, Conventional Commits **en español y sin tildes en el asunto**.
4. Antes de commitear, comprobar la rama actual.
5. No inventar endpoints, campos ni estados: se leen los DTOs y controladores del backend.
6. No añadir dependencias, Tailwind, ESLint, Prettier, Redux ni Zustand.
7. Toda llamada del front pasa por `src/services/httpClient.ts`; respuestas validadas con zod.
8. Mensajes de error en español con la acción siguiente; nunca mostrar el `detail` del backend.
9. Nada de notas internas de desarrollo visibles al usuario.
10. No aprobar PRs, no mergear ramas protegidas, no reescribir historia (`--force` prohibido).

## Puerta de cada bloque

- Front: `npm run typecheck && npm run lint && npm test && npm run build` en verde.
  Cuando el bloque toque flujos, además `npm run test:e2e`.
- Backend: suite completa del módulo tocado en verde.

## Bloques

### Bloque 1 — ms-04: filtros de precio en servicios (backend)

Problema: `GET /api/v1/services` no acepta `priceMin`/`priceMax`; por eso el catálogo de servicios
perdió el filtro de precio en la ola 3.

Pasos:
1. Leer `service/ServiceFilter.java`, `ServiceController#findAll`, `MongoServiceRepositoryAdapter`
   (método `query`) y el tipo del campo `price` en el documento/Mapper antes de escribir criterios.
2. Añadir `BigDecimal priceMin, priceMax` a `ServiceFilter` (antes de `page`/`size`), los
   `@RequestParam(required = false) BigDecimal` en el controlador y los criterios
   `price >= priceMin` / `price <= priceMax` en Mongo. Si el campo se guarda como `Decimal128`,
   convertir; si es `BigDecimal`, comparar directo.
3. Tests: controlador (los parámetros llegan al filtro) y adaptador/caso de uso si existe el patrón.
   Cubrir rango, solo mínimo, solo máximo y ninguno.
4. Rama `feat/ms-04-service-price-filters`, commit, push, PR a `develop` con el cuerpo en español.
   Guarda el número de PR en el informe.

Criterio: `GET /services?priceMin=50000&priceMax=120000` filtra y `total`/`totalPages` son coherentes.

### Bloque 2 — Front: devolver el filtro de precio de servicios

1. `ServiceListFilters` en `src/types/service.ts`: añadir `priceMin?`, `priceMax?`.
2. `src/services/servicesApi.ts`: mandarlos en la query (trim/undefined).
3. `src/pages/catalog/ServiceListPage.tsx`: restaurar el `<select>` de precio máximo con
   `MAX_PRICE_OPTIONS` (mismo patrón que actividades), `useFilterParam('precioMax')`, chip
   «Precio: Hasta …», clave en `FILTER_KEYS` y en el resumen de filtros. Sin «Aplicar».
4. Test de query string en `servicesApi.test.ts` y, si el patrón existe, test de la página.
5. Rama `feat/servicios-precio`; puerta; merge `--ff-only` a `develop`; push.

Criterio: `/servicios?precioMax=100000` pide `priceMax=100000` al servidor, muestra el chip y el
contador; limpiar filtros quita el parámetro.

### Bloque 3 — ms-02: totales reales de reportes por estado (backend)

Problema: el panel pide 100 reportes por estado y marca «+»; no hay total real.

Pasos:
1. Leer `SecurityReportController`, `SecurityReportRepositoryPort`, el adaptador Mongo y
   `SecurityConfiguration` (la autorización del listado global).
2. Añadir al puerto `Mono<Map<SecurityReportStatus, Long>> countByStatus()` (o el tipo agregado que
   mejor encaje con el dominio), implementarlo en Mongo (tres `count` o una agregación) y un caso
   de uso.
3. Exponer `GET /api/v1/security-reports/counts` con la **misma autorización que el listado global**
   (gestora/admin) y devolver `{ "ONGOING": n, "REPORTED": n, "SOLVED": n }`.
4. Tests: controlador (200 con staff, 401/403 sin sesión) y caso de uso/adaptador. Suite completa.
5. Rama `feat/ms-02-report-counts`, commit, push, PR.

Criterio: el endpoint cuenta todos los reportes, no una página; no altera el listado por cursor.

### Bloque 4 — Front: leyenda con totales reales

1. `securityReportsApi.counts()` con zod y `parseResponse`.
2. `ManageReportsPage`: usar `counts` para «En curso / Reportados / Resueltos» y **eliminar** el
   estado `truncated` y los «+». Mantener el listado reciente (puede seguir pidiendo los estados
   para la tabla, o reducirlo a lo que muestre; no rompas el filtro por chips).
3. Test del esquema en `securityReportsApi.test.ts` y de la pantalla si ya hay patrón.
4. Rama `feat/reportes-totales`; puerta; merge a `develop`; push.

Criterio: la leyenda muestra el total exacto aunque haya más de 100 reportes; sin «+».

### Bloque 5 — ms-03: error de filtro con `code` e índice de búsqueda

Trabaja sobre la rama `feat/ms-03-catalog-filters` (PR #60); no abras otro PR.

1. **Error uniforme**: hoy un `status` inválido lo rechaza la conversión de Spring con un 400 sin
   `code`. Añadir en `GlobalExceptionHandler` el manejo de `ServerWebInputException` /
   `MethodArgumentTypeMismatchException` devolviendo `ProblemDetail` 400 con
   `code: "INVALID_FILTER"` y un `detail` neutro. Test en `GlobalExceptionHandler`/controlador.
2. **Front**: mapear `INVALID_FILTER` en `src/utils/errors.ts` a un mensaje en español con acción
   («Alguno de los filtros no es válido. Revísalos e inténtalo de nuevo.») y test en
   `errors.test.ts`. Rama aparte en el front (`fix/filtro-invalido`), puerta y merge.
3. **Índice**: migración Flyway `V9__catalog_search_trgm.sql` en ms-03:
   `CREATE EXTENSION IF NOT EXISTS pg_trgm;` y sendos índices GIN sobre la expresión
   `translate(lower(name), 'áéíóúüñ', 'aeiouun')` de `actividad` y `evento` con `gin_trgm_ops`.
   Comprobar que `FlywayMigrationTest` valida la migración y que la suite pasa. Documenta en un
   comentario que la extensión requiere privilegios en producción.
4. Commit, push a la rama del PR #60 y anota en el informe que el PR se actualizó.

Criterio: `GET /activities?status=BASURA` devuelve 400 con `code=INVALID_FILTER`; la migración
aplica en Postgres limpio; el front traduce ese código sin mostrar el `detail`.

### Bloque 6 — E2E de reservas y reportes + capturas por rol

1. `e2e/flows.spec.ts` con datos únicos:
   - Turista: registro por UI (correo `e2e.<timestamp>@smxplore.local`, contraseña `ChangeMe123!`,
     DNI, nacionalidad, fecha de nacimiento). Abrir una actividad pública futura, reservar con los
     valores por defecto, comprobar `/mis-reservas`, abrir el detalle y cancelar; comprobar el estado.
   - Reporte: crear desde `/reportes/nuevo`, verlo en `/reportes`, abrir detalle y publicar un
     comentario.
   - Gestión: con `request` de Playwright, login como admin y `POST /security-reports/{id}/close`
     y `/solve`; recargar el detalle y comprobar el estado. Si el admin no tiene permiso, crear una
     gestora con `POST /admin/users`, leer la invitación en Mailpit y completar la contraseña; si
     algo de esto no es posible, deja el caso documentado y no lo finjas.
2. `e2e/screenshots.spec.ts`: capturas a 375, 768 y 1280, en claro y oscuro, de:
   catálogo (4), ficha de actividad, `/app`, `/app/usuarios`, `/app/reportes`, `/app/zonas` y los
   paneles de guía/prestadora/turista **si consigues una cuenta de cada rol** (invitación por
   Mailpit). Guarda en `docs/diseno/ola3/` y actualiza `docs/diseno/README.md`. Si un rol no se
   puede obtener, dilo en el informe; no inventes credenciales ni saltes la autenticación.
3. La spec no debe depender de datos manuales previos ni de correos fijos.
4. Rama `test/e2e-flujos`; puerta completa; merge a `develop`; push.

### Bloque 7 — Documentación de despliegue y deuda

1. En `docs/plans/009-ola3.md` (o un anexo) y en `AGENTS.md`: el front tolera un ms-03 viejo
   (ignora los parámetros y muestra el catálogo sin filtrar), pero **ms-03 debe desplegarse antes
   que el front** para que los filtros funcionen; los filtros de precio de servicios dependen del
   PR de ms-04; la leyenda de reportes depende del PR de ms-02.
2. Actualizar la deuda conocida: servicios ya con precio en servidor, reportes con totales reales,
   `INVALID_FILTER` disponible.
3. Incluye este brief en `docs/plans/010-riesgos-ola3.md` del front y commitéalo con el primer
   bloque del front.

## Informe final (obligatorio)

Por bloque: rama, commits, PR, qué se verificó y con qué comando, y qué quedó pendiente.
Al final: lista de PRs abiertos, pruebas ejecutadas (conteos), riesgos que siguen abiertos y
cualquier decisión que hayas tenido que tomar. No declares un bloque terminado sin la puerta en
verde.
