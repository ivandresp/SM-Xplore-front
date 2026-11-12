/** Lado de un tile de OSM en píxeles. */
export const TILE_SIZE = 256

/** Latitud máxima que cubre la proyección Web Mercator (el resto se recorta). */
export const MAX_LATITUDE = 85.0511287798066

/** Niveles de zoom que sirve OSM (z=19 ya es una manzana). */
export const MAX_ZOOM = 19

export interface TileRef {
  x: number
  y: number
  /** Desplazamiento en píxeles respecto a la ventana. */
  left: number
  top: number
}

export interface MapFrame {
  zoom: number
  tiles: TileRef[]
  markerLeft: number
  markerTop: number
}

/**
 * Coordenada de tile fraccionaria (Web Mercator "slippy map"): la parte entera es
 * el tile z/x/y y la decimal, el píxel dentro de él.
 */
export function projectPoint(
  latitude: number,
  longitude: number,
  zoom: number,
): { x: number; y: number } {
  const world = 2 ** Math.max(0, Math.min(MAX_ZOOM, Math.trunc(zoom)))
  const lat = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude))
  const rad = (lat * Math.PI) / 180

  return {
    x: ((longitude + 180) / 360) * world,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * world,
  }
}

/**
 * Devuelve el punto utilizable, o `null` si la ficha no trae coordenadas
 * válidas. Un `0` es una coordenada legítima; `null` no.
 */
export function coordinatePoint(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): { latitude: number; longitude: number } | null {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null
  }

  return { latitude, longitude }
}

/** Ventana de TILE_SIZE×TILE_SIZE centrada en el punto, en tiles que la cubren. */
export function mercatorFrame(
  latitude: number,
  longitude: number,
  zoom: number,
): MapFrame {
  const frameZoom = Math.max(0, Math.min(MAX_ZOOM, Math.trunc(zoom)))
  const world = 2 ** frameZoom
  const point = projectPoint(latitude, longitude, frameZoom)
  const windowLeft = point.x * TILE_SIZE - TILE_SIZE / 2
  const windowTop = point.y * TILE_SIZE - TILE_SIZE / 2

  const firstColumn = Math.floor(windowLeft / TILE_SIZE)
  const lastColumn = Math.ceil((windowLeft + TILE_SIZE) / TILE_SIZE) - 1
  const firstRow = Math.max(0, Math.floor(windowTop / TILE_SIZE))
  const lastRow = Math.min(world - 1, Math.ceil((windowTop + TILE_SIZE) / TILE_SIZE) - 1)

  const tiles: TileRef[] = []
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      tiles.push({
        x: ((column % world) + world) % world,
        y: row,
        left: column * TILE_SIZE - windowLeft,
        top: row * TILE_SIZE - windowTop,
      })
    }
  }

  return {
    zoom: frameZoom,
    tiles,
    markerLeft: TILE_SIZE / 2,
    markerTop: TILE_SIZE / 2,
  }
}

export function tileUrl(zoom: number, x: number, y: number): string {
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
}
