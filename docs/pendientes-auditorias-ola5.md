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
| OLA5-B6-02 | BAJA | CERRADO | La suite e2e completa no corría: `screenshots.spec` escribía capturas y hacía logins en cada corrida (rate limit de ms-01) y `flows.spec` esperaba `/explorar` tras el registro (hoy pasa por `/bienvenida`). | PR #33: capturas con `CAPTURAS=1`, `flows` al onboarding, `workers:1`; 24 passed / 8 skipped |
| OLA5-B6-03 | MEDIA | CERRADO | `b8a-10-dm.spec` comprobaba la cabecera, la pestaña «Guías» y que no hubiera alerta, pero no que la cola trajera solicitudes: con la cola vacía también pasaba. | `e2e/b8a-10-dm.spec.ts:74-96`: siembra una guía por el alta pública (`POST /auth/register/guia`, que nace PENDIENTE) y exige la fila con su botón Aprobar; el spec pasa en 7,4 s con el stack |
| OLA5-B6-04 | BAJA | CERRADO | La suite e2e tenía credenciales fijas del stack (`admin@smxplore.local` / `ChangeMe123!`) y no mandaba la autenticación básica que el Mailpit del compose exige (`MP_UI_AUTH`), así que fallaba en el sondeo del correo con `Unauthorised`. | `e2e/support.ts:4-13`: `E2E_ADMIN_EMAIL`, `E2E_PASSWORD` y `E2E_MAILPIT_AUTH` con los valores del stack como defecto; medido en la corrida del spec |
| OLA5-B6-05 | INFO | ACEPTADO | El «5174» que anotó la auditoría ya no existe (0 ocurrencias). B6-13 mide la tabla del **turista** (`/reportes`), no la del panel (`/app/reportes`): el hallazgo queda bien, pero debe nombrar la del turista para que nadie lo lea como el panel. | `e2e/b6-reportes.spec.ts:36`; `src/routes/router.tsx:65` |
| OLA5-B8-01 | MEDIA | ABIERTO | El ms-01 desplegado no tiene `POST /auth/register/gestora` (404 `NoResourceFound` → 500) aunque `develop` sí: imagen del contenedor desactualizada. | `docker logs smxplore-ms-01-1` 2026-11-13T02:33:45Z; entorno, no código. Reconstruir ms-01 antes de verificar gestoras |
## B5 — Auditoría del bloque

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| OLA5-B5-01 | BAJA | CERRADO | La auditoría de B5 encontró: sticky también en páginas públicas, error del login movía el botón con mensajes de 2+ líneas y el chip de filtro sin guardia de 44 px. | PR #34: sticky solo en `AppLayout`; mensaje bajo el botón; e2e mide el chip; 408/408 |
| OLA5-B5-02 | INFO | ABIERTO | La suite unitaria falló 5 tests en 3 ficheros en 1 de 8 corridas (4/4 en aislamiento); no reproducible ni atribuible. | Observación del auditor de B5; vigilancia |
## B3 — Cascada de bloqueo

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| OLA5-B3-01 | MEDIA | ABIERTO | El bloqueo de una gestora no despublica sus eventos en ms-03 (solo se cubren guías). | Backend #109; falta `findByManagerId` y decidir si aplica |
| OLA5-B3-02 | BAJA | ABIERTO | Sin outbox en ms-01: si Kafka falla al publicar, el bloqueo no revierte pero la cascada se pierde (se loguea). | Backend #109; best effort documentado en el PR |
| OLA5-B3-03 | MEDIA | CERRADO | El primer run del Stack CI de #109 tumbó el arranque: `ms-01` reiniciaba en bucle. Dos causas: `spring-kafka` suelto no trae `KafkaAutoConfiguration` (sin `KafkaTemplate`) y el publisher pedía el `ObjectMapper` de Jackson 2 cuando ms-01 usa Jackson 3. | `KafkaAccountEventPublisher.java:22-32`, `build.gradle.kts:26-28`; fix 9d4ab98; `docker compose up --wait ms-01` → healthy; run 43371771841 en success |
| OLA5-B3-04 | MEDIA | ABIERTO | La cascada está probada por mitades (decoder y caso de uso), pero ningún test manda un evento real de ms-01 a ms-03 y el smoke del stack no bloquea guías: el cable entre servicios no lo cubre nadie. | `UserAccountBlockedEventDecoderTest`, `UnpublishGuideActivitiesUseCaseTest`; reserva del PR #109 |
| OLA5-B3-05 | BAJA | CERRADO | El compose raíz no pasaba `ACCOUNT_EVENTS_ENABLED` y el default de ms-03 es `false`: en el stack integrado el consumidor estaba apagado, así que la cascada no ocurría fuera de los tests. | `compose.yaml` ms-03; `application.yaml:93`; fix 96f514a |

## B2 — Revocación con motivo

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| OLA5-B2-01 | MEDIA | ABIERTO | Una gestora (`DESTINATION_MANAGER`) ya puede bloquear con motivo, pero no tiene pantalla para revocar la invitación que envía: el backend expone el motivo obligatorio y la UI de esa acción no existe. | Backend #108; `src/pages/admin/UserDetailPage.tsx` no tiene acción de revocar |
