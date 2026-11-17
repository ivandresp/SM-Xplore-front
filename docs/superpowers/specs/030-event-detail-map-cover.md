# Portada de ubicación del evento

La primera sección de la columna principal es Ubicación, reemplazando Sin fotos disponibles. Debajo quedan Descripción e Información del evento. Reservas conserva su columna y lógica. Sitio404 muestra mensaje lugar ausente y sitio500 fallo consulta; no se inventan coordenadas.

EventLocationMap mide ancho disponible por ResizeObserver, ancho<=1024 y alto clamp(220, round(width×9/16),512). Se limpia observer y no actualiza estado si medidas iguales. MapPreview opta a width/height sin deformar tiles256; mercatorFrame calcula filas/columnas por separado y centra cada eje. API size y mapas cuadrados existentes conservan sus límites/defaults. Sin geocoding, imágenes ni dependencia nueva.
