# Mapa con zoom y ficha compacta

La ficha del reporte presenta Autor: nombre + fecha/hora de creación. La fecha tiene datetime y nombre accesible localizado. Nombre y fecha pueden saltar de fila en móvil; no se recortan. No se muestra identificador del reporte.

Mapa en el mismo espacio, con + y − en esquina superior derecha, controles de 44×44 px. Cambiar zoom recalcula tiles centrados en las mismas coordenadas. Límites 0 y 19, sin peticiones fuera de rango. Los mapas de otras páginas conservan el comportamiento previo. Atribución, carga y fallback se mantienen.
