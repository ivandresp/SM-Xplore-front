import { useEffect, useState } from 'react'
import { coordinatePoint, mercatorFrame, tileUrl } from './mercator'
import styles from './MapPreview.module.css'

/** Zoom por defecto: una ficha se lee a escala de barrio (~2 km de ancho). */
const DEFAULT_ZOOM = 14

/** Un tile se pide dos veces: un fallo puntual de red no deja un hueco. */
const MAX_TILE_ATTEMPTS = 2

/** Sin ningún tile a los 8 s el mapa no va a llegar: mejor coordenadas y enlace. */
const TILE_TIMEOUT_MS = 8_000

interface TileProgress {
  attempts: number
  loaded: boolean
}

export interface MapPreviewProps {
  /** Latitud del punto; `null` cuando la ficha no la tiene. */
  latitude: number | null | undefined
  /** Longitud del punto; `null` cuando la ficha no la tiene. */
  longitude: number | null | undefined
  /** Nombre del punto, para el texto alternativo. */
  label: string
  zoom?: number
}

/**
 * Mapa de solo lectura sin API key ni librería: pinta los tiles de OpenStreetMap
 * que cubren las coordenadas y un marcador en el centro.
 *
 * `shortcut:` un request por tile a tile.openstreetmap.org, sin caché propia;
 * en producción toca proveedor con cuota o self-host.
 */
export function MapPreview({
  latitude,
  longitude,
  label,
  zoom = DEFAULT_ZOOM,
}: MapPreviewProps) {
  const point = coordinatePoint(latitude, longitude)
  const zoomLevel = Number.isFinite(zoom) ? zoom : DEFAULT_ZOOM
  const frame =
    point === null
      ? null
      : mercatorFrame(point.latitude, point.longitude, zoomLevel)

  /** Los avances se recuerdan por juego de tiles: cambiar de ficha los reinicia. */
  const [progress, setProgress] = useState<{
    key: string
    tiles: Record<number, TileProgress>
  }>({ key: '', tiles: {} })
  const [timedOutKey, setTimedOutKey] = useState<string | null>(null)

  const tiles = frame === null ? [] : frame.tiles
  const frameKey =
    frame === null
      ? ''
      : `${frame.zoom}/${tiles.map((tile) => `${tile.x},${tile.y}`).join(';')}`
  const current = progress.key === frameKey ? progress.tiles : {}
  const loadedCount = tiles.filter((_, index) => current[index]?.loaded).length
  const deadCount = tiles.filter(
    (_, index) => (current[index]?.attempts ?? 0) >= MAX_TILE_ATTEMPTS,
  ).length
  const allLoaded = tiles.length > 0 && loadedCount === tiles.length
  const allDead = tiles.length > 0 && deadCount === tiles.length
  const timedOut = frameKey !== '' && timedOutKey === frameKey
  const showFallback = allDead || (timedOut && loadedCount === 0)
  const isLoading = !showFallback && !allLoaded && !timedOut

  useEffect(() => {
    if (frameKey === '' || allLoaded || showFallback || timedOut) {
      return
    }

    const timer = setTimeout(() => setTimedOutKey(frameKey), TILE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [frameKey, allLoaded, showFallback, timedOut])

  function recordTile(index: number, patch: Partial<TileProgress>) {
    setProgress((previous) => {
      const base = previous.key === frameKey ? previous.tiles : {}
      const tile = base[index] ?? { attempts: 0, loaded: false }
      return { key: frameKey, tiles: { ...base, [index]: { ...tile, ...patch } } }
    })
  }

  if (point === null) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.viewport}>
          <p className={styles.empty}>
            Esta ficha todavía no tiene coordenadas publicadas.
          </p>
        </div>
        <Attribution />
      </div>
    )
  }

  const lat = point.latitude.toFixed(5)
  const lng = point.longitude.toFixed(5)
  const coordinates = `${lat}, ${lng}`
  const externalUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${frame?.zoom}/${lat}/${lng}`

  return (
    <div className={styles.wrapper}>
      {showFallback ? (
        <div className={styles.viewport}>
          <p className={styles.empty}>
            No pudimos cargar el mapa.
            <br />
            <span className={styles.coords}>{coordinates}</span>
          </p>
          <a
            className={styles.link}
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir en OpenStreetMap (abre en pestaña nueva)"
          >
            Abrir en OpenStreetMap
          </a>
        </div>
      ) : (
        <div
          className={styles.viewport}
          role="img"
          aria-label={`Mapa de ${label} en ${coordinates}`}
          aria-busy={isLoading}
        >
          {tiles.map((tile, index) => {
            const tileProgress = current[index]

            if ((tileProgress?.attempts ?? 0) >= MAX_TILE_ATTEMPTS) {
              return null
            }

            return (
              <img
                key={`${index}-${tileProgress?.attempts ?? 0}`}
                className={styles.tile}
                style={{ left: tile.left, top: tile.top }}
                src={tileUrl(frame?.zoom ?? zoomLevel, tile.x, tile.y)}
                alt=""
                loading="lazy"
                decoding="async"
                onLoad={() => recordTile(index, { loaded: true })}
                onError={() =>
                  recordTile(index, {
                    attempts: (tileProgress?.attempts ?? 0) + 1,
                  })
                }
              />
            )
          })}
          <span className={styles.marker} aria-hidden="true" />
          {loadedCount === 0 && <span className={styles.loading}>Cargando el mapa…</span>}
        </div>
      )}
      <Attribution />
    </div>
  )
}

function Attribution() {
  return (
    <p className={styles.attribution}>
      <a
        className={styles.link}
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        aria-label="© OpenStreetMap contributors (abre en pestaña nueva)"
      >
        © OpenStreetMap contributors
      </a>
    </p>
  )
}
