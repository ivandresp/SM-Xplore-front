# Pendientes encontrados en auditorías

Registro único de lo que sale en las auditorías (adversaria e independiente) de la ola 4 y de
las siguientes. Lo que está ABIERTO o CON DUEÑO se planifica en
[`docs/plans/013-ola5.md`](plans/013-ola5.md); este archivo es el registro, no el plan.
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
| B8-07 | MEDIA | CERRADO | Reseñas de guías PENDIENTE/RECHAZADO seguían públicas y admitían nuevas | Fila duplicada: se cierra en B8-09 (`0d3d87e`, 400/404) |

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

## B9 — Estados de carga (PR #9, firmado PASA)

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| B9-01 | MEDIA | CERRADO | Hueco de 200 ms al recargar (lista desmontada, esqueleto tardío) | `b4debd3`; lista anterior + aria-busy |
| B9-02 | MEDIA | CERRADO | Mínimo de 250 ms sobre datos ya recibidos en recargas | `e545893`; solo primera carga |
| B9-03 | MEDIA-ALTA | CERRADO | Paginación antes que la rejilla; CLS real 0,06407 a 1280 con 12 resultados | `76efe65`; gateada con el contenido |
| B9-04 | MEDIA | CERRADO | Reintento dejaba 200 ms sin mensaje ni esqueleto | `76efe65`; mensaje montado |
| B9-05 | BAJA | CERRADO | Dos regiones vivas y aria-busy falso durante la retención | `76efe65`; una región, OR |
| B9-06 | BAJA | CERRADO (pendiente de merge) | «Reintentar» seguía activo durante una petición nueva | PR #26: `disabled={isLoading}` en las 4 listas; test con 2 peticiones y segundo clic sin efecto; falla sin el fix |
| B9-07 | INFO | ACEPTADO | La primera carga retiene 250 ms aunque el backend responda a 210 | Criterio 2 original |

## B3 — Validación del alta (PR #8, firmado PASA)

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| B3-01 | ALTA | CERRADO | Teléfono más estricto que el DTO; bloqueaba +34/+1/fijos | `31391d6`; regex del DTO, +57 como pista |
| B3-02 | ALTA | CERRADO | nationality/preferredLanguage fuera del gate: 1 POST inválido | `31391d6`; 81 chars -> 0 POST |
| B3-03 | MEDIA | CERRADO | Errores sin anuncio y foco antes del commit | `31391d6`; role alert / aria-live y foco en efecto |
| B3-04 | MEDIA | CERRADO | Primer clic perdido al mover el botón con el error de blur | `d1daef9`; onMouseDown + e2e RED/GREEN |
| B3-05 | BAJA | CERRADO | DATA_CONFLICT genérico | `31391d6`; mensaje accionable con correo |
| B3-06 | BAJA | CERRADO | Checklist en verde con contraseña vacía | `31391d6`; estado neutral |
| B3-07 | BAJA | ACEPTADO | Fechas comparadas con el reloj del navegador | Peor caso 400 con campo señalado |
| B3-08 | BAJA | ACEPTADO | Clases Unicode no idénticas a Java | Dirección segura (front más estricto) |
| B3-09 | BAJA | CERRADO (pendiente de merge) | El mismo reflujo se comía el primer clic en «Inicia sesión» | PR #25: hueco reservado; botón +62 px → ≤1 px; `e2e/login-sin-reflujo.spec.ts` falla sin el fix; 404/404 tests |
| B3-10 | BAJA | ABIERTO | `playwright.config` con puerto fijo y reuseExistingServer | Puede correr contra otro checkout si 5173 está ocupado |

