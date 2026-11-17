# Añadir preferencias en móvil

Solo mobile<768: dropdown y botón en fila grid minmax(0,1fr)/auto, icono+visible, texto Añadir oculto. Mantener aria-label/title Añadir y objetivo44px. Desktop conserva texto y disposición existente. Misma acción/disabled, sin lógica ni APIs nuevas.

No tests unitarios nuevos para replicar CSS (presentación reversible). Ejecutar perfil/recomendaciones existentes y parametrizar E2E del flujo de preferencias en375/1280 con medidas de alineación/tamaño y ausenciaoverflow. Puertas typecheck/lint/test/build y auditoría. Skills normativas ausentes según búsqueda previa.

Verificación: typecheck y lint terminan con código 0 (lint conserva avisos existentes); build correcto. Perfil/recomendaciones: 16/16. Navegador: 16/16 en 26,3 s, incluyendo preferencias en 375 y 1280 px; captura móvil revisada en /tmp/profile-add-preference-375.png. Suite general: 577/579; fallan ExplorePage (total de resultados) y EventListPage (esqueleto), fuera del cambio. Auditor independiente audit_table: PASA por inspección, sin hallazgos. git diff --check sin errores. Skills especializadas no disponibles; ninguna cargada.
