# Pendientes encontrados en auditorías

Registro único de lo que sale en las auditorías (adversaria e independiente) de la ola 4.
No se borra: un hallazgo se marca **CERRADO** con su commit/test, o queda **ABIERTO**,
**ACEPTADO** (con motivo) o **CON DUEÑO** (bloque donde se resuelve).

Dueño del archivo: el orquestador al cerrar cada bloque. Los subagentes no lo editan; entregan
hallazgos y el orquestador los anota. La norma de auditoría está en
`docs/agents/prompt-senior.md` §4.

## B1 — Caché y duplicados (PR #3, mergeado)

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| B1-01 | ALTA | CERRADO | Fuga entre cuentas: respuesta en vuelo se cacheaba tras cambiar de token | `187c3d9`; test `httpClient.test` «respuesta en vuelo de una cuenta…» |
| B1-02 | ALTA | CERRADO | La mitigación no tenía test (revertir dejaba 116/116 verdes) | `187c3d9`; 3 tests fallan sin la guarda |
| B1-03 | MEDIA | CERRADO | Invalidación no cubría GET en vuelo | `187c3d9`; generación de caché |
| B1-04 | MEDIA | CERRADO | `dedupe` borraba la promesa nueva tras `clearCache` | `cache.ts` identidad; test |
| B1-05 | MEDIA | CERRADO | Sin tope de entradas | `cache.ts` 200; test de purga |
| B1-06 | MEDIA | CERRADO | Hit con token vencido | `41c3237`; test «no sirve caché con el token vencido» |
| B1-07 | MEDIA | CERRADO | 200 con cuerpo vacío cacheado como `undefined` | `41c3237`; test |
| B1-08 | BAJA | CERRADO | `AbortSignal` del primer llamador gobernaba a los que compartían dedupe | `41c3237`; sin dedupe si hay signal; test |
| B1-09 | BAJA | CERRADO | Regex de `interactions/view` sin anclar (query lo saltaba) | `41c3237`; test con query |
| B1-10 | BAJA | CERRADO | Refrescar en el tope desalojaba la clave refrescada | `3b76afb`; test |
| B1-11 | BAJA | CERRADO | JWT en claro dentro de la clave de caché | `3b76afb`; `tokenFingerprint` + test |
| B1-12 | INFO | CERRADO | `/app` sin medir | `3b76afb`; 3→0 con admin |
| B1-13 | INFO | CERRADO | Medición no reproducible desde el commit | `scripts/measure-requests.mjs` |

| ID | Sev | Estado | Hallazgo | Motivo |
| --- | --- | --- | --- | --- |
| B1-A1 | MEDIA | ACEPTADO | No se obedece `Cache-Control: no-store` del gateway | Es estado de aplicación por pestaña, ligado al token; si se quiere semántica HTTP estricta, se quita el header en GET públicos (backend) |
| B1-A2 | BAJA | ACEPTADO | Hasta 30 s de datos de catálogo en la misma pestaña | TTL elegido; mutaciones propias invalidan |
| B1-A3 | BAJA | ABIERTO | El timeout/signal del primer llamador gobierna a los que comparten dedupe | Hoy ningún caller de producción pasa signal (grep). Si aparece uno, se resuelve con clave por timeout o aborto compartido |
| B1-A4 | BAJA | ACEPTADO | Una mutación fallida no invalida | Ventana máxima 30 s; no hay dato corrupto |

## B5 — Recomendaciones (PR #6, abierto)

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| B5-01 | MEDIA | CERRADO | «Ver más» fallido borraba la lista y el Reintentar repetía el corte (bucle) | `526cc73`; test 12 OK + 24 400 |
| B5-02 | MEDIA | CERRADO | Log nuevo en 4 de 72 catch; el guardado del perfil sin rastro | `973a1fa`; `logApiError` en perfil; test |
| B5-03 | MEDIA | CERRADO | El select no se limpiaba tras añadir preferencia (POST duplicado) | `973a1fa`; test 1 POST |
| B5-04 | MEDIA | CERRADO | Foco perdido al deshabilitar «Ver más» | `526cc73`; foco al H2; medido en Chrome |
| B5-05 | BAJA | CERRADO | Mensaje de contrato mandaba «Reintentar» donde no había botón | `973a1fa`; mensaje neutro |
| B5-06 | BAJA | CERRADO | `TypeError` de red se logueaba como `unexpected` | `973a1fa`; `kind:'network'` |
| B5-07 | BAJA | CERRADO | Vacío y error pintados a la vez en `/perfil` | `973a1fa`; test con 403 |
| B5-08 | BAJA | CERRADO | Recarga por preferencia volvía al corte 12 | `141b3f0`; `loadedLimitRef`; test |
| B5-09 | BAJA | CERRADO | Recarga fallida borraba las tarjetas | `141b3f0`; conserva data + inline |
| B5-10 | BAJA | CERRADO | Respuesta vieja de «ver más» pisaba el reload | `141b3f0`; `requestSeqRef` |
| B5-11 | BAJA | CERRADO | Con lista vacía, fallo de recarga silencioso | `2adb3b9`; alerta fuera de `items>0` |
| B5-12 | BAJA | CERRADO | Alerta inline sin reintento | `2adb3b9`; `retryInline` al corte actual |

