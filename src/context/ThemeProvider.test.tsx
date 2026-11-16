import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ThemeProvider, THEME_STORAGE_KEY } from './ThemeProvider'

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

afterEach(() => {
  window.localStorage.removeItem(THEME_STORAGE_KEY)
  document.documentElement.removeAttribute('data-theme')
})

describe('ThemeProvider', () => {
  it('arranca en sistema: sin atributo y sin almacenamiento', () => {
    renderToggle()

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(screen.getByRole('button', { name: /Tema sistema/ })).toBeTruthy()
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('cicla sistema, claro, oscuro, sistema y persiste', async () => {
    const user = userEvent.setup()
    renderToggle()

    const toggle = screen.getByRole('button', { name: /Tema/ })

    await user.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

    await user.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    await user.click(toggle)
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('restaura el tema guardado al montar', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    renderToggle()

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: /Tema oscuro/ })).toBeTruthy()
  })

  it('renderiza sin matchMedia (jsdom) y sin provider', () => {
    render(<ThemeToggle />)

    expect(screen.getByRole('button', { name: /Tema sistema/ })).toBeTruthy()
  })
})
