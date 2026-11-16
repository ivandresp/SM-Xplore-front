# Plan 015 — Sistema visual, ola 7 (`docs/plans/015-sistema-visual-ola7.md`)

> Persistido el 2026-11-15; ejecutado bloque a bloque en la rama `feat/sistema-visual-ola7`.
> Nota de autoridad: la regla de solo-lectura de `Mis_GitProyectos/AGENTS.md` aplica al bot de WhatsApp; el humano autoriza escribir en `SM-Xplore-front` (rama + este plan). Conflicto resuelto y anotado aquí.
> Sustitución declarada (directiva `impeccable` AUTONOMY_DIRECTIVE_CHECK): no hay humano disponible para el probe interactivo; el brief del orquestador prescribe que la dirección visual la decido yo (dos líneas). Las decisiones de producto quedan marcadas como propuesta + coste + alternativa.

## Decisiones del humano (2026-11-15, por encima del plan)

1. `--radius-control: 10px` para todo control de texto y acción. Superficies siguen en 14px. Píldora solo para chips, badges y contadores.
2. `--radius-media: 12px`. Si se deja en 10 se duplica con control y repite el defecto H1; alternativa válida: eliminar `--radius-media` y usar `--radius-control` en imágenes.
3. Toggle de tema: se implementa tal cual el Bloque 2 (claro/oscuro/sistema, persistido, sin parpadeo).

## Skills

- **Usadas:** `impeccable` (context vía launcher: NO_PRODUCT_MD → refinamiento sobre implementación incumbente, SCOPED_EXISTING_ALLOWED), `ui-ux-pro-max` (búsquedas: `--design-system` tourism → "Aurora UI" descartado por inadecuado; `--domain color` teal/coral; `--domain typography` → resultados Noto Sans KR/TH/HEB fuera de objetivo; `--domain ux` "theme toggle" → 0 resultados, reintentado "dark mode contrast" → pautas genéricas 4.5:1; datos usados solo como referencia, pautas base de la tabla de prioridades), `brainstorming` (adaptado: decisión de dirección delegada por el brief), `writing-plans` (estructura de bloques), `browser` (cargada; sustituida por Playwright del proyecto por viewports fijos y porque este modelo no admite entrada de imagen), `the-fool` (pre-mortem del plan al cierre).
- **Descartadas:** `ponytail-review` (el brief pide una de las dos; elegí `the-fool`), `frontend-design` (solapa con `impeccable`; la dirección la fija el brief + tokens existentes), `web-design-guidelines` (el criterio a11y ya lo cubre `impeccable`; no es auditoría WIG completa), `ui-animation` (sin motion en alcance), `systematic-debugging`/`test-driven-development` (fase sin código).

## 1. Hallazgos

### 1.1 Verificados del diagnóstico (archivo:línea + medición)

| # | Hallazgo | Evidencia |
|---|---|---|
| H1 | Escala de radios inexistente: `--radius-sm|md` → 4px, `--radius-lg|xl` → 14px | `src/index.css:101-106`; medido en Chrome: todos los controles `border-radius: 4px` (login/registro/explorar, 375/768/1280) |
| H2 | 4 alturas en la misma fila de filtros de `/explorar` (768/1280): búsqueda y selects 40.2px, date 42.2px, botones 43.8px, paginación 44px | medición Playwright (Chrome sistema, dev server + backend reales); CSS: `FormField.module.css:28` (padding 0.7rem, sin altura), `SelectField.module.css:52-56` (44px solo `pointer: coarse`), `Button.module.css:133-137` (2.75rem solo `<640px`), `catalog.module.css:44-53` (padding 0.6rem 0.9rem) |
| H3 | Registro: inputs 43.4px / date 45.4px / submit 43.8px en el mismo formulario | medición Playwright `/registro` 375/768/1280 |
| H4 | Modo oscuro sin control: solo `@media (prefers-color-scheme: dark)` | `src/index.css:125-175`; grep: cero `data-theme`, cero `localStorage` de tema; sí existe `src/hooks/useLocalStorage.ts:4` reutilizable |
| H5 | Escala tipográfica evadida: ~60+ valores numéricos en 25+ hojas | grep `font-size:\s*[0-9]`: `Button.module.css:47` (1rem), `SelectField.module.css:119,130,147,152,158`, `TopBar.module.css` (12), `catalog.module.css` (16), `SierraProfile.module.css:23` (**6px**), etc.; **medido en `/explorar`: 10 tamaños distintos** (13.12→40px), en `/login`: 6 |
| H6 | `--color-accent-warm` casi muerto: 1 uso en toda la app | grep: `src/index.css:11` (definición) y `MapPreview.module.css:43` (marcador). Medido en `/explorar`: **0 elementos** con color cálido |
| H7 | Cero hex fuera de `index.css` (línea base ya sana) | `npm run audit:visual` → "Sin hallazgos: 42 hojas, 18 pares" + grep `.tsx` sin matches |

