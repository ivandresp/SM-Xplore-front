# Registro de categorías

Ruta autenticada /app/categorias y navegación solo ADMIN/DESTINATION_MANAGER. Formulario nombre y tipo obligatorio; opciones SITE/EVENT/ACTIVITY/GENERAL, SITE inicial. parentId null. Envío único, nombre recortado, error conserva campos, éxito vacía nombre y actualiza listado al tipo creado/página0. Lista GET paginada20 y filtrada en servidor; SERVICE existente se reconoce y puede filtrarse, sin añadir su creación al formulario solicitado. Error de lista ofrece reintento independiente del formulario. ES/EN reactivo. Grid sin anchos mínimos fijos, una columna móvil/tablet y dos en escritorio.

Backend: POST permite admin/gestora en HTTP y servicio, resto rechazado antes de IO. PUT permanece admin. Sin nuevas rutas, edición o borrado. Necesita desplegar ms-04 para habilitar gestora.
