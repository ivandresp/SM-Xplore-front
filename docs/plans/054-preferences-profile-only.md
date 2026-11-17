# Preferencias editables solo desde perfil

Usuario pide quitar edición de preferencias de Para ti. Retirar sección Tus intereses, SelectField/chips/actions y usePreferences de RecommendationsPage, con sus consultas categories/preferences y CSS muerto. Backend sigue calculando recomendaciones desde preferencias guardadas; mantener paginación/reintento/errores. Perfil conserva hook y UI sin cambios funcionales; onboarding inicial no se modifica.

Prueba nueva antes: sin editor ni llamadas a categorías/preferences al abrir recomendaciones. Retirar casos de edición obsoletos y conservar cobertura relevante de ver-más/reintentos/carreras usando esos flujos reales. Verificar perfil añade/quita. E2E editar en perfil→volverParaTi sin editor y ranking actualizado. Puertas typecheck/lint/test/build, auditoría. Skills normativas ausentes según búsqueda previa. Sin API/contratos nuevos.

## Evidencia final

Prueba roja nueva falló antes: Tus intereses seguía visible. Focal final2archivos/16tests aprobados (12recomendaciones,4perfil). Se retiraron casos ligados al editor eliminado y se mantuvieron/adaptaron ampliación,reintento,caché y respuesta obsoleta. Typecheck/lint/build exit0, build1.79s. Suite general577/579:2fallos temporales previos de SiteListPage/EventListPage.

Playwright configtourist-navigation reporterline --grep tourist →15passed30.4s exit0 en stdout herramientas. Nuevo caso prueba ParaTi sin categorías/preferences requests, perfil añadePlayas,Home aplica recomendación simulada,perfil quitaPlayas,Home vuelve al vacío. Ningún editor fuera del perfil,3lecturas recommendations y2escrituras solo perfil. Mantiene14regresiones de navegación375/768/1280ES/EN. APIs simuladas.

Auditor PASA. No probado ranking/backend real, preferencias editadas en otro dispositivo ni lector de pantalla. Skills normativas ausentes, no simuladas. Bienvenida inicial intacta.
