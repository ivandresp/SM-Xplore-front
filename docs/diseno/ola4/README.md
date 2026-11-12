# Ola 4 — Responsive, menú móvil y tablas (bloque B6)

Capturas **antes/después** de la aplicación a 375, 768 y 1280 px, en claro y
oscuro, más una pasada a **zoom 200 %** sobre 1280 px.

- `antes/`: commit `6723b41` (B3 + B8a + B8b + B2), estado previo a este bloque.
- `despues/`: rama `feat/b6-responsive`.
- Nombres: `<pantalla>-<ancho>-<tema>.png`; `...-zoom200-light.png` para el
  zoom; `...-menu-abierto.png` y `...-filtros-abiertos.png` para los estados
  desplegables (sin `-tema`, se capturan en claro salvo el estado del menú).
- `antes-reporte.json` y `despues-reporte.json`: medición cruda de cada
  combinación (scrollWidth, clientWidth, elementos fuera del viewport y
  regiones con scroll interno).

## Método

Playwright con el Chrome del sistema, Vite en el puerto 5185 y sesión de
administración creada por API (`admin@smxplore.local`). Por cada ruta y ancho:

1. `document.documentElement.scrollWidth` frente a `clientWidth`.
2. Recorrido del DOM para listar los elementos cuyo rectángulo sale del
   viewport, ignorando los que viven dentro de un contenedor con
   `overflow-x: auto` (las tablas).
3. Repetición con el menú móvil abierto y con los filtros desplegados.

Zoom 200 %: viewport CSS de 640 px con `deviceScaleFactor: 2` (PNG de 1280 px).
Es el mismo reflow que un 200 % real sobre una ventana de 1280 px, porque el
zoom de Chrome reduce el viewport CSS a la mitad.

## Cobertura

| Pantalla | Ruta | Antes | Después |
| --- | --- | --- | --- |
| Catálogo | `/explorar` | sí | sí |
| Login | `/login` | sí | sí |
| Registro | `/registro` | sí | sí |
| Eventos | `/eventos` | sí | sí |
| Panel | `/app` | sí | sí |
| Usuarios | `/app/usuarios` | sí | sí |
| Zonas | `/app/zonas` | sí | sí |
| Gestión de eventos | `/app/eventos` | sí | sí |
| Actividades del guía | `/app/mis-actividades` | sí | sí |
| Servicios de la prestadora | `/app/mis-servicios` | sí | sí |
| Alta de evento | `/app/eventos/nuevo` | no | sí |
| Alta de servicio | `/app/mis-servicios/nuevo` | no | sí |
| Alta de zona | `/app/zonas/nueva` | no | sí |
| Alta de actividad | `/app/mis-actividades/nueva` | no | sí |

Los cuatro formularios no existían en el set previo (se añadieron al medir);
su layout ya era de una columna por debajo de 620 px y este bloque no lo
cambia, se capturan como evidencia del criterio 3.

## Hallazgos

| Hallazgo | Evidencia | Severidad |
| --- | --- | --- |
| Por debajo de 900 px no había navegación: los enlaces se ocultaban y no existía alternativa (ni menú ni acceso a las secciones). | `6723b41:src/components/TopBar/TopBar.module.css:217-228`; `antes/explorar-375-light.png` (solo logo y avatar); `despues/explorar-375-menu-abierto.png` | Crítica |
| La barra lateral del panel se apilaba en flujo y empujaba el contenido ~470 px hacia abajo; a zoom 200 % la navegación ocupaba la primera pantalla completa. | `6723b41:src/layouts/AppLayout.module.css:19-26`; `antes/app-375-light.png`; `antes/usuarios-1280-zoom200-light.png`; `despues/app-375-light.png` | Alta |
| Las tablas se aplastaban a `width: 100%`: a 375 px solo se veía la primera columna y los botones de acción se recortaban dentro de la tarjeta, sin aviso ni acceso por teclado al scroll interno. | `6723b41:src/components/DataTable/DataTable.module.css:2,9`; `antes/usuarios-375-light.png`; `antes/zonas-375-light.png` (botón «Configurar» cortado); `despues/usuarios-375-light.png` (aviso + scroll de 704 px) | Alta |
| El colapso de filtros no resumía los filtros activos: el botón decía siempre «Mostrar filtros» y el resumen solo existía como chips. | `6723b41:src/components/FilterBar/FilterBar.tsx:53`; `antes/explorar-375-light.png`; `despues/explorar-375-filtro-activo.png` («1 filtro activo», «Mostrar filtros (1)») | Media |
| Objetivos táctiles por debajo de 44 px: paginación de 38,4 px y botones `sm` de ~30 px, incluido el botón que abre los filtros. | `6723b41:src/components/Pagination/Pagination.module.css:10-11`; `6723b41:src/components/Button/Button.module.css:29-32`; `antes/usuarios-375-light.png` (paginación) | Media |
| La cabecera de pantalla mantenía el título serif de 2,5 rem y las acciones en la misma fila en móvil, comprimiendo la jerarquía. | `6723b41:src/components/PageHeader/PageHeader.module.css:53`; `antes/explorar-375-light.png`; `despues/usuarios-375-light.png` | Baja |

