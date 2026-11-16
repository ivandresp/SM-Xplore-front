# Plan 016 — Ola 8: jerarquía y densidad (`docs/plans/016-ola8-jerarquia-densidad.md`)

> Persistido el 2026-11-15. Rama de ejecución: `feat/ola8-jerarquia-densidad` (a crear desde `origin/develop`).
> Nota de autoridad: la regla de solo-lectura de `Mis_GitProyectos/AGENTS.md` aplica al bot de WhatsApp; el humano autoriza escribir en `SM-Xplore-front` (rama + este plan). Conflicto resuelto y anotado aquí.
> Sustitución declarada: no hay humano disponible para el probe interactivo de `the-fool` ni para el selector de modo; se aplicó el pre-mortem inline y las decisiones de producto quedan marcadas como propuesta + coste + alternativa.

## Decisiones del humano (2026-11-15, por encima del plan)

1. Ola 8 es jerarquía y densidad. No se rediseña ni se tocan los tokens de la ola 7 (radios 10/12/14, alturas por token, escala tipográfica cerrada, selector de tema). Eso está mergeado y verificado: no rehacerlo ni "mejorarlo".
2. Bugs 1 y 2 son de una línea: van en el **primer commit de la rama de ejecución, no en el plan**.
3. Bugs 3 y 4 necesitan decisión (3 es jerarquía, 4 es datos/e2e): propuesta + coste + alternativa.
4. Los seis elementos que percibe "al azar" hay que **decidirlos, no parchearlos**, con decisión explícita de qué merece espacio y qué sobra.
5. **D5 — reemplaza D5.** La tarjeta NO pierde el bloque de imagen: se convierte en un componente `Media` reutilizado por ActivityCard, EventCard, SiteCard y ServiceCard.
   - `--media-h: 116px` en `index.css`, idéntico en las cuatro.
   - Con foto: `<img src={photosUrls[0]} loading="lazy">`, `object-fit: cover`, chip de categoría sobre scrim degradado. `onError` cae al fallback.
   - Sin foto: icono de imagen (SVG 30px, stroke `currentColor`, opacidad .5) + etiqueta "Sin foto". Cero iniciales, cero gradientes saturados. Icono y etiqueta `aria-hidden`.
   - SiteCard y ServiceCard encienden la foto YA: `photosUrls` existe en su DTO.
   - ActivityCard y eventos: mismo componente, hoy siempre fallback. **NO** añadir `photosUrls` al tipo de Activity: no está en el DTO y zod lo rechazaría.
   - Referencia visual obligatoria: `%TEMP%\opencode\tarjetas-foto-fallback.html`, secciones 1 a 3. Se mide contra ese mock, no de memoria.
6. **D9 — nueva.** Superficies cálidas "De mar a páramo".
   - claro: `--color-surface #f4f5f7→#f7f2ea`, `--color-bg #ffffff→#fffdfa`
   - oscuro: `--color-bg #0d1519→#08171c`, `--color-surface #111b22→#0d2228` (el encargo cita `#131e24` como origen; el valor real en `index.css:187` es `#111b22`: se aplica el destino), `--color-border #24323d→#1d3a41`
   - Medido AA en 11 pares: 15.62:1 texto/arena, 15.92:1 texto/mar, 6.63:1 CTA coral con texto oscuro. Re-corre `audit:visual` con los pares nuevos.
   - Revisar `--color-primary-soft` (`#ddf3ec`): es menta fría y choca con la arena; proponer verde-arena y medir antes de aplicarlo.
   - D9 contradice la decisión 1 (prohibición de tocar tokens) **en el alcance limitado a `--color-bg`, `--color-surface`, `--color-border` y `--color-primary-soft`**: el resto de la ola 7 (radios, alturas, escala tipográfica, selector de tema) sigue intacto.

## Skills

