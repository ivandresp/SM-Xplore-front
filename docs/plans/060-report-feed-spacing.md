# Separación de cards de reportes

Pedido:3px entre reportes. Cambiar solo .feed gap de1.25rem a3px en reports.module.css (MyReportsPage). No tocar comentarios, filtros ni padding de las cards. Sin test nuevo por cambio visual reversible; gates existentes y revisión por inspección. Skills normativas ausentes, ninguna cargada.

Evidencia: typecheck/lint/build exit0; suite589/590 con un fallo de catálogo registrado en /tmp/report-spacing-tests.log. git diff --check sin errores. Auditor audit_table PASA por inspección (.feed línea8, uso MyReportsPage188). No probado navegador, zoom200% ni Safari/iOS.

Ajuste posterior solicitado: separación reducida de3px a1px; mismo selector .feed, sin otros cambios funcionales.
