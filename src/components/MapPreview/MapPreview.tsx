import { useEffect, useState } from 'react'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { clampZoom, coordinatePoint, MAX_ZOOM, mercatorFrame, tileUrl } from './mercator'
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

export type MapLoadState = 'loading' | 'ready' | 'error'

export interface MapPreviewProps {
  /** Latitud del punto; `null` cuando la ficha no la tiene. */
  latitude: number | null | undefined
  /** Longitud del punto; `null` cuando la ficha no la tiene. */
  longitude: number | null | undefined
  /** Nombre del punto, para el texto alternativo. */
  label: string
  zoom?: number
  /** Permite acercar y alejar; las fichas existentes siguen estáticas por defecto. */
  zoomControls?: boolean
  /** Tamaño exterior del viewport, incluyendo borde; hasta 512 px. */
  size?: number
  /** Dimensiones exteriores independientes; hasta 1024 px cada una. */
  width?: number
  height?: number
  showMarker?: boolean
  /** Solo desplaza los tiles visibles, sin consultas durante un arrastre. */
  panOffset?: { x: number; y: number }
  onLoadStateChange?: (state: MapLoadState) => void
}

function viewportSize(size = 256): number {
  return Number.isFinite(size) ? Math.max(1, Math.min(512, Math.floor(size))) : 256
}

function viewportDimension(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value)
    ? Math.max(1, Math.min(1024, Math.floor(value)))
    : fallback
}

/**
 * Mapa sin edición de ubicación ni librería: pinta los tiles de OpenStreetMap
 * que cubren las coordenadas y un marcador en el centro.
 *
 * `shortcut:` un request por tile a tile.openstreetmap.org, sin caché propia;
 * en producción toca proveedor con cuota o self-host.
 */
export function MapPreview(props: MapPreviewProps) {
  const fallbackSize = viewportSize(props.size)
  const width = viewportDimension(props.width, fallbackSize)
  const height = viewportDimension(props.height, fallbackSize)
  const origin = `${props.latitude},${props.longitude}/${clampZoom(props.zoom ?? DEFAULT_ZOOM, DEFAULT_ZOOM)}/${props.zoomControls ?? false}/${width}x${height}`
  return <MapContent key={origin} {...props} />
}

function MapContent({
  latitude,
  longitude,
  label,
  zoom = DEFAULT_ZOOM,
  zoomControls = false,
  size,
  width,
  height,
  showMarker = true,
  panOffset,
  onLoadStateChange,
}: MapPreviewProps) {
  useLanguage()
  const point = coordinatePoint(latitude, longitude)
  const fallbackSize = viewportSize(size)
  const viewWidth = viewportDimension(width, fallbackSize)
  const viewHeight = viewportDimension(height, fallbackSize)
  const viewportStyle = { width: viewWidth, height: viewHeight }
  const [zoomLevel, setZoomLevel] = useState(() => clampZoom(zoom, DEFAULT_ZOOM))
  const frame =
    point === null
      ? null
      : mercatorFrame(point.latitude, point.longitude, zoomLevel, Math.max(1, viewWidth - 2), Math.max(1, viewHeight - 2))

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
      : `${point?.latitude},${point?.longitude}/${frame.zoom}/${tiles.map((tile) => `${tile.x},${tile.y}`).join(';')}`
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

  const loadState: MapLoadState = point === null || showFallback || deadCount > 0 || (timedOut && !allLoaded)
    ? 'error'
    : allLoaded ? 'ready' : 'loading'

  useEffect(() => {
    onLoadStateChange?.(loadState)
  }, [loadState, onLoadStateChange])

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

  function changeZoom(delta: number) {
    setZoomLevel((previous) => clampZoom(previous + delta))
    setTimedOutKey(null)
  }

  if (point === null) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.viewport} style={viewportStyle}>
          <p className={styles.empty}>
            {t("Esta ficha todavía no tiene coordenadas publicadas.")}</p>
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
      <div className={styles.mapFrame} style={{ width: viewWidth }}>
        {showFallback ? (
          <div className={styles.viewport} style={viewportStyle}>
            <p className={styles.empty}>
              {t("No pudimos cargar el mapa.")}<br />
              <span className={styles.coords}>{coordinates}</span>
            </p>
            <a
              className={styles.link}
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t("Abrir en OpenStreetMap (abre en pestaña nueva)")}
            >
              {t("Abrir en OpenStreetMap")}</a>
          </div>
        ) : (
          <div
            className={styles.viewport}
            style={viewportStyle}
            role="img"
            aria-label={t("Mapa de {0} en {1}", [label, coordinates])}
            aria-busy={isLoading}
          >
            {tiles.map((tile, index) => {
              const tileProgress = current[index]

              if ((tileProgress?.attempts ?? 0) >= MAX_TILE_ATTEMPTS) {
                return null
              }

              return (
                <img
                  key={`${frameKey}-${index}-${tileProgress?.attempts ?? 0}`}
                  className={styles.tile}
                  style={{ left: tile.left + (panOffset?.x ?? 0), top: tile.top + (panOffset?.y ?? 0) }}
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
            {showMarker && <span className={styles.marker} aria-hidden="true" />}
            {loadedCount === 0 && <span className={styles.loading}>{t("Cargando el mapa…")}</span>}
          </div>
        )}
        {zoomControls && !showFallback && (
          <div className={styles.controls} role="group" aria-label={t('Zoom del mapa')}>
            <button
              type="button"
              className={styles.zoomButton}
              aria-label={t('Acercar mapa')}
              disabled={zoomLevel >= MAX_ZOOM}
              onClick={() => changeZoom(1)}
            >
              <span aria-hidden="true">+</span>
            </button>
            <button
              type="button"
              className={styles.zoomButton}
              aria-label={t('Alejar mapa')}
              disabled={zoomLevel <= 0}
              onClick={() => changeZoom(-1)}
            >
              <span aria-hidden="true">−</span>
            </button>
          </div>
        )}
      </div>
      <Attribution />
    </div>
  )
}

function Attribution() {
  useLanguage()
  return (
    <p className={styles.attribution}>
      <a
        className={styles.link}
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        aria-label={t("© OpenStreetMap contributors (abre en pestaña nueva)")}
      >
        © OpenStreetMap contributors
      </a>
    </p>
  )
}
