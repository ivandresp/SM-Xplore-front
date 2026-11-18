# Nuevo reporte sin desbordamiento móvil

Causa reproducida: al cargar1280px el picker mide384px; al reducir a320/360/375/414 el mínimo intrínseco de la rejilla conserva ese ancho y ensancha el documento a433px. Carga directa móvil no reproduce el caso.

Solución: .grid con grid-template-columns:minmax(0,1fr) y min-width:0; .full con min-width:0. No ocultar overflow ni alterar datos/picker/mapa. Selector solo usado en el formulario de reportes.

Aceptación: desktop→móvil y ciclo adicional1024→móvil sin desbordamiento en320/360/375/414/768/1280; mapa puede seleccionar/quitar/mover, valor persiste al redimensionar y payload conserva coordenadas. Rojo4/6 antes; verde6/6 después. Mantener gates y auditoría independiente de autor.
