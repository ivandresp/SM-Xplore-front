import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useFilterParam, useSearchParamTerm } from './useFilterParam'

function Probe() {
  const [term, setTerm] = useSearchParamTerm()
  const [, setZone] = useFilterParam('zona')
  const location = useLocation()

  return (
    <div>
      <input
        aria-label="buscar"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
      />
      <button type="button" onClick={() => setZone('z-1')}>
        Elegir zona
      </button>
      <p data-testid="url">{location.search}</p>
    </div>
  )
}

function renderProbe(entry = '/catalogo') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
    </MemoryRouter>,
  )
}

describe('filtros en la URL', () => {
  it('lee el valor inicial y lo escribe tras el debounce', async () => {
    const user = userEvent.setup()
    renderProbe('/catalogo?search=bahia&pagina=2')

    const input = screen.getByLabelText('buscar')
    expect((input as HTMLInputElement).value).toBe('bahia')

    await user.clear(input)
    await user.type(input, 'taganga')

    await waitFor(
      () => {
        expect(screen.getByTestId('url').textContent).toContain(
          'search=taganga',
        )
      },
      { timeout: 2000 },
    )
    // Cambiar un filtro vuelve a la primera página.
    expect(screen.getByTestId('url').textContent).not.toContain('pagina=2')
  })

  it('conserva el resto de filtros al cambiar uno', async () => {
    const user = userEvent.setup()
    renderProbe('/catalogo?search=bahia&pagina=3')

    await user.click(screen.getByRole('button', { name: 'Elegir zona' }))

    const url = screen.getByTestId('url').textContent ?? ''
    expect(url).toContain('zona=z-1')
    expect(url).toContain('search=bahia')
    expect(url).not.toContain('pagina')
  })
})
