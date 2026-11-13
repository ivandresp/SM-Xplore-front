import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 375, height: 667 } })

function loginError(code: string, extra: Record<string, unknown> = {}) {
  return {
    type: 'about:blank',
    title: 'No autorizado',
    status: 401,
    detail: 'x',
    instance: '/api/v1/auth/login',
    code,
    ...extra,
  }
}

test.describe('el boton de iniciar sesion no se mueve a 375', () => {
  const cases = [
    ['credenciales', loginError('INVALID_CREDENTIALS')],
    ['demasiados intentos', loginError('TOO_MANY_ATTEMPTS', { retryAfterSeconds: 60 })],
  ] as const

  for (const [name, body] of cases) {
    test(`con ${name}`, async ({ page }) => {
      await page.route('**/api/v1/auth/login', (route) =>
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify(body),
        }),
      )

      await page.goto('/login')
      const button = page.getByRole('button', { name: 'Iniciar sesión' })
      await page.getByLabel('Correo electrónico').fill('a@b.com')
      await page.getByLabel('Contraseña').fill('secreta')

      const before = await button.boundingBox()
      expect(before).not.toBeNull()

      await button.click()
      await page.getByRole('alert').waitFor()

      const after = await button.boundingBox()
      expect(after).not.toBeNull()
      expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(1)
    })
  }
})
