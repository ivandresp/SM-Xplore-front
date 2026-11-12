import { describe, expect, it } from 'vitest'
import {
  MAX_LATITUDE,
  TILE_SIZE,
  coordinatePoint,
  mercatorFrame,
  projectPoint,
  tileUrl,
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

describe('mercatorFrame', () => {
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
