import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MapPreview } from './MapPreview'

const TILE_SRC = /^https:\/\/tile\.openstreetmap\.org\/14\/\d+\/\d+\.png$/

function tileImages(): HTMLImageElement[] {
  return Array.from(
    document.querySelectorAll<HTMLImageElement>('img[src*="tile.openstreetmap.org"]'),
  )
}

describe('MapPreview', () => {
  it('pinta entre 1 y 4 tiles de OSM para las coordenadas dadas', () => {
    render(<MapPreview label="Playa Blanca" latitude={11.2404} longitude={-74.199} />)

    const images = tileImages()

    expect(images.length).toBeGreaterThanOrEqual(1)
    expect(images.length).toBeLessThanOrEqual(4)
    for (const image of images) {
      expect(TILE_SRC.test(image.getAttribute('src') ?? '')).toBe(true)
      expect(image.getAttribute('alt')).toBe('')
      expect(image.getAttribute('loading')).toBe('lazy')
    }
  })

  it('acredita a OpenStreetMap con un enlace a la licencia', () => {
    render(<MapPreview label="Playa Blanca" latitude={11.2404} longitude={-74.199} />)

    const credit = screen.getByRole('link', {
      name: '© OpenStreetMap contributors',
    })

    expect(credit.getAttribute('href')).toBe(
      'https://www.openstreetmap.org/copyright',
    )
    expect(credit.getAttribute('target')).toBe('_blank')
  })

  it('describe el mapa para lectores de pantalla sin tapar el enlace de crédito', () => {
    render(<MapPreview label="Playa Blanca" latitude={11.2404} longitude={-74.199} />)

    const map = screen.getByRole('img')

    expect(map.getAttribute('aria-label')).toBe(
      'Mapa de Playa Blanca en 11.24040, -74.19900',
    )
    expect(map.querySelector('a')).toBeNull()
  })

  it('dice que falta la ubicación en vez de pintar una imagen rota', () => {
    render(<MapPreview label="Zona Centro" latitude={null} longitude={null} />)

    expect(screen.queryByRole('img')).toBeNull()
    expect(tileImages().length).toBe(0)
    expect(
      screen.getByText('Esta ficha todavía no tiene coordenadas publicadas.'),
    ).toBeTruthy()
  })

  it('cae a las coordenadas y al enlace si el tile no carga', () => {
    render(<MapPreview label="Playa Blanca" latitude={11.2404} longitude={-74.199} />)

    const [firstTile] = tileImages()
    fireEvent.error(firstTile)

    expect(tileImages().length).toBe(0)
    expect(screen.getByText('11.24040, -74.19900')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Abrir en OpenStreetMap' }).getAttribute('href'),
    ).toBe('https://www.openstreetmap.org/?mlat=11.24040&mlon=-74.19900#map=14/11.24040/-74.19900')
    expect(
      screen.getByRole('link', { name: '© OpenStreetMap contributors' }),
    ).toBeTruthy()
  })
})
