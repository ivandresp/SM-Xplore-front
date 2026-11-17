# Registro de prestadoras: negocio y mapa

Contrato leído: backend ms-01 RegisterProviderRequest.java:22-26: businessType string opcional max50, latitude/longitude decimales opcionales, fecha pasada/presente opcional. No cambiar obligatoriedad ni payload.

Cambios: SelectField con Alojamiento/Transporte/Alimentacion y sin hint; misma fila grid que fecha, antes del mapa. Sustituir inputs coordenadas por LocationPicker existente, con etiqueta configurable Ubicación del negocio y error accesible. Guardar y borrar ambas coordenadas de forma conjunta usando estado actual. Reutilizar OSM autorizado expresamente por el usuario, sin librerías nuevas. Mantener sitio web después del mapa y demás roles intactos.

Tests: selector/opciones y sin hint, orden DOM y grid, selección/envío/borrado de ubicación, coordenadas omitidas si no se elige mapa, fallo mapa no impide registro opcional; tests existentes LocationPicker y registro. Puertas typecheck/lint/test/build; auditoría adversaria e independiente de formulario auth. Skills normativas no instaladas según búsqueda previa.
