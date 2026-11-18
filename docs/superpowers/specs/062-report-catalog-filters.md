# Catálogo comunitario de reportes — bloqueo y parte independiente

El pedido cambia catálogo propio a general con filtros desplegables, estado/Ver todos, Ordenar por fecha y Mis reportes.

## Evidencia backend actual (solo lectura)

- SecurityConfiguration.java:70–77 solo ADMIN/DESTINATION_MANAGER pueden GET/HEAD listado general.
- SecurityReportController.java:81–87 detalle requiere autor/staff; :92–99 listado exige status.
- CommentController.java:42–65 publicación/lectura restringidas; ReportAccessGuard exige autor/staff.
- Paginación por cursor; cliente actual carga primera página y ordena localmente.
- Repo backend en rama feat/category-create-manager con cambios ajenos sin commit; no se modifica desde esta sesión.

## Trabajo independiente autorizado

Reutilizar FilterBar oculto inicialmente para estado/Ver todos y ordenar al final. Label Ordenar por fecha, valores Más recientes/Más antiguos. Mantener por ahora alcance propio, título propio y llamadas actuales: no prometer un catálogo general ni añadir un toggle que simule acceso inexistente. Filtros presentes aun sin resultados. Tests primero de despliegue/selección/limpieza.

## Cambio necesario en una sesión con backend writable

1. Rama aislada a develop sin mezclar cambios de ms04. Pruebas rojas por rol antes de implementar.
2. Permitir listado general autenticado para TOURIST/GUIDE/SERVICE_PROVIDER, sin abrir anónimos ni acciones de gestión.
3. Extender consulta paginada con estado opcional, alcance propio derivado del JWT y orden por createdAt asc/desc. Definir contrato concreto en backend antes de integrarlo aquí; cursor debe conservar filtros/orden y desempate por id. No descargar toda colección para ordenar localmente.
4. Habilitar detalle, lectura y publicación de comentarios de reportes ajenos para usuarios autenticados según petición. Mantener close/solve/editar contenido/fotos restringidos. Revisar tests de IDOR anteriores porque cambia deliberadamente política de visibilidad.
5. Totales de respuestas por card sin N+1 ni presentar primera página como conteo global.
6. Pruebas de contrato, 401/403, estados, propios+ajenos, orden/paginación, comentario ajeno; despliegue ms02 antes que frontend general.

La restricción de escritura viene del workspace (solo front y /tmp). AGENTS exige entregar instrucciones/parche si backend es solo lectura. No se inventan endpoints ni flags de despliegue. Pendientes: vista general real y filtro Mis reportes hasta habilitar contrato backend; orden global real depende del mismo cambio.
Skills especializadas normativas ausentes, ninguna cargada. Sin nuevos endpoints/dependencias en esta parte.
