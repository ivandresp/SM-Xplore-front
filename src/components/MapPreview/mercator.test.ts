import { describe, expect, it } from 'vitest'
import {
  MAX_LATITUDE,
  TILE_SIZE,
  clampZoom,
  coordinatePoint,
  mercatorFrame,
  projectPoint,
  tileUrl,
  unprojectPoint,
} from './mercator'

describe('projectPoint (Web Mercator, z/x/y)', () => {
  it('pone el origen de coordenadas en el centro del único tile de z=0', () => {
    expect(projectPoint(0, 0, 0)).toEqual({ x: 0.5, y: 0.5 })
  })

  it('pone el origen en el centro exacto del cuadrado de 2x2 tiles en z=1', () => {
    expect(projectPoint(0, 0, 1)).toEqual({ x: 1, y: 1 })
  })

  it('da 2048,2048 para 0,0 en z=12 (mitad de 4096 tiles)', () => {
    expect(projectPoint(0, 0, 12)).toEqual({ x: 2048, y: 2048 })
  })

  it('sitúa Santa Marta (11.2404, -74.1990) en el tile 4815/7677 de z=14', () => {
    const point = projectPoint(11.2404, -74.199, 14)

    expect(Math.floor(point.x)).toBe(4815)
    expect(Math.floor(point.y)).toBe(7677)
    expect(point.x % 1).toBeCloseTo(0.1211, 3)
    expect(point.y % 1).toBeCloseTo(0.1235, 3)
  })

  it('crece con la longitud y decrece con la latitud', () => {
    const oeste = projectPoint(0, -74, 10)
    const este = projectPoint(0, -73, 10)
    const norte = projectPoint(11, -74, 10)
    const sur = projectPoint(10, -74, 10)

    expect(este.x).toBeGreaterThan(oeste.x)
    expect(norte.y).toBeLessThan(sur.y)
  })

  it('recorta la latitud al límite de Mercator para no salir del mundo', () => {
    const poloNorte = projectPoint(90, 0, 2)
    const poloSur = projectPoint(-90, 0, 2)

    expect(poloNorte.y).toBeCloseTo(0, 6)
    expect(poloSur.y).toBeCloseTo(4, 6)
    expect(Number.isFinite(projectPoint(MAX_LATITUDE, 0, 2).y)).toBe(true)
  })
})

describe('unprojectPoint', () => {
  it('recupera el punto original, incluido 0,0, en diferentes niveles', () => {
    for (const zoom of [0, 14, 19]) {
      for (const [latitude, longitude] of [[0, 0], [11.2404, -74.199], [-33.9, 151.2]]) {
        const projected = projectPoint(latitude, longitude, zoom)
        const recovered = unprojectPoint(projected.x, projected.y, zoom)
        expect(recovered.latitude).toBeCloseTo(latitude, 8)
        expect(recovered.longitude).toBeCloseTo(longitude, 8)
      }
    }
  })

  it('envuelve longitud y limita latitud al mundo de Mercator', () => {
    const north = unprojectPoint(2.5, -1, 1)
    expect(north.longitude).toBeCloseTo(-90, 8)
    expect(north.latitude).toBeCloseTo(MAX_LATITUDE, 8)
    const south = unprojectPoint(-0.5, 3, 1)
    expect(south.longitude).toBeCloseTo(90, 8)
    expect(south.latitude).toBeCloseTo(-MAX_LATITUDE, 8)
  })
})

describe('clampZoom', () => {
  it('recorta al rango 0-19 y trunca decimales', () => {
    expect(clampZoom(14.9)).toBe(14)
    expect(clampZoom(-3)).toBe(0)
    expect(clampZoom(31)).toBe(19)
  })

  it('cae al valor por defecto cuando el zoom no es un número', () => {
    expect(clampZoom(Number.NaN, 14)).toBe(14)
    expect(clampZoom(Number.POSITIVE_INFINITY, 14)).toBe(14)
  })
})

