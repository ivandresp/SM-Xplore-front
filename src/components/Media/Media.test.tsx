import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Media } from './Media'

describe('Media', () => {
  it('sin foto pinta el icono y «Sin foto», sin imagen', () => {
    const { container } = render(<Media />)

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Sin foto')).toBeTruthy()
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('con foto pinta la imagen y el chip de categoría', () => {
    const { container } = render(
      <Media photo="https://example.com/a.jpg" chip="Aventura" />,
    )

    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('https://example.com/a.jpg')
    expect(img.getAttribute('loading')).toBe('lazy')
    expect(screen.getByText('Aventura')).toBeTruthy()
    expect(screen.queryByText('Sin foto')).toBeNull()
  })

  it('si la URL falla, cae al fallback de icono', () => {
    const { container } = render(<Media photo="https://example.com/rota.jpg" />)

    fireEvent.error(container.querySelector('img') as HTMLImageElement)

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Sin foto')).toBeTruthy()
  })
})
