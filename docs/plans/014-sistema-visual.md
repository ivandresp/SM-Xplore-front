# Meta — sistema visual y validación (ola 6)

Abierta: 2026-11-14. Dueño: orquestador-senior. Rama de la espina: `feat/ui-sistema-visual`.

## Meta

Que los tres problemas del encargo —aspecto genérico, botones sin estados, formularios sin
validación— estén corregidos en toda la app, medidos con `npm run audit:visual` y la suite, y que
ninguna corrección haya abierto un defecto nuevo; si lo abre, se corrige antes de cerrar.

## Criterios de cumplimiento (todos obligatorios)

| # | Criterio | Cómo se comprueba |
| --- | --- | --- |
| G1 | 0 hex fuera de `src/index.css` | `npm run audit:visual` |
| G2 | 0 hojas con `:hover` y sin `:active` | idem |
| G3 | 0 `transition: all` y 0 transiciones sobre `width/height/top/left` | idem |
| G4 | 0 pares token-fondo/token-texto por debajo de AA (4,5:1) y de 3:1 en límites de control, claro y oscuro | idem |
| G5 | `Button`: `:active`, `loading` con `aria-busy`, una primaria por vista, doble submit bloqueado | test que falla si se revierte |
| G6 | Toda página con `<form>` valida al salir del campo y al enviar; mensaje por campo con `aria-invalid` + `aria-describedby`; resumen `role="alert"` solo si hay varios; foco al primer inválido | test por formulario |
| G7 | `ProblemDetail.code` y `ProblemDetail.errors` traducidos a español con `src/utils/errors.ts`; nunca se muestra `detail` | test de mapeo |
| G8 | Dirección "De mar a páramo" aplicada: Manrope display, dos radios en uso real, escala de espaciado, perfil de la Sierra en carga/divisor/vacío, DM Serif fuera del payload | capturas 375/768/1280 |
| G9 | Sin scroll horizontal en 375/768/1280 en las superficies tocadas | Playwright `scrollWidth === clientWidth` |
| G10 | `npm run typecheck && npm run lint && npm test && npm run build` verde; suite ≥ 409 casos | comando |
| G11 | `npm run test:e2e` verde en los formularios tocados | comando |
| G12 | Cada lote en su rama, con PR abierto y evidencia; nada en `develop` sin review | `gh pr list` |

## Regresión

Si un criterio deja de cumplirse por un cambio posterior, se considera defecto abierto: se corrige
en la misma rama y se vuelve a medir. Un PR abierto no cierra la meta.

## Estado

| Bloque | Estado |
| --- | --- |
| A1 auditoría + dirección | hecho (`014b356`) |
| A2 tokens | hecho (`b634676`) |
| A3 Button | hecho (`c473b7c`) |
| A4 campos y errores | hecho (`160b644`, corregido en `e18e74f`) |
| A5 chip/badge/esqueleto/vacío | hecho (`8e4a5fc`) |
| A6 `audit:visual` | hecho (`427e3d5`, `8cb8399`) |
| B1–B5 | hechos: #43, #44, #45, #46, #47 (más #42, el hook de validación) |
| C auditorías | pendiente: segundo auditor independiente en B1 y B3 |
| D puerta y PR | hecha por lote: checks verdes y merge a `develop` |

## Medición de A (antes → después)

| Métrica | Antes | Después |
| --- | --- | --- |
| Hex fuera de `index.css` | 25 | **0** |
| Hojas con `:hover` y sin `:active` | 17 | **9** (todas de `src/pages/**`, son de B) |
| Pares de contraste por debajo de AA | 6 | **0** |
| `transition: all` / transiciones de layout | 0 / 0 | 0 / 0 |
| Tests | 409 | **418** |
| Familias tipográficas descargadas | 3 | **2** |
| Scroll horizontal (5 rutas × 3 anchos) | 0 | **0** |
| Bundle `index` | 260,00 kB raw | 267,31 kB raw / 83,48 kB gzip |

El script de auditoría sigue en rojo por esas 9 hojas de página: cada lote B cierra las suyas y la
puerta global exige 0.

## Plan de B (ejecutado)

Ningún lote puede nacer antes: `develop` es la base y A necesita review (§4.1, §6.1). Orden:

| Ola | Lotes | Rama | Cierra |
| --- | --- | --- | --- |
| 1 | B1 + B3 | `feat/ui-b1-identidad`, `feat/ui-b3-operacion` | `auth`, `onboarding`, `profile` / `reservations`, `reports`, `registrations` |
| 2 | B2 + B4 | `feat/ui-b2-catalogo`, `feat/ui-b4-gestoras` | `catalog`, `events` / `provider`, `guide`, `zones` |
| 3 | B5 | `feat/ui-b5-resto` | `admin`, `itinerary`, `recommendations`, `layouts` |

Cada lote arranca con `git fetch origin && git checkout -b feat/ui-bN origin/develop` y consume:

- `Field`/`SelectField` (`error`, `required`), `focusFirstInvalid`, `summaryOf`,
  `fieldErrorsFrom` (`src/utils/formErrors.ts`), `Button loading`, `SierraProfile`.
- Su criterio de cierre: `npm run audit:visual` sin hallazgos en sus hojas, formularios con
  validación en vivo + resumen + foco, y tests del lote en verde.
- Segundo auditor independiente en B1 y B3 antes de pedir review.

Trabajo que ningún lote hereda y hay que asignar explícitamente:

- `reports` (B3): quitar latitud/longitud del formulario y usar `navigator.geolocation` (problema 9).
- `catalog`/`events` (B2): el contador no debe decir «0 resultados» cuando la carga falló
  (`ExplorePage.tsx:257,261`, `EventListPage.tsx:275,279`, `SiteListPage.tsx:181,185`). Hecho en #44.

## Pendiente al cerrar la ola

`npm run audit:visual` está en 0 y la suite en 422. Lo que queda no es mecánico, es trabajo de
formulario página a página, con el mismo patrón que ya usan `LoginPage`, `ResetPasswordPage`,
`ReportFormPage` y `RegisterPage` (`useFormValidation` + `error` en `Field` + `name` en todos los
campos, que es lo que permite el foco):

| Formulario | Dónde | Qué falta |
| --- | --- | --- |
| Alta de usuario (admin) | `admin/CreateUserPage.tsx:113` | errores por campo y resumen |
| Alta/edición de evento | `events/EventFormPage.tsx:190` | idem |
| Alta/edición de actividad | `guide/ActivityFormPage.tsx:159` | idem |
| Gestión de actividad | `guide/ActivityManagePage.tsx:168` | idem |
| Onboarding | `onboarding/OnboardingPage.tsx:334` | hoy valida por bloque, no por campo |
| Mi perfil | `profile/MyProfilePage.tsx:182` | errores por campo (nombre, teléfono) |
| Alta/edición de servicio | `provider/ServiceFormPage.tsx:184` | idem |
| Alta/edición de zona | `zones/ZoneFormPage.tsx:349` | idem |

Segundo auditor independiente de B1 y B3: pendiente. `axe` sigue sustituido por Lighthouse de
accesibilidad (decisión anotada en el PR #41).