- **Usadas:** `writing-plans` (estructura de decisiones con coste/alternativa), `ui-ux-pro-max` (búsquedas `--domain ux` "visual hierarchy competing elements" y "progressive disclosure password" → pautas genéricas de referencia; la tabla de prioridades 1-10 como criterio), `webapp-testing` (cargada; sustituida por Playwright del proyecto vía script node con el Chrome del sistema, patrón de la ola 7), `the-fool` (pre-mortem inline al cierre; sustitución declarada en el encabezado), `ponytail` (modo activo: cambio mínimo que resuelve completo, una decisión por problema).
- **Descartadas:** `brainstorming` (las decisiones ya vienen dictadas por el humano; re-abrirlas es alcance extra), `frontend-design`/`impeccable` (prohibido rediseñar; los tokens no se tocan), `systematic-debugging`/`test-driven-development` (fase sin código), `browser` (el modelo no admite entrada de imagen; Playwright mide con precisión de píxel, patrón ola 7).

## 1. Hallazgos medidos (375 / 768 / 1280, claro y oscuro)

Medición con Playwright (Chrome del sistema) contra dev server :5173 + backend real (gateway 200). Los valores son idénticos en claro y oscuro salvo donde se indica: son problemas de **jerarquía y ruido, no de contraste**.

| # | Hallazgo | Medido | Evidencia |
|---|---|---|---|
| H1 | **Buscador del header con relleno teal**: único elemento relleno de la barra navy. Compite con el CTA "Iniciar sesión" (enlace transparente). | Relleno `#0a6f6d` (`--color-bar-fill`), texto blanco (contraste 6.0:1 — no es fallo a11y, es peso visual). 375: fila completa 343×44, header pasa a 124px de alto; 768: 736×44; 1280: 544×44 (tope `max-width: 34rem`). Todos los demás elementos del header: fondo transparente. | `TopBar.module.css:434-437` (`.dark .search`), `index.css:45` |
| H2 | **"Panel de gestión"**: píldora sin función. Es un `<span>`, no es enlace ni botón. Duplica al rol ya presente en el slot derecho ("Administrador") y al userBox del sidebar. | 132×28 en los tres anchos, siempre visible. | `AppLayout.tsx:38` → `TopBar.tsx:400`; grep: único uso del prop `badge` |
| H3 | **Checklist de contraseña con 4 "Pendiente"**: en reposo (sin teclear) muestra 4 filas cada una con la palabra de estado "Pendiente". Parece tabla de QA. | 375: 247×199 (cada ítem ocupa 2-3 líneas); 768/1280: 464×119. Los 4 estados visibles sin haber tocado el campo. | `RegisterPage.tsx:411-440`, `auth.module.css:159-219` |
| H4 | **Metadata interna en el dashboard**: "Administrador · Activo · Registro: 5/11/2026, 1:34 p. m." como subtítulo del saludo, para todos los roles. | 13.6px muted; claro `#4b5563` sobre blanco (≈7.6:1), oscuro `#a4b1bd` sobre `#0d1519` (≈8.4:1) — contraste OK, es ruido informativo. Rol y estado ya están en el sidebar y en el header. | `DashboardPage.tsx:724-727`; `AppLayout.tsx:43,71` |
| H5 | **19 tarjetas idénticas "Sin foto" + "Ver detalle" a ancho completo**: sin jerarquía entre tarjetas. La actividad **no tiene campo de foto en el API** (no es un dato que falte: es la forma del contrato), así que el placeholder 4:3 con tinte teal y borde es permanente. | 12 tarjetas por página, todas con placeholder (≈⅓ del alto). 375: 1 columna, tarjeta 327×397; 768: 3 columnas 229×360; 1280: 5 columnas 234×364. Botón outline "Ver detalle" a ancho completo en cada tarjeta. | `ActivityCard.tsx:15-30`; `types/activity.ts:7-20` (sin `photoUrls`); backend ms-03: `Activity` sin fotos |
| H6 | **Densidad del registro en escritorio**: la tarjeta se topa en 544px y en 1280 queda centrada con ~736px de vacío total. Los campos del grid de dos columnas miden 208-224px. | Card: 375 → 327×1548; 768 → 544×1172; 1280 → **544×1172 (idéntica a 768: el tope 34rem ya mandó)**. 13 controles. | `auth.module.css:12` (`max-width: 34rem`) |
| H7 | **Bug 2 no se reproduce como descrito**: la media query `min-width: 560px` es de viewport, no de contenedor, y el grid SÍ se activa. | email y teléfono side-by-side medidos en 560, 600, 768 y 1280; apilados solo a 375. | `auth.module.css:42-46`; medición de posiciones de inputs |
| H8 | **Bug 1 confirmado (doble asterisco)**: `<span>{' *'}</span>` + `::after { content: ' *' }` se pintan ambos. | Código en ambas fuentes; el resultado es `**` en labels requeridos de `SelectField`. | `SelectField.tsx:369-373`, `SelectField.module.css:19-20` |
| H9 | **Bug 3 confirmado**: los chips de filtros activos solo se renderizan cuando hay filtros, debajo del panel. | Al elegir el primer filtro aparece una fila nueva y toda la sección de resultados baja ~44px. | `FilterBar.tsx:84-103` |
| H10 | **Bug 4 confirmado**: `createBookableActivity` crea contra la base real y nada limpia. Estado actual de la BD: **19 actividades, 18 son "Actividad E2E"**; 2 sitios (1 es "Sitio E2E"); 2 zonas (1 es "Zona E2E"). | `GET /activities?status=PUBLISHED` → 19 totales, 18 E2E. ms-03/ms-04 no tienen DELETE para actividades/sitios/zonas: solo transiciones de estado (`CANCELLED` para actividades; `ContentStatus.DRAFT/PUBLISHED` para sitios; `INACTIVE` para zonas). | `e2e/support.ts:73-109`; grep `@DeleteMapping` en backend: solo ms-01 usuarios, ms-04 notificaciones, ms-05 preferencias |

