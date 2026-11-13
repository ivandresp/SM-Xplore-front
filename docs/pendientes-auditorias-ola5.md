# Pendientes encontrados en auditorías — ola 5

Registro nuevo de la ola 5. El de la ola 4 ([`pendientes-auditorias.md`](pendientes-auditorias.md)) no se
borra: este archivo recoge solo lo que aparece a partir de aquí. Formato:
ID | Sev | Estado | Hallazgo | Evidencia / dueño. Un hallazgo se marca CERRADO con su commit/test, o
queda ABIERTO, ACEPTADO (con motivo) o CON DUEÑO (bloque donde se resuelve).

## B7 — Red de seguridad del front

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| OLA5-B7-01 | MEDIA | CERRADO | `OnboardingPage.test` «no pierde el foco con teclado» era intermitente: el efecto `[step]` enfoca el h1 después del commit que hace visibles las cápsulas y podía robar el foco entre `focus()` y el `Enter`, que acababa en el h1 sin disparar el POST. Medido 2/15 fallos locales; en CI tumbó el run 43326016785 del PR #17. | `src/pages/onboarding/OnboardingPage.tsx:127-131`; test corregido en `OnboardingPage.test.tsx:403-417`; 0/30 fallos tras el fix |

## B1 — Selects nativos restantes

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| OLA5-B1-01 | BAJA | CERRADO | `MyProfilePage` conservaba un `<select>` nativo que no estaba en `B2-09` ni en `B6-10`. Apareció al medir el alcance real de B1 (2026-11-12) y se migró en su propio PR de pantalla, no de paso. | PR #22 mergeado en `ae8ef98`; `MyProfilePage.test.tsx` 4/4 |
## B6 — Arneses

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| OLA5-B6-01 | BAJA | CERRADO | `catalog-filters.spec` escribía `docs/diseno/catalogo-*.png` en cada `npm run test:e2e` (ensuciaba el árbol y el commit de docs). | PR #32: capturas condicionadas a `CAPTURAS=1` y PNG restaurados desde `develop` |
