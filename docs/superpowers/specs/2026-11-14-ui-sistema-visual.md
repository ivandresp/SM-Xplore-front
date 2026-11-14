# Sistema visual y validación — dirección "De mar a páramo"

Fecha: 2026-11-14. Rama: `feat/ui-sistema-visual`. Alcance: fase A del encargo
(espina dorsal). Los 5 lotes de superficie (B1–B5) consumen lo que aquí se define.

Orden de autoridad: instrucción del humano > `docs/agents/prompt-senior.md` >
`AGENTS.md` > este documento.

## 1. Línea base medida (antes)

Capturas en `docs/diseno/ola6/`, Playwright con `channel: 'chrome'`, sin backend
(el proxy de Vite devuelve 500 y las pantallas muestran su estado de error).

Rutas y anchos: `/explorar`, `/eventos`, `/login`, `/registro`, `/atractivos` ×
375/768/1280, más `/explorar` en oscuro a 1280.

| Medición | Resultado | Método |
| --- | --- | --- |
| Scroll horizontal | **0** casos en 15 combinaciones | `scrollWidth === clientWidth` |
| Peticiones por pantalla de catálogo | **3** (`zones`, `sites`/`categories`, lista) | red del navegador |
| Peticiones en `/login` y `/registro` | 0 | idem |
| Alto de `/registro` a 1280 | **1469 px** en una columna de ~544 px | `documentElement.scrollHeight` |

Contraste WCAG calculado sobre los tokens de `src/index.css` (aritmética, no a ojo):

| Par | Claro | Oscuro | Veredicto |
| --- | --- | --- | --- |
| `--color-placeholder` / fondo | **2,54:1** | 4,03:1 | Falla AA (texto normal) |
| `--color-border` / fondo | **1,24:1** | 1,40:1 | Falla 1.4.11 (límite de control, 3:1) |
| `--color-border-strong` / fondo | **1,47:1** | 1,79:1 | Falla 1.4.11 |
| `--color-muted` / superficie | **4,43:1** | 5,93:1 | Falla AA por 0,07 |
| Blanco / `--color-primary` (botón `accent`) | **4,09:1** | 5,11:1 | Falla AA (texto normal) |
| `--color-ink` / `--color-primary` | **4,02:1** | — | Falla AA: el teal no admite texto encima |
| Texto / fondo, texto suave / fondo, enlaces | 17,74 / 10,31 / 5,16 | 15,65 / 12,39 / 9,62 | AA |

Consecuencia de diseño, no de gusto: **`--color-primary` (`#0e8c8a`) no puede ser
fondo de texto**. No admite ni blanco (4,09:1) ni tinta (4,02:1) a 0,95 rem. Se
reserva para enlaces, reglas e iconos. El relleno teal que sí admite texto es el
token existente `--color-primary-hover` `#0b7472`: blanco encima da 5,59:1.
Así el arreglo del botón `accent` es de una línea y no toca sus 29 consumidores.

## 2. Dirección

**Idea.** Santa Marta es el único sitio donde se ve un nevado desde un arrecife:
0 m a 5.700 m en 42 km. La interfaz se ordena por esa vertical: dato abajo (mar),
superficie arriba (páramo), y una sola cosa memorable que lo representa.

**Paleta nombrada** (0 hex nuevos; todo sale de los tokens existentes).

| Nombre | Token | Hex | Uso |
| --- | --- | --- | --- |
| mar | `--color-ink` | `#12212b` | texto fuerte, botón primario, barra |
| arrecife | `--color-primary` | `#0e8c8a` | enlaces, reglas, iconos; **nunca relleno con texto** |
| atardecer | `--color-accent-warm` | `#f47c5a` | un solo uso por vista: regla de 2 px o marca de dato |
| bruma | `--color-surface` | `#f4f5f7` | superficie de panel y filtros |
| cal | `--color-bg` | `#ffffff` | lienzo |
| roca | `--color-muted-strong` | `#4b5563` | dato secundario, siempre sobre cal o bruma |

`atardecer` no puede ser texto sobre blanco (2,67:1). Solo relleno con tinta
encima (6,16:1) o trazo.

**Tipografía por rol.** Se retira `DM Serif Display` del payload: no tenía rol y
era la mitad del parecido con una landing generada.

| Rol | Fuente | Tamaño / peso | Uso |
| --- | --- | --- | --- |
| display | Manrope | `clamp(1.75rem, 3.2vw, 2.5rem)` / 800, tracking −0,02em | título de página |
| heading | Manrope | 1,125–1,375rem / 700 | sección y tarjeta |
| body | Inter | 0,95–1rem / 400–500, interlínea 1,55 | todo el texto |
| eyebrow | Manrope | 0,6875rem / 700, versalitas, tracking 0,14em | etiqueta sobre un bloque |
| dato | `ui-monospace` del sistema | 0,8125rem / 500, `tabular-nums` | precio, fecha, coordenadas, contador |

Dos familias descargadas en vez de tres (`index.html`).

**Espaciado.** Escala de 8 pasos: 4, 8, 12, 16, 24, 32, 48, 64
(`--space-1` … `--space-8`). Hoy no existe ninguna escala: cada hoja inventa
`0.35rem`, `0.9rem`, `1.15rem`.