## 2. Decisiones: qué merece espacio y qué sobra

Criterio de fondo (ui-ux-pro-max, tabla de prioridades): un solo elemento dominante por superficie, la información que decide el usuario arriba, y nada que no sea accionable o identifiquante a la vista.

### D1 — Buscador del header: sobra el relleno teal (decisión)

**Propuesta:** el buscador navy pasa a relleno translúcido blanco (`rgba(255,255,255,0.12)`, mismo lenguaje que la píldora del badge y el menuButton dark), texto blanco, borde translúcido. El teal queda como acento donde ya lo está (anillo de foco usa `--color-on-bar-muted`, enlaces hover, chips del panel). **No se toca el token** `--color-bar-fill`: se deja de usar en `.dark .search`, nada más.

- **Coste:** 3-4 líneas en `TopBar.module.css` (`.dark .search` y `.dark .search:focus-within`). Cero JSX, cero tests rotos (ningún spec aserta el color del buscador).
- **Alternativa:** mantener el teal (es la referencia del mockup, `PublicLayout.tsx:11`) y en su lugar reducir el ancho a `max-width: 24rem` en escritorio. Misma complejidad, pero el humano ya calificó el teal como "el elemento más ruidoso": reducirlo no arregla el ruido.

### D2 — "Panel de gestión": sobra (decisión)

**Propuesta:** eliminar la píldora y el prop `badge` de `TopBar` (queda sin usos). La ubicación ya la dan el rol en el slot derecho (`AppLayout.tsx:43`) y el sidebar.

- **Coste:** `AppLayout.tsx:38` (−1 línea), `TopBar.tsx:29-30,274,400` (−4 líneas), `TopBar.module.css:512-526` (−15 líneas). Un grep de confirmación de que `badge` no se usa en otro layout.
- **Alternativa:** mantenerla como pista de orientación para gestoras/admin que alternan entre catálogo público y panel. Coste cero; no resuelve la percepción de "elemento sin función".

### D3 — Checklist de contraseña: sobra en reposo, aparece al teclear (decisión)

**Propuesta:** el checklist solo se renderiza cuando `values.password !== ''`. En reposo, el campo se describe con un `hint` de una línea ("Mínimo 12 caracteres; combina al menos 3 tipos"). La divulgación progresiva elimina la "tabla de QA" en el estado inicial y conserva la guía justo cuando importa (mientras se teclea).

- **Coste:** ~6 líneas en `RegisterPage.tsx` (condicional + `aria-describedby` solo cuando el checklist existe) + `auth.module.css` (nada) + 1 línea de hint. Ajustar `RegisterPage.test.tsx:663` (rellenar contraseña antes de asertar "Pendiente").
- **Alternativa:** mantener el checklist visible pero ocultar la columna de estados en reposo (solo viñetas). Coste similar; deja 4 filas de texto que el usuario aún no puede usar, más ruido que el hint.

