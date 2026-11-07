# Plan 003 — Recomendaciones de ms-05 en el front

## Pasos

1. Verificar en el backend los contratos de `RecommendationController`,
   `InteractionController` y `PreferenceController`.
2. Tipar la respuesta real en `src/types/recommendation.ts` y exportarla en `types/index.ts`.
3. Crear `recommendationsApi` con zod: `list` (GET `/recommendations`) y
   `registerView` (POST `/interactions/view/{itemType}/{itemId}`), con test.
4. Añadir `useTrackView` y dispararlo sólo para turistas en las fichas de actividad,
   evento, servicio y atractivo.
5. Crear `RecommendationsPage` con razón del backend, enlaces a la sección del catálogo,
   skeletons, error con reintento y estado vacío.
6. Registrar la ruta `/recomendaciones` (TOURIST) y el ítem de navegación «Para ti».
7. Verificar en navegador contra el gateway: login de turista, tarjetas con `reason`,
   y POST 204 al abrir una ficha.

## Criterio de terminado

`npm run typecheck && npm run lint && npm test && npm run build` en verde, y la página
renderiza contra el backend real sin errores de consola.

## Límites asumidos

- No hay UI de preferencias: ms-05 no expone un GET para leerlas.
- Las tarjetas enlazan a la sección, no al detalle: el índice de ms-05 todavía no está
  sincronizado con ms-03/ms-04 y sus `itemId` pueden devolver 404.