| ID | Sev | Estado | Hallazgo | Dueño / nota |
| --- | --- | --- | --- | --- |
| B5-A1 | BAJA | ABIERTO | El Reintentar inline pierde el foco al desmontarse | B5, próxima pasada de teclado |
| B5-A2 | BAJA | ABIERTO | Ese reintento no reintenta el fallo de «Ver más» (recarga el corte actual) | B5, decidir semántica |
| B5-A3 | BAJA | ABIERTO | `.moreError` es CSS muerto | Limpieza |
| B5-A4 | BAJA | ACEPTADO | «No hay más» se infiere de `items.length`; el servicio no informa total | Texto ya honesto; depende de `DiversitySelector` |
| B5-A5 | MEDIA | CON DUEÑO | Preferencias al crear cuenta | Va en el onboarding de B8 |
| B5-A6 | BAJA | ACEPTADO | Techo 50 a mano vs `RECOMMENDATIONS_MAX_LIMIT` del backend | Un 400 conserva la lista; si cambia la env, se ajusta |

## B8 — Guías, gestoras y onboarding (PR #97, abierto)

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| B8-01 | ALTA | CERRADO | Un guía PENDIENTE/RECHAZADO era público (nombre y licencia) | `60a96cd`; 404 verificado por gateway |
| B8-02 | ALTA | CERRADO | Un guía PENDIENTE podía entrar (login solo miraba `isActive`) | `0ede844`; 403 `ACCOUNT_PENDING_REVIEW` solo tras contraseña |
| B8-03 | MEDIA | CERRADO | Rechazar sin motivo | `60a96cd`; 400 `errors.reason`; tests |
| B8-04 | MEDIA | CERRADO | La cola volcaba contactos APROBADOS a cualquier gestora | `60a96cd`; `status=APROBADO` → 400 |
| B8-05 | MEDIA | CERRADO | La migración dejaba `DEFAULT PENDIENTE` (rollback silencioso) | `60a96cd`; V14 aplicada, sin default |
| B8-06 | MEDIA | CERRADO | Correos de rechazo afirmaban cosas falsas | `60a96cd`; textos por rol |
| B8-07 | MEDIA | EN CURSO | Reseñas de guías PENDIENTE/RECHAZADO seguían públicas y admitían nuevas | Misma regla que B8-01; carril B8 |

| ID | Sev | Estado | Hallazgo | Dueño / nota |
| --- | --- | --- | --- | --- |
| B8-A1 | MEDIA | ACEPTADO | Prestadora RECHAZADA puede iniciar sesión; guía no | Comportamiento previo al PR; cambiarlo es decisión de producto |
| B8-A2 | MEDIA | CON DUEÑO | Rechazar no retira contenido ya publicado en ms-03/ms-04 (sin evento desde ms-01) | Nuevo bloque de backend/cascada |
| B8-A3 | MEDIA | ACEPTADO | Guía RECHAZADA no puede re-registrarse (409); la salida es re-aprobar desde la cola | Verificado; documentado en el PR |
| B8-A4 | BAJA | ACEPTADO | No hay vuelta a PENDIENTE; APROBADO→RECHAZADO→APROBADO sí | Flujo suficiente por ahora |
| B8-A5 | MEDIA | ACEPTADO | La cola no audita lecturas ni tiene alcance por destino | No hay modelo de destino; revisar con volumen |
| B8-A6 | BAJA | ACEPTADO | Dos superficies de review con códigos distintos (400 vs 404) | La del front es `/registrations` |
| B8-A7 | BAJA | ACEPTADO | Índice de V13 inútil con `COALESCE` | Revisar con volumen real |
| B8-A8 | BAJA | ACEPTADO | Query/path inválidos devuelven `INVALID_BODY` | Handler global heredado |
| B8-A9 | BAJA | ACEPTADO | `/admin/users` no filtra guías por estado | La cola lo cubre |

## Entorno y operación (no son bugs de código)

| ID | Estado | Nota |
| --- | --- | --- |
| OPS-01 | ABIERTO | El repo front no tiene `.github/`: no hay checks de GitHub; la puerta es local |
| OPS-02 | ACEPTADO | El gateway da 403 a `Origin` fuera de `http://localhost:5173`; los auditores usan proxy o 5173 |
| OPS-03 | CERRADO | Imagen vieja de ms-04 produjo un falso bug de filtros: comparar fecha de imagen vs commit antes de diagnosticar |
| OPS-04 | ABIERTO | Cuentas de prueba de auditorías en la BD local; borrar las privilegiadas al cerrar (una ya eliminada) |