### D4 — Metadata del dashboard: sobra (decisión)

**Propuesta:** eliminar la línea `{ROLE_LABELS} · {status} · Registro: …` del header del dashboard. Rol y estado ya viven en el sidebar (`AppLayout.tsx:43,71`) y en el saludo no aportan decisión. `signedUpAt` es dato interno de soporte, no del usuario.

- **Coste:** `DashboardPage.tsx:724-727` (−4 líneas); verificar imports huérfanos (`formatDateTime` sigue usándose en la lista de pendientes, `:659`; `ROLE_LABELS`/`ACCOUNT_STATUS_LABELS` se siguen usando). Sin tests que lo aserten (grep en `*.test.tsx`: 0 matches).
- **Alternativa:** moverla a `/perfil` en vez de borrarla. Más código y una página que tocar; no la pide nadie.

### D5 — Tarjetas del catálogo: el placeholder de foto sobra; el nombre y el precio merecen el espacio (decisión)

> **Reemplazada el 2026-11-16 por la decisión del humano D5 (ver «Decisiones del humano»): la tarjeta conserva el bloque de imagen como componente `Media` reutilizable.** El texto siguiente se deja como registro de la decisión original.

**Propuesta:** como el contrato de actividad no lleva fotos, el bloque media 4:3 desaparece de `ActivityCard`. La jerarquía pasa al nombre (peso y tamaño por encima) y al precio (primero visual tras el nombre). "Ver detalle" deja de ser botón outline a ancho completo: pasa a enlace de texto al pie (`Ver detalle →`), y el `<article>` completo navega (patrón de tarjeta enlazada), con `aria-label` en el enlace para lectores de pantalla.

- **Coste:** `ActivityCard.tsx` (~12 líneas) + `ActivityCard.module.css` (~10 líneas: fuera `.media`/`.mediaNote`, `:11-25`). Actualizar `e2e/flows.spec.ts:50` (el locator `getByRole('button', { name: 'Ver detalle' })` pasa a `getByRole('link', …)`). `ExplorePage.test.tsx` si aserta el placeholder.
- **Alternativa:** mantener el placeholder pero compacto (franja fina, sin borde teal). No ataca la raíz: el bloque no tiene información que mostrar, nunca la tendrá con este contrato.
- **Fuera de alcance declarado:** `SiteCard`/`ServiceCard` sí tienen `photoUrls` en su contrato: conservan su media. Los eventos usan fila con badge de fecha, no tarjeta: se dejan como están.

### D6 — Densidad del registro en escritorio: la tarjeta merece más ancho (decisión)

**Propuesta:** a ≥768px, `max-width` de la tarjeta de auth pasa de 34rem a **44rem (704px)**. El grid de dos columnas (ya activo desde 560, ver H7) pasa de columnas de ~224px a ~330px; la tarjeta de 1172px de alto baja ~1 pantalla porque los pares de campos dejan de apretarse. En <768px nada cambia.

- **Coste:** 1 línea en `auth.module.css` (media query envolviendo `.card { max-width: 44rem }`). Re-medición 768/1280 como puerta. `touch-targets.spec.ts` y `responsive.spec.ts` no tocan la tarjeta de auth; verificar en la puerta.
- **Alternativa:** mantener 544px (las tarjetas de auth convencionales miden 400-500px) y aceptar la percepción "hecho para mobile" en escritorio. Coste cero; es exactamente el estado que el humano rechazó.
- **Nota de corrección (ley de evidencia):** el bug 2 del briefing ("el grid nunca se activa, a ningún ancho") no se reproduce: la media query es de viewport y el grid se activa desde 560px (medido side-by-side a 560/600/768/1280). El defecto real que lo motivó es el tope de 34rem en escritorio, resuelto aquí. El primer commit de la rama lleva el fix del bug 1 (eliminar una de las dos fuentes del asterisco) y **no** un fix inexistente del grid.

### D7 — Bug 3 (chips que empujan la tabla): reservar el espacio (propuesta + coste + alternativa)

