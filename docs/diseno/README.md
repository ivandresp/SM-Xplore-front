# Capturas de diseño

Imágenes del bloque 4 del plan `007-ola2.md`. Todas en modo oscuro, que es el del sistema donde
se revisó el contraste. La fila «Antes» solo existe donde la captura previa se conservó; el resto
se compara contra el estado descrito en el plan.

| Fichero | Pantalla |
| --- | --- |
| `01-explorar-despues.jpeg` | `/explorar` |
| `02-dashboard-despues.jpeg` | `/app` con sesión de administración |
| `03-usuarios-despues.jpeg` | `/app/usuarios` |
| `04-eventos-despues.jpeg` | `/eventos` |

Método de revisión: captura con el navegador de la aplicación y auditoría de contraste en la
propia página (ratio real entre el color del texto y el fondo efectivo, subiendo por los ancestros,
umbral 3:1). Resultado: 0 incidencias en `/explorar`, `/eventos`, `/atractivos`, `/servicios`,
ficha de actividad y `/app/usuarios`.

## Ola 3 (2026-11-08)

Capturas generadas por `e2e/catalog-filters.spec.ts`, que además falla si el catálogo desborda
horizontalmente en cualquiera de los tres anchos.

| Fichero | Pantalla |
| --- | --- |
| `catalogo-375.png` | `/explorar` con filtros en la URL, 375 px, oscuro |
| `catalogo-768.png` | `/explorar` con filtros en la URL, 768 px, oscuro |
| `catalogo-1280.png` | `/explorar` con filtros en la URL, 1280 px, oscuro |
| `catalogo-1280-claro.png` | la misma vista en claro |

Correcciones de esta ola: la cabecera pública pasa a dos filas bajo 720 px (antes desbordaba 82 px
a 375), los avisos informativos dejan de usar el color de advertencia, el panel de reportes se
titula por lo que muestra (sin prometer un mapa) y las pantallas dejan de citar el backend.

## Capturas por rol (bloque 6 del plan 010)

Generadas por `e2e/screenshots.spec.ts` en `docs/diseno/ola3/`: cada pantalla se captura a 375,
768 y 1280 px, en claro y oscuro (seis ficheros por pantalla). La suite crea sus propias cuentas y
su propia actividad: no depende de datos sembrados a mano.

| Prefijo | Pantalla | Sesión |
| --- | --- | --- |
| `explorar-*` | `/explorar` con filtros | anónima |
| `eventos-*` | `/eventos` | anónima |
| `servicios-*` | `/servicios` | anónima |
| `atractivos-*` | `/atractivos` | anónima |
| `actividad-*` | ficha de actividad | anónima |
| `app-*` | `/app` | administración |
| `usuarios-*` | `/app/usuarios` | administración |
| `reportes-*` | `/app/reportes` | administración |
| `zonas-*` | `/app/zonas` | administración |
| `mis-reservas-*` | `/mis-reservas` | turista |
| `mis-reportes-*` | `/reportes` | turista |
| `guia-actividades-*` | `/app/mis-actividades` | guía |
| `prestadora-servicios-*` | `/app/mis-servicios` | prestadora |

Las cuentas de guía y prestadora se provisionan desde la propia suite: la guía con `POST
/admin/users` y la invitación de Mailpit, la prestadora con el registro público y la aprobación
del admin. Si el entorno no permite ese ciclo, el test se marca como omitido en lugar de fingir la
captura.
## Ola 4 (2026-11-12)

Bloque B6: responsive a 375/768/1280 y zoom 200 %, menú móvil real, filtros
colapsables con resumen, tablas con scroll controlado y formularios a una
columna. El detalle, el método de medición y la tabla de hallazgos están en
[`ola4/README.md`](ola4/README.md).

- `ola4/antes/`: 70 capturas del commit `6723b41`, 10 pantallas × 3 anchos ×
  claro/oscuro + zoom 200 %.
- `ola4/despues/`: 128 capturas de la rama `feat/b6-responsive`, incluidas las
  de menú abierto, filtros desplegados, filtro activo y foco de teclado.
- `ola4/antes-reporte.json` y `ola4/despues-reporte.json`: `scrollWidth`,
  `clientWidth` y elementos fuera del viewport por combinación.

Resultado: 0 desbordes horizontales de página en las 60 mediciones de después
(12 rutas × 3 anchos × 3 estados) y en las 12 de zoom 200 %. `npm run dev`
levantó Vite en el puerto 5185 durante la medición y se detuvo al terminar.
