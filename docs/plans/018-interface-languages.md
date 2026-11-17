# Idiomas ES/EN en toda la interfaz

Alcance autorizado: selector junto al tema, toda la interfaz y diseño responsive.

1. Inventariar textos de aplicación, separar datos de usuario/API y contratos.
2. Diccionario ES/EN local, idioma persistido y suscripción React sin dependencias nuevas. Español por defecto; actualizar html lang y formatos locales conservando COP.
3. Migrar textos visibles, accesibilidad, mensajes de validación y estados a traducciones explícitas. No traducir valores enviados al backend ni contenido escrito por usuarios.
4. Escritorio: controles de idioma/tema contiguos; móvil: controles contiguos dentro del menú, con objetivos de 44 px y cierre con Escape.
5. Tests de persistencia, idioma, interpolación, campos y cambio en vistas. Typecheck/lint/test/build y auditoría adversaria independiente.

Sin cambios en servicios, contratos, sesión ni dependencias. Se respetan cambios previos de RegisterPage y nav. Skills normativas no disponibles (búsqueda realizada en sesión); no se afirma haberlas usado. Navegador Chrome ausente según bloque anterior: se intentará verificación con navegador disponible sin cambiar dependencias del proyecto.

## Entrega y evidencia (2026-11-16)

Rama existente: `fix/better-ui`. Cambios locales; sin commit, push ni PR. Se preservaron los cambios de navegación de los bloques 016/017 y el cambio previo del usuario «Pais de Origen» en registro. El test de nacionalidad se alineó con esa etiqueta existente, sin modificar su validación.

### Comportamiento

- 1.182 traducciones en `src/i18n/en.json`; fuente española, inglés local e interpolaciones explícitas. No traducción remota ni nuevas dependencias.
- Idioma español por defecto, preferencia `sm-xplore:language` en localStorage, fallback si almacenamiento bloqueado y sincronización mediante storage. `html.lang` se actualiza (`src/i18n/language.ts:8`, `:31`, `:44`).
- Escritorio ≥900 px: selector junto al tema (`TopBar.tsx:438`). Móvil/tableta <900 px: ambos dentro del menú (`TopBar.tsx:466`, `TopBar.module.css:405`). Objetivos 44 px, teclado/Escape conservado.
- Mensajes ya mostrados guardan resolvers puros (`useMessageState.ts`), no el idioma anterior. Las acciones y peticiones se ejecutan fuera de esos resolvers. Valores introducidos conservan sus useState anteriores.
- Fechas/horas y moneda usan locale activo; se conserva COP (`utils/format.ts:11`, `:62`). Nombres/descripciones libres del catálogo y los usuarios permanecen intactos.
- Itinerario guarda duración numérica y deriva metadatos al render. Compatibilidad: en actividades antiguas sin duración se muestra fecha como subtítulo; se conservan nombre, reservas y datos almacenados (`useItinerary.ts:24`).

### Verificación

- `npm run typecheck` → exit 0.
- `npm run lint` → exit 0; cinco advertencias preexistentes (setState en efectos de cuatro catálogos y escape de guion en CreateUserPage). No se añadieron supresiones.
- `npm test -- --maxWorkers=2` → 67 archivos, 445 pruebas pasan. Se acota concurrencia por CPU; no se deshabilitan pruebas. Suite anterior: 62 archivos/431 pruebas. El fallo de carga de EventListPage observado en bloques previos no se reproduce en esta ejecución.
- Tras el último fallback de filtro localizado: tests focalizados de SiteListPage y catálogo de mensajes → 2 archivos, 3 pruebas pasan.
- `npm run build` → exit 0; 308 módulos. Índice 272,72 kB / 84,71 kB gzip y compartido useLanguage 180,36 kB / 58,03 kB gzip. Antes del bloque: índice 269,83/84,20 y jsx-runtime 102,30/34,07; el runtime pasó al compartido de idioma. Suma de esos compartidos: 372,13 → 453,08 kB; gzip 118,27 → 142,74 kB (+24,47 kB). No equivale al total de todas las rutas.
- `git diff --check` → exit 0.
- Navegador: Chrome for Testing 158.0.8127.18 recién descargado en caché de Playwright (Chrome de sistema ausente). Sandbox activado; sin cambios de dependencias. Pruebas contra `vite preview` de producción, datos API interceptados mediante fixtures locales.
- E2E: `E2E_BROWSER_EXECUTABLE=<ruta-al-chrome-disponible> npx playwright test --config playwright.language.config.ts` tras build. 12 pruebas pasan: selector/tema contiguos y 44 px, ES→EN→ES, persistencia tras reload, conservación de correo, Escape/foco, siete rutas públicas y los cinco roles a 375/768/1280 sin desbordamiento horizontal. Claro/oscuro en login. Las fixtures están definidas en `e2e/language.spec.ts`; no son datos reales.
- Capturas: `docs/diseno/018-language-{375,768,1280}-{light,dark}-en.png` (6, total ~304 KiB). Inspección visual directa de 375 claro y 1280 oscuro.

### Auditoría y límites

Auditor separado sin implementación: PASA CON RESERVAS. Hallazgos corregidos: opciones congeladas por Object.entries a módulo, fallback del router, hints omitidos, textos persistidos del itinerario y etiquetas de resumen del perfil. Segunda revisión de integridad sobre código ajeno al revisor: PASA; resolvers puros, payloads y estado conservados. Reserva vigente: subtítulo con fecha para actividades antiguas sin duración numérica.

No probado: Safari/iOS; lector de pantalla; zoom de navegador 200 %; todas las acciones contra backend real. No se midieron latencias de recomendaciones ni consultas reales porque el cambio no modifica sus endpoints ni dispara consultas por idioma; el test de búsqueda verifica que alternar idiomas no añade peticiones.

Skills usadas: ninguna (no hay herramienta `skill` y la búsqueda inicial no encontró sus SKILL.md). No disponibles: using-superpowers, writing-plans, ponytail, systematic-debugging, test-driven-development, react-expert, typescript-pro, ui-ux-pro-max, frontend-design, web-design-guidelines, impeccable, webapp-testing/playwright-expert, verification-before-completion, ponytail-review, code-reviewer y the-fool. Descartadas por alcance: api-designer/spec-miner/backend (sin contrato nuevo), rendimiento/caché (sin política nueva), ui-animation (sin animación nueva), office (sin entregable ofimático). Se aplicaron inventario AST, pruebas, verificaciones y auditoría explícita sin atribuir uso de skills ausentes.

Pendiente del flujo de integración del equipo: commit/PR, checks GitHub y review manual. No se modificó develop ni se realizó merge.
