# Ubicación al registrar servicio

Contrato verificado ms04 CreateServiceRequest.java:26-27: latitude/longitude numéricas obligatorias, rangos -90..90/-180..180. Perfil ms01 UserView/RoleDetailsView entrega coordenadas de prestadora; AuthUser discrimina SERVICE_PROVIDER. No nuevos endpoints ni permisos.

Sustituir inputs por fieldset/radios: misma ubicación prestadora (por defecto cuando válida) o diferente (mapa LocationPicker). Sin perfil/coordenadas completas válidas, deshabilitar reutilización, explicar y abrir mapa. Derivar punto efectivo según modo; guardar solo con punto válido, nunca Number('')=0. Conservar selección personalizada al alternar. Map solo visible custom, centrado en prestadora si existe. Reusar componente OSM sin dependencias. No tocar edición ni selección de catálogo.

Tests antes: envío con punto prestadora/0,0, modo custom sin elegir no hereda punto, selección+borrado, cambio modos conserva selección, perfil ausente/parcial/inválido. Puertas typecheck/lint/test/build y auditoría. Skills normativas ausentes según búsqueda previa, no se simula uso.

## Verificación

- Regresión antes: 6 tests fallaban con los campos/radios anteriores. Después: 16/16 focales (ServiceFormPage + LocationPicker), exit0.
- Typecheck/lint/build exit0; lint conserva avisos anteriores. Suite general 544/548: cuatro fallos de timing de catálogo (ExplorePage dos, ServiceListPage uno, SiteListPage uno). No se modifican esos componentes.
- Auditor adversario PASA, sin hallazgos. No probado backend activo, geometría/manejo mapa en navegador móvil ni actualización de perfil durante formulario abierto. Skills normativas ausentes, no simuladas.