**Propuesta:** el contenedor de chips pasa a renderizarse siempre (con `min-height` de una fila de chip, ~`var(--control-h-md)`), vacío cuando no hay filtros. Al elegir el primer filtro el chip aparece **dentro del espacio ya reservado**: la tabla no se mueve. Cumple la pauta anti-CLS (reservar espacio, ui-ux-pro-max prioridad 3) y el test `combobox-sin-salto.spec.ts` no cambia (sigue sin saltos, ahora por reserva en vez de por ausencia).

- **Coste:** `FilterBar.tsx:84-103` (quitar el condicional, conservar `aria-label`) + `FilterBar.module.css:91-98` (añadir `min-height`; el `ul` vacío no pinta nada). Verificar `catalog-filters.spec.ts` y `touch-targets.spec.ts` en la puerta.
- **Alternativa:** mover los chips a la fila del head (junto a "N filtros activos"). Mismo resultado anti-salto, pero a 375 esa fila ya está llena (título + contador + botón): los chips envolverían a segunda línea y empujarían igual.

### D8 — Bug 4 (basura E2E en el catálogo): teardown por transición de estado + limpieza única (propuesta + coste + alternativa)

**Propuesta:** en dos partes.

1. **Teardown en `e2e/support.ts`:** `createBookableActivity` devuelve además un `cleanup` (PATCH `/activities/{id}/status` → `CANCELLED`, transición válida `PUBLISHED → CANCELLED`, `ActivityStatus.java:14`); los specs que la usan (`flows.spec.ts`, `screenshots.spec.ts`) lo invocan en `afterAll`. El catálogo público filtra `status=PUBLISHED`, así que la actividad desaparece de la vista del usuario. `screenshots.spec.ts` ya está gated por `CAPTURAS=1`; el que contamina en cada corrida es `flows.spec.ts`.
2. **Limpieza única de lo ya acumulado:** script node desechable (`scripts/cleanup-e2e-data.mjs` o comando documentado) que con el token de admin cancela las 18 "Actividad E2E", pasa "Sitio E2E" a `DRAFT` (`PATCH /sites/{id}/status`, `ContentStatus` permite PUBLISHED/DRAFT) y "Zona E2E" a `INACTIVE` (`PATCH /zones/{id}/status`, `ZoneStatus.INACTIVE`). Se ejecuta una vez y no queda como artefacto permanente.

- **Coste:** ~25 líneas en `e2e/support.ts` + 2 `afterAll` + ~30 líneas de script. Sin cambios de backend, sin dependencias.
- **Alternativa:** pedir DELETE en ms-03/ms-04 (borrado real, la basura no queda ni oculta). Coste: PRs de backend + despliegue, fuera del alcance de esta ola; la transición de estado resuelve la percepción del usuario (catálogo público limpio) con coste de front.

## 3. Resumen de lo que sobra vs. lo que merece espacio

| Verdicto | Elemento | Decisión |
|---|---|---|
| Sobra | Relleno teal del buscador (H1) | D1: translúcido blanco, teal queda como acento |
| Sobra | Píldora "Panel de gestión" (H2) | D2: eliminar prop + componente |
| Sobra en reposo | Checklist de contraseña (H3) | D3: solo al teclear, hint de una línea en reposo |
| Sobra | Metadata de rol/estado/fecha en el saludo (H4) | D4: eliminar (ya está en sidebar/header) |
| Sobra | Placeholder de foto y botón a ancho completo (H5) | D5: nombre y precio mandan; enlace de texto |
| Merece más espacio | Tarjeta de registro en escritorio (H6/H7) | D6: 44rem a ≥768px |
| Merece espacio reservado | Chips de filtros activos (H9) | D7: fila siempre renderizada con `min-height` |
| Merece limpieza | Datos E2E en BD real (H10) | D8: teardown CANCELLED + script único |

## 4. Orden de ejecución (para la rama, no se ejecuta ahora)