### 1.2 Hallazgos nuevos (no estaban en el diagnóstico)

| # | Hallazgo | Evidencia |
|---|---|---|
| H8 | **Contraste medido que falla** (no cubierto por `audit-visual`): claro `--color-link` sobre `--color-primary-soft` = **4.45:1** (AA 4.5) — se usa en `Chip.module.css:64-66` (chip accent hover) y `Button.module.css:98-100` (outlineAccent hover); blanco sobre `--color-primary` = **4.09:1**; oscuro `--color-field-border` sobre `--color-surface-alt` = **2.97:1** (WCAG 1.4.11 pide 3:1) | cálculo WCAG propio (node) sobre tokens de `index.css` |
| H9 | **Buscador global del TopBar < 44px en móvil**: input nativo de 21px dentro de píldora ~42px | medición 375px (`TopBar.tsx:155-171`, `TopBar.module.css:22-30`) |
| H10 | **Estados interactivos incompletos**: `SelectField.module.css`, `SearchInput.module.css` y `FormField.module.css` no tienen `:hover` ni `:active` (solo `:focus-visible`) | scan por hoja: hover=False en las tres; AGENTS.md §Estilos lo exige; `audit-visual` no lo detecta (solo flaggea hover sin active) |
| H11 | **Dos formas para el mismo componente de búsqueda**: `SearchInput` píldora por defecto (`SearchInput.module.css:5` 999px) pero las páginas de catálogo la sobreescriben vía `className` (`SearchInput.tsx:22`) a rectángulo 4px (`catalog.module.css:48`) | Píldoras sueltas: sort `catalog.module.css:82`, buscador TopBar `TopBar.module.css:28`, `DashboardPage.module.css:246`, `FilterBar.module.css:106`, `recommendations.module.css:57`, `AppLayout.module.css:101,114`, `ImageUploader.module.css:151` |
| H12 | **Monotonía medida**: en `/explorar` claro hay 8 fondos distintos pero el único color de marca es la barra (1 elemento teal) + botón ink; 26 textos en teal de enlace, 0 cálidos | histograma de colores computados (Playwright) |
| H13 | Jerarquía: 5-6 pesos (400/500/600/700/800) y 6-10 tamaños por página; `PageHeader` con 2rem/2.5rem duplicando `--text-display` (`PageHeader.module.css:50,59`) | histogramas + grep |

### 1.3 Línea base verde (para el antes/después)

- `npm run audit:visual` → exit 0 (42 hojas, 18 pares) · `overflowX: 0` en 375/768/1280 en las 3 rutas medidas · backend UP (healthz 200) · 60 ficheros de test vitest · 14 specs e2e · alturas y tamaños de H2/H3/H5/H9 como "antes".

## 2. Dirección visual (dos líneas)

1. **Refinamiento, no rediseño:** se preserva la identidad teal + ink (`--color-primary`, `--color-action`); la paleta se completa con el coral `--color-accent-warm` dándole roles reales (CTA "Reservar", favoritos, destacados, chips activos de filtro) en claro y oscuro con contraste AA medido, y la escala tipográfica se cierra a tokens (nada de `font-size` numérico fuera de `index.css`).
2. **Forma única por lenguaje:** rectángulo de radio `--radius-control: 10px` para todo control de texto/acción (medios internos a `--radius-media: 12px`), píldora solo para chips/badges/contadores, superficies a 14px; altura por token (`sm 2rem / md 2.75rem / lg 3.25rem`) con **44px como altura estándar de fila** (misma fila = misma altura, en todo viewport).

- **Decisión de forma (una línea):** `SearchInput` deja de ser píldora porque una app Operate alinea los campos de texto con los demás controles del formulario; la píldora es lenguaje de etiqueta (chip/badge), no de input — los únicos círculos que quedan son avatares y la píldora del buscador global desaparece también (TopBar) en favor del rectángulo.
- **Decisión de producto (propuesta, no asumida por el implementador):** toggle de tema con 3 estados (claro/oscuro/sistema) en el `TopBar` (cubre ambos layouts: `PublicLayout` y `AppLayout`). Coste: ~150 líneas (provider + hook + botón + CSS + script inline); alternativa: solo 2 estados sin "sistema" (menos código, pierde el modo que ya existe hoy); sin dependencias nuevas. No cambia navegación ni API.

