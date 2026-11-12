# Pendientes encontrados en auditorías — ola 5

Registro nuevo de la ola 5. El de la ola 4 ([`pendientes-auditorias.md`](pendientes-auditorias.md)) no se
borra: este archivo recoge solo lo que aparece a partir de aquí. Formato:
ID | Sev | Estado | Hallazgo | Evidencia / dueño. Un hallazgo se marca CERRADO con su commit/test, o
queda ABIERTO, ACEPTADO (con motivo) o CON DUEÑO (bloque donde se resuelve).

## B1 — Selects nativos restantes

| ID | Sev | Estado | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| OLA5-B1-01 | BAJA | CERRADO (pendiente de merge) | `MyProfilePage` conservaba un `<select>` nativo que no estaba en `B2-09` ni en `B6-10`. Apareció al medir el alcance real de B1 (2026-11-12) y se migró en su propio PR de pantalla, no de paso. | `MyProfilePage.tsx:294`; rama del PR #22; test `MyProfilePage.test.tsx` 4/4 |
