import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/context/AuthProvider'
import { setLanguage } from '@/i18n/language'
import { PublicLayout } from '@/layouts/PublicLayout'
import LoginPage from '@/pages/auth/LoginPage'

afterEach(() => { act(() => setLanguage('es')); localStorage.clear() })

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('LanguageToggle', () => {
  it('switches the shared navigation, form and footer while preserving the draft', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText('Correo electrónico'), 'visitante@example.com')
    await user.click(screen.getByRole('button', { name: 'Cambiar idioma a inglés' }))
    expect(document.documentElement.lang).toBe('en')
    expect(screen.getByLabelText('Email address').getAttribute('value')).toBe('visitante@example.com')
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Create account' })[0].getAttribute('href')).toBe('/registro')
    expect(screen.getByText('Follow us on social media')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Switch language to Spanish' }))
    expect(screen.getByLabelText('Correo electrónico').getAttribute('value')).toBe('visitante@example.com')
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy()
  })
})
