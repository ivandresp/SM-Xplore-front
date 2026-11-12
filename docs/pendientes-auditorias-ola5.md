# Pendientes encontrados en auditorías — ola 5

Registro nuevo de la ola 5. El de la ola 4 ([`pendientes-auditorias.md`](pendientes-auditorias.md)) no se
borra: este archivo recoge solo lo que aparece a partir de aquí. Formato:
ID | Sev | Estado | Hallazgo | Evidencia / dueño. Un hallazgo se marca CERRADO con su commit/test, o
queda ABIERTO, ACEPTADO (con motivo) o CON DUEÑO (bloque donde se resuelve).

## B7 — Red de seguridad del front

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| OLA5-B7-01 | MEDIA | CERRADO | `OnboardingPage.test` «no pierde el foco con teclado» era intermitente: el efecto `[step]` enfoca el h1 después del commit que hace visibles las cápsulas y podía robar el foco entre `focus()` y el `Enter`, que acababa en el h1 sin disparar el POST. Medido 2/15 fallos locales; en CI tumbó el run 43326016785 del PR #17. | `src/pages/onboarding/OnboardingPage.tsx:127-131`; test corregido en `OnboardingPage.test.tsx:403-417`; 0/30 fallos tras el fix |