1. **Primer commit (fuera del plan):** bug 1 — eliminar `SelectField.module.css:19-20` (`::after`) y dejar el `<span>` de `SelectField.tsx:369-373` como única fuente del asterisco. Sin el "fix" del bug 2 (no se reproduce, ver D6/H7).
   - Decisión del humano 2026-11-16: el fix del asterisco conserva la fuente CSS (`FormField.module.css:15` ya usa `data-required`) y elimina el `<span>` de `SelectField.tsx`. Primer commit = plan + ese fix; nada más de `src/`.
   - D9 (superficies cálidas) se ejecuta inmediatamente después del primer commit, antes de los demás bloques, por ser cambio de tokens.
2. D2 + D4 (borrados puros, sin lógica): un commit "chore: quitar elementos sin función".
3. D1 + D3 (buscador y checklist): un commit "fix: bajar el ruido visual del header y del registro".
4. D5 + D6 (tarjetas y densidad): un commit "fix: jerarquía del catálogo y densidad del registro" con el spec e2e actualizado.
5. D7 (reserva de chips): un commit "fix: los filtros activos no empujan la tabla".
6. D8 (e2e): un commit "test(e2e): teardown de datos" + ejecución del script de limpieza única.

Puerta por bloque: `npm run typecheck && npm run lint && npm test` y los e2e afectados; puerta final: suite completa + re-medición 375/768/1280 claro/oscuro (el mismo script de medición de este plan) + capturas en `docs/diseno/ola8/`.

## 5. Pre-mortem (the-fool, inline; sustitución declarada en el encabezado)

**Timeframe:** 2 semanas tras el merge; el humano vuelve a revisar /explorar, /registro y /app.

1. **"Quité el teal y ahora la barra navy se ve muerta"** — Likelihood: Media | Impact: Media. Si el translúcido 0.12 queda demasiado tenue, el header pierde su único acento. Mitigación: D1 conserva el teal en foco/enlaces; re-medición con capturas antes del PR; el humano revisa las capturas (fase 2, como en la ola 7).
2. **"El registro sigue pareciendo móvil a 1280"** — Likelihood: Baja | Impact: Media. 44rem arregla el tope, pero si los `hint` de teléfono y NIT alargan las columnas, la tarjeta vuelve a crecer. Mitigación: puerta de D6 mide el alto de la tarjeta a 768 y 1280; aceptación: alto a 1280 < 1172px medido hoy.
3. **"El e2e sigue ensuciando porque un test falla antes del afterAll"** — Likelihood: Media | Impact: Baja. `afterAll` de Playwright corre aunque el test falle (se ejecuta siempre que el worker no crashee), pero si el spec crea la actividad y el navegador muere, queda huérfana. Mitigación: el script de limpieza única queda documentado en el PR para re-ejecutarlo cuando se acumule; alternativa futura: DELETE real en backend (fuera de ola).
4. **"Algún test asume el botón 'Ver detalle'"** — Likelihood: Baja | Impact: Media. Grep encontró `flows.spec.ts:50`; el coste de D5 lo incluye. Mitigación: puerta del bloque 4 corre la suite e2e completa.
5. **"El hint de una línea no basta y el usuario no sabe qué le falta a la contraseña"** — Likelihood: Baja | Impact: Media. El checklist aparece al primer carácter, así que la guía completa llega justo al teclear. Mitigación: el test de registro cubre el flujo (teclear → checklist visible).

**Inversión:** ¿qué garantizaría el fracaso? (a) tocar los tokens de la ola 7 — prohibido en las decisiones, ninguna decisión los modifica; (b) arreglar "de oído" el bug 2 sin el dato medido — corregido con la evidencia H7; (c) cambiar el contrato o el backend — D8 usa solo endpoints existentes. Ninguna condición existe.

## 6. No verificado por este agente

- Revisión visual de capturas (este modelo no admite entrada de imagen; la re-medición y capturas de la fase 2 quedan para el humano o un agente con visión).
- Safari/Firefox, zoom 200%, dispositivo táctil real (mismo alcance que la ola 7).
- Qué hace `--color-bar-fill` en `AppLayout.module.css:104` si se decide retirarlo del todo: D1 no lo retira, solo deja de usarlo en el search.
- Comportamiento del checklist de contraseña con lectores de pantalla al aparecer/desaparecer (el `aria-live` ya existe; el `aria-describedby` condicional lo cubre).
