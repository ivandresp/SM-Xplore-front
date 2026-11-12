# Ola 4 — Responsive, menú móvil y tablas (bloque B6)

Capturas de estados clave después del bloque, a 375 y 1280 px, en JPEG.
Son 12 imágenes y un total de **0,91 MB** frente a las 203 PNG / 19,38 MB del
primer intento: la mitad del set eran dos copias (antes/después) de las mismas
pantallas y la copia «después» documentaba un layout que la auditoría encontró
roto (ver *Corrección tras auditoría*).

- Nombres: `<pantalla>-<ancho>-<tema>.jpg`.
- `antes-reporte.json`: medición cruda del estado previo al bloque (commit
  `6723b41`): `scrollWidth`, `clientWidth`, elementos fuera del viewport y
  regiones con scroll interno.
- `despues-reporte.json`: la misma medición sobre el primer intento del bloque.
  Se conserva como dato crudo, no como prueba de que el layout estuviera bien:
  medía solo desborde de página, y el defecto que tenía era una columna oculta.

## Método

Playwright con el Chrome del sistema, Vite en el puerto del `.env` de desarrollo
y sesión de administración creada por la interfaz (`admin@smxplore.local`).
Por cada ruta y ancho se mide:

1. `document.documentElement.scrollWidth` frente a `clientWidth`.
2. Ancho real de las dos columnas del panel (`aside` y `main`).
3. Recorrido del DOM para listar los elementos cuyo rectángulo sale del
   viewport, ignorando los que viven dentro de un contenedor con
   `overflow-x: auto` (las tablas).

Regenerar:

```bash
npm run dev                 # en otra terminal
# PowerShell:
$env:CAPTURAS='1'; npx playwright test e2e/ola4-capturas.spec.ts
```

El spec escribe en el repo, así que queda saltado salvo que `CAPTURAS=1`: la
suite normal de e2e no ensucia el árbol.

## Comprobaciones permanentes

`e2e/responsive.spec.ts` recorre `/explorar`, `/eventos`, `/servicios` y
`/atractivos` a 320, 375, 768 y 1280 px y exige `scrollWidth === clientWidth`;
además prueba el menú móvil (abre, `Esc` cierra y devuelve el foco, no aparece
en escritorio).

`e2e/panel-shell.spec.ts` cubre lo que la medición de desborde **no** ve:

- desde 900 px la barra lateral está visible, el botón de menú no, y el
  contenido conserva más del 60 % del ancho;
- por debajo de 900 px pasa lo contrario;
- cruzar el corte con el menú abierto lo cierra de verdad.

## Corrección tras auditoría

La auditoría del bloque (auditor adversario, worktree aparte, 118 mediciones)
encontró un defecto **crítico** que las capturas del primer intento no
delataban:

| Defecto | Evidencia del primer intento | Corrección |
| --- | --- | --- |
| Desde 900 px la barra lateral nunca se mostraba: el bloque `@media` quedaba antes de la regla base y, a igual especificidad, ganaba `display: none`. El panel se quedaba sin navegación y el contenido en 240 px. | `src/layouts/AppLayout.module.css:13-31` en `064a3f2` | La regla de escritorio pasa después de `.sidebar` (`src/layouts/AppLayout.module.css:23-36`) |
| El `aria-expanded` del menú se quedaba en `true` al cruzar a escritorio, con el panel oculto y el foco en `<body>`. | `src/components/TopBar/TopBar.tsx:282-289` en `064a3f2` | `matchMedia('(min-width: 900px)')` cierra el menú al cruzar (`src/components/TopBar/TopBar.tsx:44,296-315`) |
| `aria-controls` apuntaba a un id inexistente con el menú cerrado. | `src/components/TopBar/TopBar.tsx:391` | Solo se emite con el panel montado (`src/components/TopBar/TopBar.tsx:416`) |
| A 320 px `/eventos` desbordaba 10 px: la fila de acciones no bajaba de su `min-content`. | `src/components/PageHeader/PageHeader.module.css:67-71` | `max-width: 100%` en `.actions` (`src/components/PageHeader/PageHeader.module.css:79`) |
| La región de la tabla era parada de `Tab` aunque no hubiera nada que desplazar, y los `<th>` no tenían `scope`. | `src/components/DataTable/DataTable.tsx:112,118-125` | `tabIndex={scrollable ? 0 : -1}` y `scope="col"` (`src/components/DataTable/DataTable.tsx:113,121`) |

## Residual y no cubierto

- Las tablas siguen desplazándose en horizontal **dentro de su tarjeta**; no se
  convierten en tarjetas. Es la opción de «scroll controlado».
- Objetivos táctiles por debajo de 44 px que este bloque no toca: píldora de rol
  de 37 px, disparadores de `SelectField` de 40 px y chip de filtro activo de
  29 px. Todos pasan el mínimo AA de 24 px (WCAG 2.5.8); subirlos a 44 es AAA y
  cambia el alto de todos los formularios, así que queda como deuda abierta.
- El menú móvil solo es alcanzable con la página arriba: el panel no tiene
  cabecera fija. En un listado largo hay que subir para navegar. No es una
  regresión de este bloque y no se aborda aquí.
- No se probó en Safari ni Firefox, ni con lectores de pantalla reales; la
  verificación de teclado y foco es con Chrome y Testing Library.
- El zoom 200 % se emuló con viewport CSS de 640 px; no se accionó el zoom
  nativo del navegador.
- `src/pages/reports/**` queda fuera del bloque (pertenece a B4).
