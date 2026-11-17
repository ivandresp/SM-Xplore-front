# Distribución mapa y cómo llegar

Escritorio desde1000px: dos columnas independientes. Izquierda galería/zona/actividades; derecha ubicación/Cómo llegar/eventos, separadas por el gap existente1,25rem. Antes1000px se apilan las columnas completas.

SiteLocationMap mide su contenedor al montar y con ResizeObserver; redondea a píxeles enteros y limita512px, pasa tamaño explícito al renderer existente para conservar centro y proyección. Desconecta observer al desmontar. Sin cambios de API ni de otros mapas.