## Resultado medido

- Antes: 10 rutas × 3 anchos = **30 mediciones**, 0 con scroll horizontal de
  página (el desborde ya estaba contenido por `overflow-x` de la tabla, a costa
  de recortar columnas).
- Después: 12 rutas × 3 anchos × 3 estados (base, menú abierto, filtros
  abiertos) = **60 mediciones** + **12** a zoom 200 %. Todas con
  `scrollWidth === clientWidth`; 0 elementos fuera del viewport fuera de las
  regiones con scroll propio.
- Tablas: a 375 px el contenedor de `/app/usuarios` mide 341 px y la tabla
  704 px; el scroll queda dentro de la región (medido en
  `despues-reporte.json`).
- Menú móvil: botón de 44 × 44 px, `aria-expanded` false→true→false, foco al
  primer enlace al abrir, `Esc` devuelve el foco al botón, `Tab` circula dentro
  del panel y los enlaces miden 44 px de alto (verificado en navegador).
- Foco visible: `outline` sólido de 2 px con `focus-visible` al tabular
  (`despues/explorar-375-menu-foco.png`).
- Claro y oscuro: las capturas de ambos temas usan los mismos tokens; el menú
  oscuro usa blanco sobre `--color-ink` y el borde claro de la barra.

## Cambios aplicados

- `src/components/TopBar`: menú móvil real (botón 44 × 44, panel con
  `aria-expanded`/`aria-controls`, `Esc`, trampa de `Tab`, foco gestionado,
  cierre por enlace y por `popstate`); `menuLinks` permite que el panel use
  sus secciones sin duplicar la barra lateral.
- `src/layouts/AppLayout`: la barra lateral solo existe desde 900 px; sus
  secciones pasan al menú móvil. Cabecera y contenido con padding móvil.
- `src/layouts/PublicLayout`: objetivos táctiles de 44 px en avatar y enlace de
  sesión.
- `src/components/FilterBar`: resumen «N filtro(s) activo(s)» y contador en el
  botón; botón de 44 px en el ancho en que se colapsa.
- `src/components/DataTable`: región `role="region"` enfocable, aviso de
  desplazamiento solo cuando desborda, tabla con ancho mínimo legible por
  debajo de 900 px y corte de palabras largas.
- `src/components/Pagination`: botones de 44 px y fila con `flex-wrap`.
- `src/components/PageHeader`: una columna y títulos menores por debajo de
  640 px.
- `src/components/Button`: altura mínima de 44 px en móvil para `sm` y `md`.

## Residual y no cubierto

- Las tablas siguen desplazándose en horizontal **dentro de su tarjeta**; no se
  convierten en tarjetas. Es la opción de «scroll controlado» del criterio 3.
- El menú móvil tapa contenido mientras está abierto (desplegable, no cajón con
  fondo). Es intencionado: no se añaden overlays ni bloqueos de scroll.
- No se probó en Safari ni Firefox, ni con lectores de pantalla reales; la
  verificación de teclado/foco es con Chrome y pruebas de Testing Library.
- El zoom 200 % se emula con viewport CSS de 640 px (ver Método); no se accionó
  el zoom nativo del navegador.

## Regenerar

```bash
npm run dev -- --port 5185 --strictPort
node .tmp/measure.mjs despues   # script de medición temporal, no versionado
```

Las capturas versionadas se generaron con ese script; `e2e/responsive.spec.ts`
deja la comprobación permanente de scroll horizontal y menú.
