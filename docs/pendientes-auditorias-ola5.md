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
| OLA5-B6-02 | BAJA | CERRADO | La suite e2e completa no corría: `screenshots.spec` escribía capturas y hacía logins en cada corrida (rate limit de ms-01) y `flows.spec` esperaba `/explorar` tras el registro (hoy pasa por `/bienvenida`). | PR #33: capturas con `CAPTURAS=1`, `flows` al onboarding, `workers:1`; 22 passed / 8 skipped |
| OLA5-B8-01 | MEDIA | ABIERTO | El ms-01 desplegado no tiene `POST /auth/register/gestora` (404 `NoResourceFound` → 500) aunque `develop` sí: imagen del contenedor desactualizada. | `docker logs smxplore-ms-01-1` 2026-11-13T02:33:45Z; entorno, no código. Reconstruir ms-01 antes de verificar gestoras |
