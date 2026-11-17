# Encabezado del atractivo sin zona duplicada

Quitar únicamente description de PageHeader en SiteDetailPage. Conservar title, breadcrumb y tarjeta Zona. Sin cambios de API/estilos. Verificar puertas existentes; no añadir tests que repliquen una eliminación de texto trivial. Skills normativas indisponibles, no se atribuye su uso.

Evidencia: typecheck/lint/test/build salida0;73 archivos/488 pruebas pasan, cinco avisos lint previos. `git diff --check` salida0. Auditor readonly audit_media_grid PASA: SiteDetailPage:161 conserva título/breadcrumb, :174 conserva Zona. Sin nueva prueba para eliminación trivial. No probado navegador/Safari/lector de pantalla en este bloque. Sin cambios de contrato/backend ni commit/push/PR.
