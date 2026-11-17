# Acción del nav en registro

Petición: en `/registro`, sustituir «Crear cuenta» por «Iniciar sesión» con destino `/login`.
Alcance: condición de texto y destino en PublicLayout; conservar el botón actual en `/login` y el resto de páginas.
Verificación: typecheck, lint, tests existentes y build. Sin cambios de sesión ni contratos.
Skills normativas no disponibles en esta sesión (sin herramienta skill ni SKILL.md encontrados en la búsqueda previa).

## Verificación

- `PublicLayout.tsx:81–83`: `/registro` → «Iniciar sesión», `/login`; `/login` → «Crear cuenta», `/registro`.
- Typecheck y lint: exit 0 (lint conserva cinco advertencias externas al bloque).
- Suite existente: 430 passed / 1 failed; mismo fallo previo de `EventListPage.test.tsx:100`.
- Auditor separado: PASA CON RESERVAS, sin defectos bloqueantes en revisión estática.
- No probado: clic real en navegador, distribución móvil del nuevo texto, Safari/iOS. Chrome no está disponible según comprobación del bloque anterior.
- Skills usadas: ninguna; las normativas siguen sin estar disponibles. Backend/caché/animación no aplican. Sin cambios de autenticación.
- Cambios locales en `fix/better-ui`, sin commit ni PR; puerta de tests no verde.
