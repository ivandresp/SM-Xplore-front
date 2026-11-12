## Bloque de la ola 5

- Bloque: B_
- Hallazgos del registro: B_-_

## Qué cambia

<!-- 3 líneas máximo, en hechos. -->

## Evidencia

- Puerta local: `npm run typecheck && npm run lint && npm test && npm run build` -> <!-- exit 0, N/N tests, bundle kB -->
- Medición antes/después: <!-- número -> número -->
- `archivo:línea` de lo tocado:

## No probado

<!-- mínimo 3 cosas -->

## Riesgo asumido

<!-- qué puede romper y cómo se detecta -->

## Checklist

- [ ] Rama desde `develop`, sin push directo
- [ ] Puerta local verde (typecheck, lint, test, build)
- [ ] `docs/pendientes-auditorias.md` y `docs/plans/013-ola5.md` actualizados en este PR
- [ ] Auditor adversario firmó (PASA / PASA CON RESERVAS / BLOQUEA) con `archivo:línea`
- [ ] Sin dependencias nuevas ni decisiones de producto tomadas por el agente
- [ ] Si depende de un PR del backend: enlazado y mergear después
