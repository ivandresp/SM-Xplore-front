import { test, expect } from '@playwright/test'

test('el boton de iniciar sesion no se mueve al aparecer el error', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        type: 'about:blank',
        title: 'No autorizado',
        status: 401,
        detail: 'Credenciales invalidas',
        instance: '/api/v1/auth/login',
        code: 'INVALID_CREDENTIALS',
      }),
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