## B4 — Reportes: ubicación y foto (PR #11, firmado PASA CON RESERVAS)

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| B4-01 | — | CERRADO | Ubicación opcional verificada en el DTO y con 201 sin coordenadas | `SecurityReportRequest.java:14` |
| B4-02 | MEDIA | CERRADO | «Volver a consultar» borraba la ubicación válida si fallaba | `ddfd71e` |
| B4-03 | MEDIA | CERRADO | Se podía enviar mientras la geolocalización seguía buscando | `ddfd71e`; submit bloqueado |
| B4-04 | BAJA | CERRADO | Quitar foto 28×28 | `ddfd71e`; 44×44 |
| B4-05 | BAJA | CERRADO | Error de envío sin foco ni scroll | `ddfd71e`; ancla + focus |
| B4-06 | ALTA | CERRADO | Prod sin allowlist: ms-02 no arranca y el alta con foto da 400 | Backend #98 mergeado el 2026-11-12T16:57:54Z (`PHOTO_ALLOWED_HOSTS=res.cloudinary.com`); verificado en la API |
| B4-07 | BAJA | ACEPTADO | 400 de foto sin `code`; el front muestra el genérico | Mitigado por la allowlist |
| B4-08 | BAJA | ACEPTADO | Recursos huérfanos en Cloudinary al quitar/abandonar | Limpieza diferida |
| B4-09 | INFO | ACEPTADO | `handleSubmit` no comprueba `isUploadingPhotos` | Solo defensa visual; Chrome no permite Enter |
<<<<<<< HEAD
| B4-10 | BAJA | CERRADO (pendiente de merge) | La primera consulta de ubicación no tenía timeout propio | PR #28: temporizador de 10 s; respuesta tardía ignorada; test con fake timers falla si el umbral no dispara |
=======
| B4-10 | BAJA | CERRADO (pendiente de merge) | La primera consulta de ubicación no tenía timeout propio | PR #28: temporizador de 10 s; respuesta tardía ignorada |
>>>>>>> origin/develop

## B7 — Mapa OSM (PR #12, firmado PASA)

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| B7-01 | MEDIA | CERRADO | «Sin coordenadas» mentía cuando fallaba /sites | `e8a80aa`; missing vs unavailable |
| B7-02 | MEDIA | CERRADO | Un solo tile caído tumbaba los 4 sin reintento | `e8a80aa`; 2 intentos y parciales |
| B7-03 | MEDIA | CERRADO | Sin estado de carga ni timeout | `e8a80aa`; aria-busy + 8 s |
| B7-04 | BAJA | CERRADO | target=_blank sin avisar | `e8a80aa`; rel + aria-label |
| B7-05 | BAJA | CERRADO | Claves duplicadas en z=0 y `#map=NaN` | `e8a80aa`; key con índice, clampZoom |
| B7-06 | MEDIA | ACEPTADO (pospuesto) | URL de OSM hardcodeada; su política prohíbe volumen | Decisión 2026-11-12: B4 fuera de esta ola; no desplegar el mapa con volumen |
| B7-07 | BAJA | ACEPTADO (pospuesto) | Con 1-3 tiles muertos no aparece el enlace a OSM | Se resuelve con B4 en una ola futura |
| B7-08 | BAJA | ACEPTADO (pospuesto) | aria-busy dura hasta el timeout con un tile muerto | Se resuelve con B4 en una ola futura |
| B7-09 | INFO | ACEPTADO | El estado «sin coordenadas» es inalcanzable desde Site/Service (zod) | Rama defensiva válida |

## B8a — Alta de guía y cola (PR #10, firmado PASA)

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| B8a-01 | MEDIA | CERRADO | Cola sin salida al decidir la última fila de la última página | `f93f0e0`; clamp |
| B8a-02 | MEDIA | CERRADO | Panel de motivo invisible, sin foco ni aria-controls | `f93f0e0`; foco/scroll/orden |
| B8a-03 | BAJA | CERRADO | «Se avisó por correo» aunque el SMTP falle | `f93f0e0`; copy condicional |
| B8a-04 | BAJA | CERRADO | Prestadora rechazada: texto falso sobre el login | `f93f0e0`; «cuenta activa, perfil no publicado» |
| B8a-05 | MEDIA | CERRADO | Reintento tras 409/404 servía la lista de caché | `d8f4c6d`; clearCache + _= |
| B8a-06 | MEDIA | CERRADO | Invariante de página solo en el éxito de review | `d8f4c6d`; por respuesta |
| B8a-07 | BAJA | ABIERTO | Tipos duplicados (registration vs user, labels) | Seguimiento |
| B8a-08 | BAJA | ABIERTO | Pestaña/estado/página fuera de la URL | Seguimiento |
| B8a-09 | MEDIA | ABIERTO | RECHAZADO→APROBADO permite que una lista cacheada revierta un rechazo reciente | Mismo hallazgo que B8-10 (canónico); se cierra allí |
| B8a-10 | INFO | ABIERTO | No probado con DESTINATION_MANAGER real (solo ADMIN) | Deuda de verificación |

