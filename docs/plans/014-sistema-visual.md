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
| B1–B5 | bloqueados por la review de A (§4.1) |
| C auditorías | pendientes |
| D puerta y PR | A en PR; B–D pendientes |

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
