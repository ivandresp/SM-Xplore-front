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