## B8b — Onboarding (PR #13, firmado PASA CON RESERVAS)

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| B8b-01 | ALTA | CERRADO | Preferencias INFERRED contaban como intereses elegidos | `b69231b`; solo EXPLICIT |
| B8b-02 | ALTA | CERRADO | Fallo de GET /preferences dejaba el paso 1 cargando para siempre | `b69231b`; error + reintento |
| B8b-03 | MEDIA | CERRADO | Foco perdido al alternar cápsulas con teclado | `b69231b`; aria-disabled |
| B8b-04 | MEDIA-BAJA | CERRADO | Clics descartados sin aviso durante una escritura | `b69231b`; role=status «Guardando…» |
| B8b-05 | BAJA | CERRADO | Objetivos táctiles de 17 px | `b69231b`; 44 px + touch-action |
| B8b-06 | BAJA | CERRADO | Copy del perfil afirmaba guardado sin PATCH | `b69231b` |
| B8b-07 | BAJA | CERRADO (pendiente de merge) | El paso 3 decía «nacionalidad y idioma» si solo se envió uno | PR #27: `describeSavedProfile(patch)`; 2 tests fallan con el texto fijo |
| B8b-08 | BAJA | ACEPTADO | Emoji como icono de cápsula | aria-hidden, sin daño |
| B8b-09 | BAJA | ACEPTADO | preferredLanguage nace «es» por normalización del backend | «Completo» puede ser un valor por defecto |

## B8-backend — máquina de estados y reseñas (PR #97, firmado PASA)

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| B8-08 | ALTA | CERRADO | Aprobar era reversible y dos gestoras podían sobrescribirse | `a2cfc41`; APROBADO terminal, revocación por user status |
| B8-09 | MEDIA | CERRADO | Reseñas de un alta no aprobada seguían públicas | `0d3d87e`; 400/404 |
| B8-10 | MEDIA | ABIERTO | Una lista cacheada puede revertir un rechazo reciente (RECHAZADO→APROBADO) | If-Match o exigir motivo al aprobar una rechazada |
| B8-11 | MEDIA | ABIERTO | Revocar por estado de usuario no exige motivo ni notifica; solo ADMIN | Decisión 2026-11-12: motivo obligatorio + correo; ADMIN y DESTINATION_MANAGER. Se implementa en B2 |
| B8-12 | MEDIA | ABIERTO | La cascada sigue: BLOQUEADO deja actividades publicadas en ms-03 | Decisión 2026-11-12: evento Kafka ms-01 → ms-03. Se implementa en B3 |
| B8-13 | BAJA | ABIERTO | La regla vive en el servicio, no en el dominio | Si otro llamador entra, APROBADO deja de ser terminal |
| B8-14 | BAJA | ABIERTO | Un RECHAZADO sin motivo sobre una APROBADA da 400 antes que 409 | Orden de guardas |

