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
