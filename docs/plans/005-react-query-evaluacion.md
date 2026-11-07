# Evaluación — @tanstack/react-query

Fecha: 2026-11-07. Rama: ninguna (no se modificó código).

## Qué se midió

- 68 ficheros `.tsx` en `src/`; 36 usan `useEffect` para cargar datos (9.505 líneas entre
  todos). Todos siguen el mismo patrón: `isLoading`, `error`, `cancelled` y un `try/catch`
  con `describeApiError`.
- Ya hay caché de catálogo fuera de React: `services/catalogLookup.ts` memoiza la carga
  compartida de actividades, eventos, sitios y servicios. Las páginas que la usan no
  duplican peticiones.
- El bundle actual es 242,60 kB (75,70 kB gzip) para el shell; cada página viaja aparte
  desde el bloque de `lazy()`.
- No hay peticiones duplicadas en el recorrido E2E con ningún rol, salvo el doble efecto
  de `StrictMode` en desarrollo (no ocurre en producción).

## Qué costaría migrar

- Una dependencia nueva más un `QueryClientProvider` en la raíz.
- Reescribir 36 pantallas: cada una pierde ~15 líneas de estado y gana `useQuery` con su
  `queryKey`. La ganancia real solo aparece cuando dos pantallas comparten la misma
  consulta o cuando hay invalidación tras una mutación; hoy casi ninguna lo hace.

## Decisión

No se migra. El ahorro estimado (unas 15 líneas por pantalla) no compensa 36 reescrituras
ni una dependencia nueva cuando no hay caché compartida que explotar; el único caché real
que existe (`catalogLookup`) ya está resuelto y no necesita invalidación por clave.

## Cuándo revisarlo

- Si aparecen vistas que muestran el mismo dato a la vez (listado + detalle) y se nota el
  parpadeo al navegar.
- Si las mutaciones empiezan a exigir refrescar varias listas a la vez.
- Medición a repetir antes de decidir: renders por navegación con el profiler de React en
  `/app/usuarios` y `/explorar`, y líneas de esos dos ficheros antes y después.