## B2 — Combobox y ruta activa (PR #14, firmado PASA)

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| B2-01 | ALTA | CERRADO | La opción activa no se desplazaba a la vista en listas largas | `6723b41`; scrollIntoView; Chrome 41 opciones End 0→1069 |
| B2-02 | MEDIA | CERRADO | `/actividades/:id` dejaba el header sin `aria-current` | `6723b41`; alias /explorar→/actividades |
| B2-03 | BAJA | ACEPTADO | `required` se anuncia pero el hidden no valida | Forms con noValidate + chequeo manual |
| B2-04 | BAJA | ACEPTADO | `form.reset()` no restaura | No hay reset en src |
| B2-05 | BAJA | ACEPTADO | `name`/`innerValue` sin uso hoy | Documentado en JSDoc |
| B2-06 | BAJA | CERRADO | Clic en el label abría el desplegable | `6723b41`; solo enfoca |
| B2-07 | INFO | ACEPTADO | Grupo vacío pinta `role=group` | Las páginas filtran grupos |
| B2-08 | BAJA | CERRADO (pendiente de merge) | Abrir una lista larga con el trigger abajo desplazaba la página (+287 px a 375) | PR #29: scroll interno del listbox; +93 px → 0 px |
| B2-09 | MEDIA | CERRADO | Auth, solicitudes, onboarding, reportes y recomendaciones seguían con `<select>` nativo. Migrados en los PRs #18-#22, mergeados el 2026-11-12 (`0911453`..`ae8ef98`). | `Select-String -CaseSensitive '<select' src` no devuelve etiquetas reales; 57 ficheros / 403 tests en `develop` |

## B6 — Responsive (PR #15)

Auditoría adversaria en worktree aparte, Chrome del sistema y 118 mediciones propias (13 rutas ×
320/375/768/900/1280 × base/menú/filtros, más landscape 667×375). Primer veredicto **BLOQUEA**;
`796872e` cierra los hallazgos y los guards se prueban por mutación.

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| B6-01 | CRÍTICA | CERRADO | Desde 900 px la barra lateral nunca se mostraba: el `@media` de escritorio iba antes de `.sidebar{display:none}` y a igual especificidad ganaba la posterior. El panel se quedaba sin navegación y el contenido en 240 px. | `064a3f2` `src/layouts/AppLayout.module.css:13-31`; `796872e` línea 23-36; captura `docs/diseno/ola4/app-1280-dark.jpg`; guard `e2e/panel-shell.spec.ts` |
| B6-02 | ALTA | CERRADO | La evidencia de «0 desbordes» era ciega: `scrollWidth === clientWidth` se cumplía con el layout roto, el spec permanente solo cubría 4 rutas públicas y las capturas 1280 del propio commit contradecían el PR. | `796872e`: `e2e/panel-shell.spec.ts` mide ancho de `aside` y `main`; `e2e/responsive.spec.ts` pasa a 320. Prueba de mutación del reauditor: repuesto el `@media` antes de `.sidebar`, el guard falla 2/2 |
| B6-03 | MEDIA | CERRADO | A 320 px `/eventos` desbordaba 10 px (330 vs 320): la fila de acciones de `PageHeader` no bajaba de su `min-content` por el valor `nowrap` del desplegable. | `796872e` `src/components/PageHeader/PageHeader.module.css:78-79` (`max-width:100%`; solo `min-width:0` no bastaba, probado) |
| B6-04 | MEDIA | CERRADO | Cruzar 900 px con el menú abierto dejaba `aria-expanded=true` con el panel oculto y el foco en `<body>` (caso real: iPad 768↔1024). | `796872e` `src/components/TopBar/TopBar.tsx:44,296-315`; guard «cruzar a escritorio» |
| B6-05 | BAJA | CERRADO | `aria-controls` apuntaba a un id inexistente con el menú cerrado. | `796872e` `src/components/TopBar/TopBar.tsx:416` |
| B6-06 | BAJA | CON DUEÑO | Objetivos táctiles por debajo de 44 px fuera de los componentes del bloque: píldora de rol 37 px, disparadores de `SelectField` 40 px, chip de filtro activo 29 px. Pasan el mínimo AA de 24 px (WCAG 2.5.8). | Decisión 2026-11-12: 44 px solo en controles táctiles primarios con `@media (pointer: coarse)`; escritorio sigue a 40 px. Se hace en B5 (`Chip`, `SelectField`, `FilterBar`) |
| B6-07 | BAJA | CERRADO | `<th>` sin `scope` y región de tabla enfocable aunque no desbordara. | `796872e` `src/components/DataTable/DataTable.tsx:113,121`; test en `DataTable.test.tsx` |
| B6-08 | BAJA | CON DUEÑO | El menú móvil solo se alcanza con la página arriba: el panel no tiene cabecera fija y en un listado largo hay que volver al inicio para navegar. No es regresión del bloque. | Decisión 2026-11-12: cabecera sticky solo en listados largos y panel, con `env(safe-area-inset-top)`; en detalle/formulario, normal. Se hace en B5 (`TopBar`/`AppLayout`) |
| B6-09 | BAJA | CERRADO | `docs/diseno/ola4`: 203 PNG y 19,38 MB (7,16 antes + 12,18 después), ~98 kB por imagen y dos copias de lo mismo. | `796872e`: 12 JPEG, 0,91 MB, generados por `e2e/ola4-capturas.spec.ts` |
| B6-10 | MEDIA | CERRADO | `B2-09`: los `<select>` nativos de auth, solicitudes, onboarding, reportes y recomendaciones no se migraron en el pase de B6; `FormField` era compartido. Mismo hallazgo que B2-09 (canónico); cerrado con los PRs #18-#22. | `0911453`..`ae8ef98`; 57 ficheros / 403 tests |
| B6-11 | BAJA | ACEPTADO | Al cruzar 768→1280 con el menú abierto el foco cae en `<body>`: el disparador queda `display:none` en escritorio y no hay dónde devolverlo. | `src/components/TopBar/TopBar.tsx:291-315` |
| B6-12 | BAJA | CERRADO | `e2e/ola4-capturas.spec.ts` escribía 12 JPEG en `docs/` en cada `npm run test:e2e` (ensuciaba el árbol) y el comentario decía 16 ficheros. | `ddc00ee`: salta salvo `CAPTURAS=1`; comentario corregido |
| B6-13 | INFO | ABIERTO | La tabla de `/app/reportes` no se pudo medir: el entorno del auditor renderiza 0 filas. El armazón sí (240/660-1040). | Deuda de verificación con datos sembrados |