## 3. Cambios por archivo — bloques verificables

### Bloque 1 — Tokens y tema en `src/index.css` (peligroso, va primero)

**Archivos:** `src/index.css`; **Test/extensión:** `scripts/audit-visual.mjs`.

1. Radios reales: `--radius-control: 10px` (nuevo), `--radius-media: 12px` (nuevo), `--radius-surface: 14px`, `--radius-pill: 999px`; alias de migración: `--radius-sm`/`--radius-data` → control, `--radius-md` → media, `--radius-lg`/`--radius-xl` → surface (sustituye `:101-106`).
2. Alturas: `--control-h-sm: 2rem`, `--control-h-md: 2.75rem`, `--control-h-lg: 3.25rem` en `:root` (sección espaciado).
3. Escala tipográfica cerrada: conserva `display/heading/title/body/small/eyebrow` y añade los pasos que hoy se cuelan como números: `--text-micro: 0.375rem` (etiqueta SVG de `SierraProfile.module.css:23`), `--text-label: 0.75rem`, `--text-meta: 0.8125rem`, `--text-sub: 1.125rem`, `--text-lead: 1.25rem`, `--text-hero: 1.5rem`, `--text-jumbo: 2rem`. Nada de `font-size` numérico fuera de aquí al final de la ola.
4. Tema con control: bloque oscuro actual (`:125-175`) se reestructura a `:root[data-theme='dark'] { … }` + fallback `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { … } }` (los mismos valores); `color-scheme` pasa a ser por tema (`light` en claro, `dark` en oscuro) en vez del `light dark` de `:109`. `data-theme` lo fija el script inline de `index.html` (Bloque 2) antes del primer pintado; "sistema" = sin atributo = media query.
5. Correcciones de contraste (H8): oscurecer `--color-link` claro un paso y aclarar `--color-field-border` oscuro un paso (el implementador itera candidatos, p. ej. `#086e6c` / `#6e7d8a`, hasta que el script los dé por buenos); añadir tokens de coral con sus variantes hover/active y `--color-on-warm` en ambos temas.
6. `scripts/audit-visual.mjs`: añadir (a) flag `font-size` numérico fuera de `index.css`, (b) los pares nuevos de H8 y los del coral a la tabla `PAIRS`. **Escribir primero el script (puerta roja) y migrar hasta exit 0** — es el test del bloque.

**Puerta:** `npm run audit:visual` → exit 0 (con script extendido) + `npm run typecheck && npm run lint && npm test`.

### Bloque 2 — Control de tema (provider + toggle + sin parpadeo)

**Archivos:** crear `src/context/ThemeProvider.tsx` (+ `useTheme`), `src/components/ThemeToggle/{ThemeToggle.tsx, ThemeToggle.module.css, index.ts}`; modificar `index.html`, `src/App.tsx` (envolver provider), `src/components/TopBar/TopBar.tsx` (render `<ThemeToggle>` antes del slot `right`, línea ~438) y `TopBar.module.css` (variante `.dark` del toggle, patrón de `:411`).

- Estado `'light' | 'dark' | 'system'`, persistido en `localStorage` (`sm-xplore:theme`), default `system`. `matchMedia` con guard `typeof window.matchMedia === 'function'` (patrón `TopBar.tsx:303`) para el icono efectivo; en jsdom degrada a `light` — **ningún test existente necesita envolver provider** (context con default seguro).
- `index.html`: script inline en `<head>` (antes del CSS de la app): lee `sm-xplore:theme`, si es `light|dark` fija `document.documentElement.dataset.theme`; `try/catch` por si `localStorage` lanza. Sin atributo = sistema = media query → **cero parpadeo**.
- Toggle: botón de ciclo con icono y `aria-label` dinámico ("Tema: claro/oscuro/sistema"); 44px; variante para barra navy. El modo se ve en el icono y en el `title`. Sin sync entre pestañas (no-objetivo declarado).
- Tests nuevos (vitest): persistencia (set → reload simulado), default `system`, degradación sin `matchMedia`, y e2e (`e2e/tema.spec.ts`): toggle → `data-theme` cambia → recarga → persiste → `emulateMedia({ colorScheme: 'dark' })` con `system` sigue a la media query; assert de color de fondo para probar "sin parpadeo" (primer frame con `data-theme` ya aplicado).

