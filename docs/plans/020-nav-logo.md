# Logo gráfico en la nav

Petición: sustituir marca de texto por el PNG aportado, con ajuste responsive.

- Fuente verificada: public/SM-Xplore-Icon.png, PNG RGBA 1448×1086, 787310 bytes. Se conserva el archivo original.
- Sustituir spans de Logo por img con alt SM-Xplore, tamaño intrínseco y relación 4:3. Altura 44 px bajo 900 px y 48 px desde 900 px. Base clara con token fijo existente para preservar texto navy sobre barras oscuras.
- Mantener menú a izquierda en móvil y enlace accesible al inicio. Foco visible/hover/active en enlace, sin cambio de idioma ni rutas.
- Sin edición del bitmap, generación de imágenes ni nuevas dependencias. size lg del componente se mantiene; tone deja de ser necesario al conservar colores de marca.
- Verificar typecheck/lint/test/build y navegador en 375/768/1280, ES/EN, claro/oscuro, barra pública y catálogo.

Skills normativas no disponibles según búsqueda previa de sesión; no se atribuye su uso. Skill imagegen no aplica: se integra un recurso existente mediante HTML/CSS, sin generarlo ni editarlo. Sin contratos de backend.

## Evidencia (2026-11-16)

- `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`: exit 0. Lint conserva cinco advertencias preexistentes.
- `npm test -- --maxWorkers=2`: 67 archivos, 445 pruebas pasan. No se añadieron tests unitarios para el cambio estático de imagen.
- Navegador Chrome for Testing con sandbox y build de producción: 24 combinaciones de 375/768/1280 × ES/EN × claro/oscuro × login/explorar. PNG cargado con dimensión natural 1448×1086, object-fit contain, altura exterior 44/48 px, menú a izquierda del logo en móvil, enlace al inicio con foco y overflow horizontal 0. API de catálogo interceptada con fixtures vacías; no son datos reales.
- `docs/diseno/020-logo-metrics.json`: métricas por caso. Capturas `020-logo-375-light.png` y `020-logo-1280-dark.png`, inspeccionadas visualmente; incluyen el foco por teclado sobre el enlace.
- Bundle índice 272,55 kB / 84,67 gzip (antes 272,72 / 84,72); el PNG original se sirve como asset aparte de 787310 bytes, sin transformación. Riesgo asumido: coste de descarga del archivo original; no se ha medido en red móvil limitada.
- Skills usadas: ninguna; no disponibles systematic-debugging, writing-plans, react-expert, typescript-pro, ui-ux-pro-max, web-design-guidelines, verification-before-completion, ponytail-review, code-reviewer y the-fool. Imagegen descartada: integración HTML/CSS de un recurso existente sin editar píxeles. Backend/API/caché no aplican.
- No probado: Safari/iOS, lector de pantalla, zoom 200 %, red móvil limitada. Colores de marca originales y transparencia conservados; base clara usa el token fijo --color-on-bar.
- Rama fix/better-ui, cambios locales sin commit/PR. No se tocó develop ni se realizó merge.
- Auditor independiente en contexto limpio: PASA CON RESERVAS, sin hallazgos bloqueantes; revisó Logo/TopBar y métricas por lectura. No ejecutó navegador ni suite, y mantiene como no probados Safari/iOS, lector de pantalla y zoom 200 %.

## Ajuste solicitado: fondo transparente

La imagen aportada se actualizó a 1447×1087 RGBA. Se retira background-color del logo y su comentario anterior: el diseño actualizado ya contempla fondos claros/oscuros. Dimensiones intrínsecas de img alineadas con el nuevo archivo; tamaños responsive conservados. Esta decisión reemplaza la base clara descrita arriba; las capturas 020 anteriores reflejan la versión previa.

Verificación del ajuste transparente: typecheck/lint/build/diff-check → exit 0; suite con dos workers → 67 archivos/445 pruebas pasan. Auditor independiente: PASA CON RESERVAS por revisión estática, sin defectos bloqueantes; no se repitió navegador para este cambio CSS. No probado adicionalmente el alfa efectivo de los píxeles del PNG nuevo; no se modificó el bitmap. Las cinco advertencias de lint siguen siendo las anteriores.
