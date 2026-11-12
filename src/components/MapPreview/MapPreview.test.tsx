import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MapPreview } from './MapPreview'

const TILE_SRC = /^https:\/\/tile\.openstreetmap\.org\/14\/\d+\/\d+\.png$/
const CREDIT = /© OpenStreetMap contributors/

function tileImages(): HTMLImageElement[] {
  return Array.from(
    document.querySelectorAll<HTMLImageElement>('img[src*="tile.openstreetmap.org"]'),
  )
}

function loadAll() {
  for (const image of tileImages()) fireEvent.load(image)
}

/** Cada tile se pide dos veces: el segundo error ya no se reintenta. */
function failRound() {
  for (const image of tileImages()) fireEvent.error(image)
}

function renderMap() {
  return render(
    <MapPreview label="Playa Blanca" latitude={11.2404} longitude={-74.199} />,
  )
}

describe('MapPreview', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('pinta entre 1 y 4 tiles de OSM para las coordenadas dadas', () => {
    renderMap()

    const images = tileImages()

    expect(images.length).toBeGreaterThanOrEqual(1)
    expect(images.length).toBeLessThanOrEqual(4)
    for (const image of images) {
      expect(TILE_SRC.test(image.getAttribute('src') ?? '')).toBe(true)
      expect(image.getAttribute('alt')).toBe('')
      expect(image.getAttribute('loading')).toBe('lazy')
    }
  })

  it('acredita a OpenStreetMap y avisa que el enlace abre en otra pestaña', () => {
    renderMap()

    const credit = screen.getByRole('link', { name: CREDIT })

    expect(credit.getAttribute('href')).toBe(
      'https://www.openstreetmap.org/copyright',
    )
    expect(credit.getAttribute('target')).toBe('_blank')
    expect(credit.getAttribute('rel')).toBe('noreferrer')
    expect(credit.getAttribute('aria-label')).toContain('abre en pestaña nueva')
  })

  it('describe el mapa para lectores de pantalla sin tapar el enlace de crédito', () => {
    renderMap()

    const map = screen.getByRole('img')

    expect(map.getAttribute('aria-label')).toBe(
      'Mapa de Playa Blanca en 11.24040, -74.19900',
    )
    expect(map.querySelector('a')).toBeNull()
  })

  it('marca el mapa como ocupado mientras llegan los tiles', () => {
    renderMap()

    expect(screen.getByRole('img').getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Cargando el mapa…')).toBeTruthy()

    loadAll()

    expect(screen.getByRole('img').getAttribute('aria-busy')).toBe('false')
    expect(screen.queryByText('Cargando el mapa…')).toBeNull()
  })

  it('dice que falta la ubicación en vez de pintar una imagen rota', () => {
    render(<MapPreview label="Zona Centro" latitude={null} longitude={null} />)

    expect(screen.queryByRole('img')).toBeNull()
    expect(tileImages().length).toBe(0)
    expect(
      screen.getByText('Esta ficha todavía no tiene coordenadas publicadas.'),
    ).toBeTruthy()
  })

  it('mantiene los tiles que cargan cuando uno falla', () => {
    renderMap()
    const total = tileImages().length

    fireEvent.error(tileImages()[0])

    expect(tileImages().length).toBe(total)
    expect(screen.queryByText('No pudimos cargar el mapa.')).toBeNull()
  })

  it('reintenta un tile una sola vez y luego lo deja fuera sin tumbar el mapa', () => {
    renderMap()
    const total = tileImages().length

    fireEvent.error(tileImages()[0])
    fireEvent.error(tileImages()[0])

    expect(tileImages().length).toBe(total - 1)
    expect(screen.queryByText('No pudimos cargar el mapa.')).toBeNull()
  })

  it('cae a las coordenadas y al enlace si fallan todos los tiles', () => {
    renderMap()

    failRound()
    failRound()

    expect(tileImages().length).toBe(0)
    expect(screen.getByText('11.24040, -74.19900')).toBeTruthy()
    const link = screen.getByRole('link', { name: /Abrir en OpenStreetMap/ })
    expect(link.getAttribute('href')).toBe(
      'https://www.openstreetmap.org/?mlat=11.24040&mlon=-74.19900#map=14/11.24040/-74.19900',
    )
    expect(link.getAttribute('rel')).toBe('noreferrer')
    expect(screen.getByRole('link', { name: CREDIT })).toBeTruthy()
  })

  it('da el mapa por perdido si los tiles no llegan en 8 s', () => {
    vi.useFakeTimers()
    renderMap()

    act(() => {
      vi.advanceTimersByTime(8000)
    })

    expect(tileImages().length).toBe(0)
    expect(screen.getByText('No pudimos cargar el mapa.')).toBeTruthy()
    expect(screen.queryByText('Cargando el mapa…')).toBeNull()
  })

  it('no deja que un zoom inválido rompa la URL del tile', () => {
    render(<MapPreview label="Playa Blanca" latitude={11.2404} longitude={-74.199} zoom={Number.NaN} />)

    for (const image of tileImages()) {
      expect(image.getAttribute('src')).toContain('/14/')
      expect(image.getAttribute('src')).not.toContain('NaN')
    }
  })
})