**Puerta:** tests nuevos en verde + `login-sin-reflujo.spec.ts` intacto (el toggle no mueve el botón) + `responsive.spec.ts` verde a 320/375/768/1280 (sin overflow con el nuevo botón).

### Bloque 3 — Alturas y radios en controles (el "cuadradísimo" y las filas)

**Archivos:** `Button.module.css`, `FormField.module.css`, `SelectField.module.css`, `SearchInput.module.css`, `TopBar.module.css`, `catalog.module.css`, `FilterBar.module.css`, `Chip.module.css`, `StatusBadge.module.css`, `Pagination.module.css`, `auth.module.css`, `DataTable.module.css` (solo `:26/:44` tipografía si procede).

- `Button`: `sm/md/lg` → `height: var(--control-h-sm|md|lg)` (sustituye paddings verticales y `:133-137`; conserva el bump `pointer: coarse` solo para `sm`); `.lg` usa `--text-body`+1 → token (mata `Button.module.css:47`).
- `FormField.module.css:26-35`: `height: var(--control-h-md)`, padding vertical 0 (texto centra solo).
- `SelectField.module.css:41-56`: `height: var(--control-h-md)`, elimina la media query de 44px (ahora es siempre 44) — `touch-targets.spec.ts:60-63` sigue verde por construcción.
- `SearchInput.module.css:1-10`: radio `--radius-control`, `height: var(--control-h-md)`; se elimina el override de `catalog.module.css:44-53` (`.control`) y `:79-87` (`.sort` píldora) para que la página use el componente tal cual (y el date del filtro queda en 44). Quedan como píldoras solo `Chip`, `StatusBadge` y los contadores (`DashboardPage.module.css:246`, `recommendations.module.css:57`, `FilterBar.module.css:106` si es chip de "quitar filtro", `AppLayout.module.css:101,114` si son contadores de badge; si son controles, rectángulo — se decide viendo el JSX, criterio: **control = rectángulo, etiqueta = píldora**).
- `TopBar.module.css:22-30`: el buscador global pasa a rectángulo `height: var(--control-h-md)` (mata H9: target 44px real).
- `Pagination.module.css:12`: `height: 2.75rem` → token.

**Puerta:** re-medición Playwright de las 3 rutas × 3 viewports: **una sola altura (44px) en cada fila de controles** y `overflowX: 0`; `touch-targets.spec.ts`, `combobox-sin-salto.spec.ts`, `catalog-filters.spec.ts`, `b6-reportes.spec.ts` en verde; capturas nuevas (Bloque 6).

### Bloque 4 — Cerrar la escala tipográfica (mecánico, sin criterio)

**Archivos:** ~25 hojas con `font-size` numérico (lista completa del grep H5: `TopBar`, `catalog`, `auth`, `DataTable`, `PageHeader`, `Avatar`, `Placeholder`, `FilterBar`, `MapPreview`, `ServiceCard`, `SiteCard`, `Pagination`, `ImageUploader`, `zones`, `guide`, `profile`, `events`, `recommendations`, `onboarding`, `SierraProfile`, `StateMessage`, `Footer`, etc.).

- Regla de mapeo 1:1 al token más cercano de la escala cerrada (Bloque 1.3): `0.95→body`, `0.9→small`+1 paso nuevo si se usa como secundario (`--text-meta` 0.8125 o `--text-label`), `1.15/1.25→lead`, `2/2.5→jumbo/hero` en `PageHeader.module.css:50,59`, `6px→--text-micro` en `SierraProfile.module.css:23`. Donde dos valores vecinos (0.82 y 0.85) conviven en el mismo contexto, colapsar a uno y anotarlo en el commit.
- **Sin cambios de diseño** en este bloque: solo token por número; las diferencias ≤2% se aceptan.

**Puerta:** `grep -r "font-size:\s*[0-9]" src --include="*.css" | grep -v index.css` → **0 matches**; `npm run audit:visual` exit 0; `npm run build`; capturas.

### Bloque 5 — Estados interactivos y color estratégico (lo que se "siente" diseñado)