describe('mercatorFrame', () => {
  it('centra una ventana rectangular y cubre sus cuatro esquinas sin estirar tiles', () => {
    const frame = mercatorFrame(11.2404, -74.199, 14, 800, 450)
    expect(frame.markerLeft).toBe(400)
    expect(frame.markerTop).toBe(225)
    for (const [x, y] of [[0, 0], [799, 0], [0, 449], [799, 449]]) {
      expect(frame.tiles.some((tile) => tile.left <= x && tile.left + TILE_SIZE > x
        && tile.top <= y && tile.top + TILE_SIZE > y)).toBe(true)
    }
    const point = projectPoint(11.2404, -74.199, 14)
    const centerTile = frame.tiles.find((tile) => tile.x === Math.floor(point.x) && tile.y === Math.floor(point.y))!
    expect(centerTile.left + (point.x % 1) * TILE_SIZE).toBeCloseTo(400, 6)
    expect(centerTile.top + (point.y % 1) * TILE_SIZE).toBeCloseTo(225, 6)
  })

  it('reserva una ventana configurable centrada en las coordenadas', () => {
    const frame = mercatorFrame(0, 0, 14, 320)
    expect(frame.markerLeft).toBe(160)
    expect(frame.markerTop).toBe(160)
    expect(frame.tiles.some((tile) => tile.left <= 0 && tile.left + TILE_SIZE > 0)).toBe(true)
  })

  it('nunca devuelve un zoom NaN: sin zoom válido no hay tiles ni enlace roto', () => {
    const frame = mercatorFrame(0, 0, Number.NaN)

    expect(Number.isFinite(frame.zoom)).toBe(true)
    expect(frame.zoom).toBe(0)
    expect(frame.tiles.length).toBeGreaterThanOrEqual(1)
  })

  it('en el borde del mundo repite el tile de x pero lo deja identificable por índice', () => {
    const frame = mercatorFrame(0, 180, 0)

    expect(frame.tiles.length).toBe(2)
    expect(frame.tiles[0].x).toBe(frame.tiles[1].x)
    expect(frame.tiles[0].y).toBe(frame.tiles[1].y)
  })

  it('devuelve 1-4 tiles que cubren la ventana y centran el marcador', () => {
    const frame = mercatorFrame(11.2404, -74.199, 14)

    expect(frame.tiles.length).toBeGreaterThanOrEqual(1)
    expect(frame.tiles.length).toBeLessThanOrEqual(4)
    expect(frame.zoom).toBe(14)
    expect(frame.markerLeft).toBe(TILE_SIZE / 2)
    expect(frame.markerTop).toBe(TILE_SIZE / 2)

    for (const tile of frame.tiles) {
      expect(tile.left).toBeGreaterThan(-TILE_SIZE)
      expect(tile.left).toBeLessThan(TILE_SIZE)
      expect(tile.top).toBeGreaterThan(-TILE_SIZE)
      expect(tile.top).toBeLessThan(TILE_SIZE)
    }
  })

  it('envuelve la x en el mundo y nunca produce un tile fuera de rango', () => {
    const frame = mercatorFrame(0, -179.9, 2)

    expect(frame.tiles.length).toBeGreaterThanOrEqual(1)
    for (const tile of frame.tiles) {
      expect(tile.x).toBeGreaterThanOrEqual(0)
      expect(tile.x).toBeLessThan(4)
    }
  })

  it('no inventa tiles con y negativa en el borde superior', () => {
    const frame = mercatorFrame(MAX_LATITUDE, 0, 1)

    expect(frame.tiles.length).toBeGreaterThanOrEqual(1)
    for (const tile of frame.tiles) {
      expect(tile.y).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('coordinatePoint', () => {
  it('acepta coordenadas dentro del rango, incluido el 0', () => {
    expect(coordinatePoint(11.2404, -74.199)).toEqual({
      latitude: 11.2404,
      longitude: -74.199,
    })
    expect(coordinatePoint(0, 0)).toEqual({ latitude: 0, longitude: 0 })
  })

  it('rechaza null, undefined, NaN y valores fuera de rango', () => {
    expect(coordinatePoint(null, -74.199)).toBeNull()
    expect(coordinatePoint(11.2404, undefined)).toBeNull()
    expect(coordinatePoint(Number.NaN, -74.199)).toBeNull()
    expect(coordinatePoint(91, -74.199)).toBeNull()
    expect(coordinatePoint(11.2404, -181)).toBeNull()
  })
})

describe('tileUrl', () => {
  it('apunta al tile de OSM con el esquema z/x/y', () => {
    expect(tileUrl(14, 4815, 7677)).toBe(
      'https://tile.openstreetmap.org/14/4815/7677.png',
    )
  })
})
