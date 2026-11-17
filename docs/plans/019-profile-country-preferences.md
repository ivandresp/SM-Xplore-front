# Perfil del turista: país y preferencias

Petición: mostrar país en información personal y preferencias como badges horizontales iguales a recomendaciones.

- Confirmado backend: `RoleDetailsView.java:52` expone `nationality` en el perfil Tourist. El tipo local lo conserva en `src/types/auth.ts:46`.
- Cambiar fila Ciudad por País para turista, mostrando profile.nationality y «—» cuando no existe; mantener otros roles.
- Sustituir filas categoría/origen/Quitar por botones categoría × con nombre accesible «Quitar {categoría}», conservando eliminación y disabled. Mantener la nota sobre preferencias inferidas.
- Estilo visual de recommendations.module.css: lista flex con wrap, badges de borde teal; controlar nombres largos y objetivos de 44 px.
- Adaptar test existente de preferencias y verificar country, eliminación y ausencia de filas anteriores. Verificar 375/768/1280 y typecheck/lint/test/build.

Fuera de alcance: nuevos endpoints, edición del país, sesión/caché, cambios en recomendaciones o fuentes de preferencias. Skills normativas no disponibles en esta sesión (búsqueda documentada en bloque 018); no se atribuye su uso. Auditor separado al finalizar.

## Evidencia (2026-11-16)

- Test existente adaptado antes del cambio: 1 falló/3 pasaron por ausencia de País; después suite completa `npm test -- --maxWorkers=2`: 67 archivos/445 pruebas pasan. El test conserva añadir/quitar y comprueba país Colombia y badge nombre×.
- `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`: exit 0. Lint conserva cinco advertencias preexistentes.
- `MyProfilePage.tsx:90–95`: país real del turista con fallback—; los otros roles conservan su fila anterior.
- `MyProfilePage.tsx:301–310`: badge completo elimina, aria-label localizado y disabled durante guardado. Se retiró el origen por categoría; continúa la nota general sobre inferidas.
- `profile.module.css:175–227`: flex-wrap horizontal y estilos equivalentes a recomendaciones; altura mínima 44 px y nombres largos contenidos.
- Navegador Chrome for Testing con sandbox, contra producción en vite preview; respuestas interceptadas con fixtures locales. 12 combinaciones (375/768/1280 × ES/EN × claro/oscuro): primeros dos badges en misma fila, altura ≥44 px, overflow horizontal 0, país Colombia, eliminación por Enter y disabled mientras DELETE pendiente. Métricas: `docs/diseno/019-profile-metrics.json`.
- Capturas ES/claro: `docs/diseno/019-profile-{375,768,1280}.png`; inspección visual de 375 px. Los nombres y el país son fixtures, no datos reales.
- Build: índice 272,72 kB / 84,72 gzip; compartido idioma 180,37 / 58,03 gzip (redondeo anterior 180,36 / 58,03; solo se añadió País/Country al diccionario).
- Auditor separado: PASA CON RESERVAS, sin hallazgos bloqueantes por lectura y 4 tests de perfil pasaron. La reserva de geometría/disabled quedó cubierta después por navegador del agente principal.
- Skills usadas: ninguna. No disponibles systematic-debugging, writing-plans, test-driven-development, react-expert, typescript-pro, ui-ux-pro-max, web-design-guidelines, verification-before-completion, ponytail-review, code-reviewer y the-fool; no existe herramienta skill ni sus archivos según búsqueda de sesión. Descartadas backend/API nuevos, caché y animaciones por no aplicar.
- No probado: Safari/iOS, lector de pantalla, zoom 200 %, DELETE contra backend real, país nulo en navegador (fallback comprobado por lectura).
- Rama fix/better-ui, cambios locales sin commit/PR. Pendientes flujo GitHub y review manual; no se modificó develop.