**Archivos:** `SelectField.module.css`, `SearchInput.module.css`, `FormField.module.css` (añadir `:hover` + `:active`: borde `--color-border-strong` en hover, fondo `--color-surface` en active — mismo lenguaje que `Chip.module.css:28-35`); usos de `--color-accent-warm` en los CTAs "Reservar"/favorito de fichas (`pages/catalog`, `reservations`, `ActivityCard`) — solo donde el JSX ya tenga ese rol; nada de pintar por pintar.

**Puerta:** scan por hoja: todo control interactivo con hover+active+focus-visible; contraste de pares coral vía `audit-visual` exit 0; `npm run typecheck && npm run lint && npm test && npm run build` (puerta completa de repo).

### Bloque 6 — Evidencia final

- `$env:CAPTURAS='1'; npm run test:e2e` regenera `docs/diseno/ola3/*` y `docs/diseno/ola4/*` (ambos specs están gated, `screenshots.spec.ts:42-45`, `ola4-capturas.spec.ts:38-41`); añadir carpeta `docs/diseno/ola7/` con las capturas 375/768/1280 claro/oscuro de login, registro, explorar y un panel (reutilizando el patrón de esos specs).
- Rama `feat/sistema-visual-ola7` desde `origin/develop`, commits por bloque (Conventional Commits en español), PR con checks verdes + review de otra persona (§6.1 de `docs/agents/prompt-senior.md`).

## 4. Riesgos de regresión (test que puede romperse y por qué)

| Test / puerta | Por qué puede romper | Mitigación |
|---|---|---|
| `e2e/touch-targets.spec.ts:58-78` | exige chip/combobox/filtro ≥44px con `hasTouch`; si el implementador usa `height` en vez de `min-height` y un contenido lo estira, o si el chip píldora pierde el bump coarse | conservar bump `pointer: coarse` en Chip; verificar en el bloque 3 |
| `e2e/responsive.spec.ts:20-34` | el toggle añade un elemento al `TopBar`; a 320px podría forzar wrap distinto o desborde | `flex-wrap` ya existe (`TopBar.module.css:4`); toggle compacto; la puerta del bloque 2 lo corre |
| `e2e/login-sin-reflujo.spec.ts:44-46` | mide que el botón no se mueva al aparecer el error; el hueco reservado es `.messages` (`auth.module.css:102-108`) — si alguien lo toca o cambia el alto del submit se mueve `y` | no tocar `.messages`; submit pasa a `--control-h-lg` (51.2→52px no cambia `y`) |
| `e2e/combobox-sin-salto.spec.ts` / `catalog-filters.spec.ts` / `b6-reportes.spec.ts` | el `SelectField` pierde padding vertical y gana `height`; cualquier mal cálculo cambia el layout al abrir el listbox o al filtrar | puerta del bloque 3 los corre completos |
| 60 ficheros vitest | si `ThemeProvider` consume `matchMedia`/`localStorage` sin guard y algún test renderiza `TopBar`/`AppLayout` | context con default seguro + guard `typeof` (patrón `TopBar.tsx:303`); `src/test/setup.ts` no necesita cambios |
| `screenshots.spec.ts` / `ola4-capturas.spec.ts` | no corren en CI (skip si `CAPTURAS!=='1'`) pero sus PNG/JPG de `docs/diseno/` quedarán obsoletos vs la nueva UI | regenerarlas en el bloque 6 como parte del mismo PR |
| `audit-visual` extendido | el check nuevo de `font-size` arranca en rojo con ~60 violaciones | el script se extiende en el bloque 1 y solo queda verde al cerrar el bloque 4 (rojo-verde intencional, igual que un test) |

**Riesgo visual asumido (documentado):** el escritorio pasa de controles de ~40px a 44px (densidad ligeramente menor) — es el precio de la regla "misma fila, misma altura" que pidió el encargo; la alternativa (40px en escritorio) es exactamente el estado actual con 4 alturas por fila.

**Aceptación global (medible):** (a) una única altura por fila de controles en las 3 rutas × 3 viewports; (b) `grep` 0 hex y 0 `font-size` numérico fuera de `index.css`; (c) `audit-visual` exit 0 con los pares nuevos; (d) tema persistido sin parpadeo con `prefers-color-scheme` como sistema; (e) e2e + vitest + build verdes.

**No verificado por este agente:** revisión visual de capturas (este modelo no admite entrada de imagen — las 18 capturas base están en `%TEMP%\opencode\sm-*.png` para el humano/fase 2), Safari/Firefox, zoom 200%, dispositivo táctil real, y cómo se ve el estado vacío del catálogo con 0 resultados.