**Radios: dos, en uso real.**

- `--radius-data: 4px` — chip, badge, input, botón pequeño.
- `--radius-surface: 14px` — tarjeta, panel, diálogo.

`--radius-sm|md|lg|xl` quedan como alias de esos dos para no romper 50 archivos en
el mismo commit; se migran en los lotes B.

**Firma: el perfil de la Sierra.** Un SVG de una sola traza (~1 kB) con el perfil
real de la ladera, rotulado solo en los extremos (`0 m` bahía, `5.700 m` Pico
Cristóbal Colón) para no inventar cotas intermedias. Se usa **una vez por
página** en tres sitios y en ningún otro:

1. esqueleto de carga: la traza se dibuja mientras llegan los datos;
2. divisor entre la cabecera y el contenido de una ficha;
3. estado vacío: invita a filtrar en vez de decir "no hay datos".

Con `prefers-reduced-motion: reduce` la traza aparece completa, sin animación.
No se repite en tarjetas: repetida sería el adorno que venimos a quitar.

**Eyebrow de coordenadas.** `11°14′N · 74°12′W` en mono, solo en páginas
públicas. Es un dato verdadero y suficiente para que la cabecera no parezca de
cualquier ciudad.

**Movimiento.** Transiciones de 120 ms sobre `background-color`, `border-color`,
`color` y `transform`. `:active` = `translateY(1px)` + un escalón más oscuro.
Prohibido animar `width`, `height`, `top`, `left` (`transition: all` ya está en 0).

## 3. Jerarquía de botones

Una sola primaria por vista, y es **mar relleno**. El resto:

| Variante | Relleno | Texto | Cuándo |
| --- | --- | --- | --- |
| `primary` | mar | blanco (16,43:1) | la acción que cierra la tarea |
| `outline` | transparente, borde `--color-field-border` | mar | acciones secundarias |
| `quiet` | ninguno | arrecife | acción terciaria dentro de una fila |
| `danger` | `--color-danger-text` | blanco | solo destructivo, con confirmación |

`accent` se queda (29 usos): su relleno pasa de `--color-primary` 4,09:1 a
`--color-primary-hover` 5,59:1 con blanco encima. No se renombra la API para no
tocar 29 llamadas por un cambio de color.

Estados obligatorios en todos: `:hover`, `:active`, `:focus-visible`,
`:disabled` con motivo visible, y `loading` con `aria-busy` + bloqueo de doble
submit.

## 4. Reglas duras

- Ningún hex fuera de `src/index.css` (hoy hay 25 en CSS Modules; objetivo 0).
- Todo texto sobre superficie cumple 4,5:1 en claro y oscuro; todo límite de
  control cumple 3:1.
- `--color-primary` no es fondo de texto; el teal con texto encima es
  `--color-primary-hover` (5,59:1 con blanco).
- Un solo nivel de sombra (`--shadow-card`). La jerarquía la da el espacio.
- Nada de emoji como icono ni de dos familias de iconos.

## 5. Los tres looks por defecto, descartados

| Look | Por qué no |
| --- | --- |
| Crema `#F4F1EA` + serif de alto contraste + terracota | Es el look que ya roza la app (serif + blanco cálido). Se elimina el serif y el lienzo se queda blanco frío. |
| Casi negro + acento ácido | El modo oscuro ya existe y no necesita un acento ácido para tener carácter; el acento es coral y tiene un solo uso. |
| Broadsheet de reglas de pelo y radio 0 | Se conservan radios de 4 y 14 px y color; la densidad no es el problema, la falta de jerarquía sí. |

## 6. Recorte explícito (lo que NO se hace en A)

- No se añade librería de UI, iconos, animación ni formularios.
- No se añade selector de tema: el oscuro sigue por `prefers-color-scheme`.
- No se reescribe ninguna página en A; solo primitivas y tokens.
- No se toca `src/services/**` ni `src/types/**`.
- No se migran los 4 radios en 50 archivos: se hace por lote, en B.
- No se toca el calendario nativo (decisión ya tomada en el prompt senior §8 B2).

## 7. Criterio de aceptación de A (medible)

1. `npm run typecheck && npm run lint && npm test && npm run build` verde.
2. `npm run audit:visual` existe y su salida es: 0 hex fuera de `index.css`,
   0 `transition: all`, 0 transiciones sobre `width|height|top|left`,
   0 hojas con `:hover` y sin `:active`, 0 pares de contraste por debajo de AA.
3. `Button` tiene `:active`, `loading` con `aria-busy` y una sola variante
   rellena; el test falla si se revierte cualquiera de las tres.
4. `Field`/`SelectField` marcan `required`, aceptan `error` y el foco va al
   primer campo inválido; el resumen del formulario es el único `role="alert"`.
5. Capturas 375/768/1280 antes (`docs/diseno/ola6/`) y después
   (`docs/diseno/ola6-despues/`).
6. Bundle: se reporta el tamaño por chunk antes y después; retirar una familia
   tipográfica no puede aumentar el JS.
