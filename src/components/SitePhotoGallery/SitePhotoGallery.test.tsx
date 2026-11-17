import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SitePhotoGallery } from './SitePhotoGallery'

const photos = ['https://example.com/one.jpg', 'https://example.com/two.jpg', 'https://example.com/three.jpg']

describe('SitePhotoGallery', () => {
  it('mantiene el estado sin fotos sin controles de galería', () => {
    render(<SitePhotoGallery name="Playa Blanca" photos={[]} />)
    expect(screen.getByText('Sin fotos: la gestora no cargó imágenes')).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('una foto se muestra como portada sin miniaturas', () => {
    render(<SitePhotoGallery name="Playa Blanca" photos={photos.slice(0, 1)} />)
    expect(screen.getByRole('img', { name: 'Playa Blanca' }).getAttribute('src')).toBe(photos[0])
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('muestra todas las miniaturas sin desplegar y permite cambiar la portada', () => {
    render(<SitePhotoGallery name="Playa Blanca" photos={photos} />)
    expect(screen.getByText('Foto 1 de 3')).toBeTruthy()
    expect(document.querySelector('details')).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Ver foto 2 de 3' }))
    expect(screen.getByRole('img', { name: 'Playa Blanca' }).getAttribute('src')).toBe(photos[1])
    expect(screen.getByText('Foto 2 de 3')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ver foto 2 de 3' }).getAttribute('aria-pressed')).toBe('true')
  })
})