## B2 y B6

- **B2** firmado PASA (PR #14). Excluye auth, solicitudes, onboarding, reportes y recomendaciones.
- **B6** entregado en PR #15 (`796872e`): responsive y menú móvil. **No** migró esos selects
  (B6-10); esa deuda se cerró en B1 con los PRs #18-#22.

## Entorno y operación (no son bugs de código)

| ID | Estado | Nota |
| --- | --- | --- |
| OPS-01 | CERRADO | El repo front no tenía `.github/`: sin checks de GitHub. El PR #17 se mergeó en `ddfc905` (2026-11-12T23:49:41Z) y el workflow `CI` (typecheck, lint, test y build) corre en cada PR. La plantilla sigue inerte con la rama por defecto en `main` y la protección la cubre `OPS-09` |
| OPS-02 | ACEPTADO | El gateway da 403 a `Origin` fuera de `http://localhost:5173`; los auditores usan proxy o 5173 |
| OPS-03 | CERRADO | Imagen vieja de ms-04 produjo un falso bug de filtros: comparar fecha de imagen vs commit antes de diagnosticar |
| OPS-04 | ABIERTO | Cuentas de prueba de auditorías en la BD local; borrar las privilegiadas al cerrar (una ya eliminada) |
| OPS-05 | ABIERTO | **Backend #98 antes de prod**: sin `PHOTO_ALLOWED_HOSTS=res.cloudinary.com`, ms-02 no arranca y el alta con foto da 400 |
| OPS-06 | ACEPTADO (pospuesto) | Tiles de OSM: URL hardcodeada; proveedor o self-host antes de desplegar. B4 pospuesto por decisión del 2026-11-12 |
| OPS-07 | ABIERTO | Cuentas de prueba nuevas (audit-b8b*, b3-r2*, b4*) en la BD local |
| OPS-08 | CERRADO | Worktrees de la ola 5 (`b1`, `reg`, `rec`, `rep`, `perfil`, `b7`) eliminados y ramas remotas borradas; `git worktree list` solo devuelve el repo principal |
| OPS-09 | ABIERTO | Protección de `develop`, rama por defecto `main`, `delete_branch_on_merge` y dependabot alerts: requiere administración del repo (dueño `ivandresp`). Mientras `develop` no esté protegida el check es informativo; mientras la default sea `main`, la plantilla y CODEOWNERS no se aplican |