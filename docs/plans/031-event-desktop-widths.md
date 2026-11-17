# Anchos del detalle de evento en escritorio

Ajustar solo esta ficha desde1000px: ratio columnas1,6:1→1,2:1 para ensanchar reserva. Descripción/Información ancho100% y máximo1024px, el mismo límite del mapa. Conservar móvil/tablet y otras páginas de eventos con estilos scoped. Verificar geometría por navegador375/768/1280/1920 ES/EN, puertas frontend y revisión readonly. No nueva lógica ni tests unitarios que repliquen CSS trivial. Skills normativas indisponibles; no se simula uso.

Verificación final: typecheck/lint/test/build exit0,73 archivos/491 pruebas; cinco avisos lint previos. Playwright config event-detail:22 esperados/0inesperados/0omitidos/0inestables,30,14s; casos evento375/768/1280/1920 ES/EN más regresiones sitio. Desktop verifica descripción/información con mismo ancho que mapa (tolerancia2px) y reserva mayor40%viewport. Sin overflow en anchuras probadas. Capturas030 actualizadas; inspección visual1280 confirma alineación y reserva ampliada.

Auditor readonly audit_media_grid PASA: reglas scoped y solo desde1000px. No probado Safari/iOS físico, zoom200%/lector de pantalla ni reservas reales; navegador usa API simulada. Skills normativas indisponibles; revisión manual sin atribuirlas. Sin API/deps/backend nuevos ni commit/push/PR.
