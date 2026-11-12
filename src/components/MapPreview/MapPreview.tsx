import { useState } from 'react'
import { coordinatePoint, mercatorFrame, tileUrl } from './mercator'
import styles from './MapPreview.module.css'

/** Zoom por defecto: una ficha se lee a escala de barrio (~2 km de ancho). */
const DEFAULT_ZOOM = 14

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
  /** Coordenadas cuyo tile falló: cambiar de ficha reintenta el mapa. */
  const [failedAt, setFailedAt] = useState<string | null>(null)
  const point = coordinatePoint(latitude, longitude)

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
  const failed = failedAt === coordinates
  const frame = mercatorFrame(point.latitude, point.longitude, zoom)
  const externalUrl =
    `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}` +
    `#map=${frame.zoom}/${lat}/${lng}`

  return (
    <div className={styles.wrapper}>
      {failed ? (
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
          >
            Abrir en OpenStreetMap
          </a>
        </div>
      ) : (
        <div
          className={styles.viewport}
          role="img"
          aria-label={`Mapa de ${label} en ${coordinates}`}
        >
          {frame.tiles.map((tile) => (
            <img
              key={`${tile.x}-${tile.y}`}
              className={styles.tile}
              style={{ left: tile.left, top: tile.top }}
              src={tileUrl(frame.zoom, tile.x, tile.y)}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setFailedAt(coordinates)}
            />
          ))}
          <span className={styles.marker} aria-hidden="true" />
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
      >
        © OpenStreetMap contributors
      </a>
    </p>
  )
}
