# Orden de navegación móvil

Petición: botón del menú a la izquierda y SM-Xplore a su derecha, conservando escritorio.

1. Reproducir con Playwright a 375/768 px la posición relativa de botón y logo.
2. Mover el botón antes del logo en TopBar y quitar su order móvil para alinear teclado y vista.
3. Verificar menú/Escape, escritorio a 1280 px y ejecutar typecheck, lint, test y build.

Alcance: TopBar compartido; sin cambios de contratos, datos, dependencias ni producto.
Skills normativas no disponibles: no existe herramienta skill ni se encontraron sus SKILL.md en ~/.codex o ~/.agents. No se atribuye su uso.

## Evidencia de ejecución (2026-11-16)

- Rama existente: `fix/better-ui`; cambios locales, sin commit ni PR.
- Antes: logo antes del botón en DOM; botón con `order: 1`. Después: botón antes del logo, ambos con orden flex predeterminado (`TopBar.tsx:389`, `TopBar.module.css:516`).
- `npm run typecheck`: exit 0. `npm run lint`: exit 0, cinco advertencias en pantallas fuera del cambio.
- Primera suite: 430 passed / 1 failed, `EventListPage.test.tsx:100` (esqueleto de carga). Repetición focalizada TopBar + EventListPage: 12 passed.
- `npm run build`: exit 0; 301 módulos; índice 269,77 kB / 84,17 kB gzip. Sin medición de bundle anterior.
- Playwright: tres pruebas no pudieron iniciar Chrome, ausente en `/opt/google/chrome/chrome`. La instalación requiere sudo con contraseña y no pudo realizarse.
- Auditor adversario separado: PASA CON RESERVAS, sin defectos bloqueantes en revisión estática. Observación cosmética de líneas vacías corregida.
- Skills usadas: ninguna; las normativas no están disponibles. Backend, caché y animación no aplican al cambio solicitado.
- No probado: capturas/viewports en navegador, zoom 200 %, Safari/iOS, temas claro/oscuro. No se midieron peticiones ni recomendaciones por no cambiar datos ni red.
- Riesgo pendiente: validar en navegador el posicionamiento; el test E2E añadido comprueba geometría y Tab en 375/768 px.
