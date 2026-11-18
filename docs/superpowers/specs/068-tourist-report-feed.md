# Filtros de reportes del turista

| Selección | Fuente |
| --- | --- |
| Ver todos (inicial) | `GET /security-reports` con el estado omitido |
| Ver mis reportes | `GET /security-reports/by-user/{id}` con el ID de la sesión |
| En curso, Reportados, Resueltos | `GET /security-reports` con el estado seleccionado |

El filtro activo se indica con `aria-pressed` en el panel de filtros. La barra conserva la acción de crear un reporte. «Ver más reportes» agrega la página siguiente del filtro activo. Al cambiar de filtro se vuelve a la primera página. El orden por fecha se aplica a los resultados cargados.
